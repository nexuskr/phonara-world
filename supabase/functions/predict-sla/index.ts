/**
 * predict-sla — Lovable AI 기반 큐 폭증 예측.
 * 관리자만 호출. 현재 큐 통계 + 최근 1시간 추세를 LLM에 넘겨 risk(low/med/high) + reasoning 반환.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization") ?? "";
    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );

    const { data: u } = await supa.auth.getUser();
    if (!u?.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: isAdmin } = await supa.rpc("has_role", {
      _user_id: u.user.id,
      _role: "admin",
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "admin_only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Pull current SLA stats + recent deposits/withdrawals trend
    const [{ data: sla }, dep1h, wd1h] = await Promise.all([
      supa.rpc("get_queue_sla_stats"),
      supa
        .from("deposit_requests")
        .select("id", { count: "exact", head: true })
        .gte("created_at", new Date(Date.now() - 3600_000).toISOString()),
      supa
        .from("withdrawal_requests")
        .select("id", { count: "exact", head: true })
        .gte("created_at", new Date(Date.now() - 3600_000).toISOString()),
    ]);

    const context = {
      sla,
      last_hour: { deposits: dep1h.count ?? 0, withdrawals: wd1h.count ?? 0 },
      kst_now: new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }),
    };

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content:
              "한국 핀테크 운영팀의 SLA 위험 예측가. 다음 1시간 동안 충전/출금/AML/이상감지 큐 중 어디서 폭증이 발생할 가능성이 높은지 분석하라. 응답은 반드시 JSON: {\"risk\": \"low|medium|high\", \"hot_queue\": \"deposits|withdrawals|anomalies|refunds|none\", \"recommendation\": \"한 문장 한국어\", \"reason\": \"한 줄 근거\"}.",
          },
          {
            role: "user",
            content: `현재 데이터:\n${JSON.stringify(context, null, 2)}`,
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      const t = await aiRes.text();
      return new Response(JSON.stringify({ error: "ai_failed", detail: t }), {
        status: aiRes.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiRes.json();
    const content = aiJson?.choices?.[0]?.message?.content ?? "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(content); } catch { parsed = { raw: content }; }

    return new Response(
      JSON.stringify({ ...parsed, context, generated_at: new Date().toISOString() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
