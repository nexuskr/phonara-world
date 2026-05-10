// AI 1차 고객지원 응답: 최근 대화 컨텍스트를 받아 Gemini Flash로 FAQ 답변을 생성하고
// support_messages에 sender='ai'로 저장. 사람 개입이 필요하면 thread를 escalate.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

const SYSTEM_PROMPT = `당신은 Phonara 글로벌 플랫폼의 1차 고객지원 AI입니다.
사용자 질문에 대해 한국어 또는 사용자가 사용한 언어로 친절하고 간결하게 답합니다.

규칙:
- 답변은 최대 4-5문장. 불릿이 도움될 때만 사용.
- 출금/계정동결/KYC/스텝업 인증 관련 질문은 정확한 절차만 안내하고 결제·환불은 약속하지 않음.
- 보안 PIN/비밀번호/OTP는 절대 묻거나 안내하지 않음.
- 정책 위반/환불/분쟁/입출금 지연/계정 해킹/법적 문의는 needs_human=true로 즉시 사람 상담사 에스컬레이션.
- 단순 사용법, 메뉴 위치, 일반 FAQ는 needs_human=false로 직접 답변.
- 답변 끝에 추가 도움이 필요하면 "사람 상담사에게 전달해 드릴까요?"라고 묻지 마세요. 시스템이 자동 처리합니다.

플랫폼 정보:
- 출금은 30분 SLA, 본인 인증(TOTP 또는 OTP) 필수
- 보유 잔액/티어/출금 내역은 사용자 대시보드의 "지갑/Wallet"에서 확인
- 비밀번호 재설정은 /forgot-password
- 2단계 보안은 /security 페이지에서 등록
- 미션, 시즌패스, 룰렛 등 게이미피케이션 기능 제공

카테고리는 다음 중 하나: account, wallet, security, mission, technical, policy, other`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Authenticate caller
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const user = userData?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const threadId: string | undefined = body?.thread_id;
    const userMessage: string = String(body?.message ?? "").trim();
    if (!threadId || !userMessage) {
      return new Response(JSON.stringify({ error: "thread_id and message required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (userMessage.length > 2000) {
      return new Response(JSON.stringify({ error: "message too long" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Verify thread ownership
    const { data: thread, error: threadErr } = await admin
      .from("support_threads").select("id, user_id").eq("id", threadId).maybeSingle();
    if (threadErr || !thread || thread.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "thread_not_found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load last 12 messages for context
    const { data: history } = await admin
      .from("support_messages")
      .select("sender, message, created_at")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: false })
      .limit(12);
    const ordered = (history ?? []).slice().reverse();

    const messages = [
      { role: "system" as const, content: SYSTEM_PROMPT },
      ...ordered.map((m) => ({
        role: (m.sender === "user" ? "user" : "assistant") as "user" | "assistant",
        content: String(m.message).slice(0, 2000),
      })),
      { role: "user" as const, content: userMessage },
    ];

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
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
                reply: { type: "string", description: "사용자에게 보여줄 답변(한국어 또는 사용자 언어, 4-5문장 이내)" },
                needs_human: { type: "boolean", description: "환불/분쟁/계정문제/정책위반 등 사람 상담사 필요 여부" },
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
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "rate_limited" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "credits_exhausted" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("AI gateway error:", aiRes.status, text);
      return new Response(JSON.stringify({ error: "ai_gateway_error" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiRes.json();
    const toolCall = aiJson.choices?.[0]?.message?.tool_calls?.[0];
    let parsed: { reply: string; needs_human: boolean; category: string } = {
      reply: "죄송합니다. 지금은 답변을 준비할 수 없어요. 사람 상담사에게 전달해 드리겠습니다.",
      needs_human: true,
      category: "other",
    };
    try {
      if (toolCall?.function?.arguments) {
        parsed = { ...parsed, ...JSON.parse(toolCall.function.arguments) };
      } else if (aiJson.choices?.[0]?.message?.content) {
        parsed.reply = aiJson.choices[0].message.content;
        parsed.needs_human = false;
      }
    } catch (e) {
      console.error("parse tool args error:", e);
    }

    const reply = String(parsed.reply ?? "").slice(0, 2000) ||
      "죄송합니다. 답변을 준비하지 못했어요. 곧 상담사가 답변드리겠습니다.";

    // Append "사람 상담사에게 전달했어요" notice when escalating
    const finalReply = parsed.needs_human
      ? `${reply}\n\n— 사람 상담사에게 자동으로 전달되었습니다. 영업시간 내 답변드리겠습니다.`
      : reply;

    // Insert AI message via service role
    const { error: insErr } = await admin.from("support_messages").insert({
      thread_id: threadId,
      user_id: user.id,
      sender: "ai",
      message: finalReply,
    });
    if (insErr) throw insErr;

    // Update thread metadata
    await admin.from("support_threads").update({
      last_message: finalReply.slice(0, 200),
      last_message_at: new Date().toISOString(),
      ai_last_category: parsed.category,
      ai_escalated: parsed.needs_human,
      ...(parsed.needs_human ? { unread_admin: ((thread as any).unread_admin ?? 0) + 1 } : {}),
    }).eq("id", threadId);

    return new Response(JSON.stringify({
      ok: true,
      reply: finalReply,
      needs_human: parsed.needs_human,
      category: parsed.category,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("[ai-support-reply]", e);
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
