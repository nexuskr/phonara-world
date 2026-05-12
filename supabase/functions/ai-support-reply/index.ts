// AI 1차 고객지원 응답 + KB 컨텍스트 + 라우팅 + PII 마스킹.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { maskPii } from "../_shared/pii.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

const SYSTEM_PROMPT = `당신은 Phonara 글로벌 플랫폼의 1차 고객지원 AI입니다.
사용자 질문에 한국어(또는 사용자 언어)로 4-5문장 이내 친절·간결하게 답합니다.

규칙:
- 보안 PIN/비밀번호/OTP는 절대 묻거나 안내하지 않음.
- 환불·분쟁·계정 해킹·법적 문의는 needs_human=true 즉시 에스컬레이션.
- 단순 사용법/메뉴 위치/FAQ는 needs_human=false로 직접 답변.
- 제공된 [지식베이스] 컨텍스트가 있으면 우선 그것을 인용해 답하세요.
- 답변 끝에 "사람 상담사에게 전달해 드릴까요?" 같은 추가 질문은 하지 마세요.

플랫폼 핵심 정보:
- 출금 30분 SLA, 본인 인증(TOTP/OTP) 필수
- 잔액/티어/출금은 /wallet, 보안은 /security, 비밀번호 재설정은 /forgot-password

카테고리: account, wallet, security, mission, technical, policy, other`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    if (!LOVABLE_API_KEY) return json({ error: "LOVABLE_API_KEY not configured" }, 500);

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const user = userData?.user;
    if (!user) return json({ error: "unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const threadId: string | undefined = body?.thread_id;
    const rawMessage: string = String(body?.message ?? "").trim();
    if (!threadId || !rawMessage) return json({ error: "thread_id and message required" }, 400);
    if (rawMessage.length > 2000) return json({ error: "message too long" }, 400);

    // PII 마스킹: AI에게는 마스킹된 텍스트만 전달
    const { masked: maskedMessage, hits } = maskPii(rawMessage);
    const piiDetected = hits.length > 0;

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Verify thread ownership
    const { data: thread, error: threadErr } = await admin
      .from("support_threads").select("id, user_id, unread_admin").eq("id", threadId).maybeSingle();
    if (threadErr || !thread || thread.user_id !== user.id) return json({ error: "thread_not_found" }, 404);

    // PII 발견 시 사용자가 이미 INSERT한 마지막 메시지를 마스킹된 버전으로 교체
    if (piiDetected) {
      const { data: lastMsg } = await admin.from("support_messages")
        .select("id, message, sender").eq("thread_id", threadId).eq("user_id", user.id)
        .eq("sender", "user").order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (lastMsg && lastMsg.message === rawMessage) {
        await admin.from("support_messages").update({ message: maskedMessage, pii_masked: true }).eq("id", lastMsg.id);
      }
      await admin.from("support_threads").update({ last_pii_at: new Date().toISOString() }).eq("id", threadId);
    }

    // KB 검색 (마스킹된 쿼리 사용)
    let kbContext = "";
    try {
      const { data: kb } = await admin.rpc("search_support_kb", { _query: maskedMessage, _limit: 4 });
      if (kb && kb.length > 0) {
        kbContext = "\n\n[지식베이스 컨텍스트]\n" +
          kb.map((k: any, i: number) =>
            `(${i + 1}) [${k.category}] ${k.title}\n${String(k.content).slice(0, 800)}`
          ).join("\n\n");
      }
    } catch (e) {
      console.warn("KB search failed:", e);
    }

    // 최근 대화 컨텍스트
    const { data: history } = await admin
      .from("support_messages")
      .select("sender, message, created_at")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: false })
      .limit(12);
    const ordered = (history ?? []).slice().reverse();

    const messages = [
      { role: "system" as const, content: SYSTEM_PROMPT + kbContext },
      ...ordered.map((m) => ({
        role: (m.sender === "user" ? "user" : "assistant") as "user" | "assistant",
        content: String(m.message).slice(0, 2000),
      })),
      { role: "user" as const, content: maskedMessage },
    ];

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        tools: [{
          type: "function",
          function: {
            name: "support_reply",
            description: "1차 고객지원 응답 및 에스컬레이션 판단",
            parameters: {
              type: "object",
              properties: {
                reply: { type: "string", description: "사용자에게 보여줄 답변(4-5문장 이내)" },
                needs_human: { type: "boolean" },
                category: { type: "string", enum: ["account", "wallet", "security", "mission", "technical", "policy", "other"] },
              },
              required: ["reply", "needs_human", "category"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "support_reply" } },
      }),
    });

    if (!aiRes.ok) {
      const text = await aiRes.text();
      if (aiRes.status === 429) return json({ error: "rate_limited" }, 429);
      if (aiRes.status === 402) return json({ error: "credits_exhausted" }, 402);
      console.error("AI gateway error:", aiRes.status, text);
      return json({ error: "ai_gateway_error" }, 502);
    }

    const aiJson = await aiRes.json();
    const toolCall = aiJson.choices?.[0]?.message?.tool_calls?.[0];
    let parsed = {
      reply: "죄송합니다. 답변을 준비하지 못했어요. 사람 상담사에게 전달드리겠습니다.",
      needs_human: true,
      category: "other",
    };
    try {
      if (toolCall?.function?.arguments) {
        parsed = { ...parsed, ...JSON.parse(toolCall.function.arguments) };
      }
    } catch (e) { console.error("parse tool args:", e); }

    // AI 응답에도 마스킹 적용 (혹시 모를 누출 방어)
    const { masked: replyMasked } = maskPii(String(parsed.reply ?? ""));
    let finalReply = (replyMasked || "").slice(0, 2000) || "곧 상담사가 답변드리겠습니다.";

    // 라우팅 규칙 적용
    let priority = "normal";
    let assignedTo: string | null = null;
    if (parsed.needs_human) {
      const { data: rule } = await admin
        .from("support_routing_rules")
        .select("priority, assigned_to")
        .eq("category", parsed.category)
        .eq("active", true)
        .maybeSingle();
      priority = rule?.priority ?? "normal";
      assignedTo = rule?.assigned_to ?? null;
      finalReply += `\n\n— 담당 상담사에게 자동 전달되었습니다 (우선순위: ${priority}). 영업시간 내 답변드리겠습니다.`;
    }

    if (piiDetected) {
      const kinds = Array.from(new Set(hits.map(h => h.kind))).join(", ");
      finalReply = `🔒 안전을 위해 입력하신 ${kinds} 정보는 자동 마스킹되었습니다.\n\n` + finalReply;
    }

    // AI 메시지 저장
    const { error: insErr } = await admin.from("support_messages").insert({
      thread_id: threadId,
      user_id: user.id,
      sender: "ai",
      message: finalReply,
      pii_masked: piiDetected,
    });
    if (insErr) throw insErr;

    // 스레드 업데이트
    await admin.from("support_threads").update({
      last_message: finalReply.slice(0, 200),
      last_message_at: new Date().toISOString(),
      ai_last_category: parsed.category,
      ai_escalated: parsed.needs_human,
      priority: parsed.needs_human ? priority : (thread as any).priority ?? "normal",
      status: parsed.needs_human ? "reviewing" : "open",
      ...(assignedTo ? { assigned_to: assignedTo } : {}),
      ...(parsed.needs_human ? { unread_admin: ((thread as any).unread_admin ?? 0) + 1 } : {}),
    }).eq("id", threadId);

    return json({
      ok: true, reply: finalReply, needs_human: parsed.needs_human,
      category: parsed.category, priority, pii_detected: piiDetected,
    });
  } catch (e: any) {
    console.error("[ai-support-reply]", e);
    return json({ error: "internal_error" }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
