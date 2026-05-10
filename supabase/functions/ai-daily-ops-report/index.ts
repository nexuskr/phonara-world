// AI Daily Ops Report - summarises last 24h of platform health via Lovable AI Gateway.
// Triggered by pg_cron daily. Stores result in public.ai_daily_ops_reports.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let m = 0;
  for (let i = 0; i < a.length; i++) m |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return m === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    // AUTH GUARD: only callers with the service-role key (pg_cron via vault) may invoke.
    const auth = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
    if (!auth || !timingSafeEqual(auth, SERVICE_ROLE)) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const today = new Date().toISOString().slice(0, 10);

    // Skip if already generated today
    const { data: existing } = await admin
      .from("ai_daily_ops_reports").select("id").eq("report_date", today).maybeSingle();
    if (existing) {
      return new Response(JSON.stringify({ ok: true, skipped: true, report_date: today }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();

    const [errLogs, anomalies, dailyAgg] = await Promise.all([
      admin.from("error_logs").select("level, message, created_at").gte("created_at", since).order("created_at", { ascending: false }).limit(50),
      admin.from("anomaly_events").select("rule, severity, evidence, created_at, acknowledged").gte("created_at", since).order("created_at", { ascending: false }).limit(50),
      admin.from("daily_stats").select("earned, wins, losses, withdrawals_count").gte("stat_date", today),
    ]);

    const aggregated = {
      error_count: errLogs.data?.length ?? 0,
      error_samples: (errLogs.data ?? []).slice(0, 10).map((e: any) => ({ level: e.level, message: String(e.message).slice(0, 200) })),
      anomaly_count: anomalies.data?.length ?? 0,
      anomaly_breakdown: (anomalies.data ?? []).reduce((acc: Record<string, number>, a: any) => {
        const k = `${a.rule}:${a.severity}`; acc[k] = (acc[k] ?? 0) + 1; return acc;
      }, {}),
      unacknowledged_anomalies: (anomalies.data ?? []).filter((a: any) => !a.acknowledged).length,
      active_users_today: dailyAgg.data?.length ?? 0,
      total_earned_today: (dailyAgg.data ?? []).reduce((s: number, r: any) => s + (r.earned ?? 0), 0),
      total_wins_today: (dailyAgg.data ?? []).reduce((s: number, r: any) => s + (r.wins ?? 0), 0),
      total_losses_today: (dailyAgg.data ?? []).reduce((s: number, r: any) => s + (r.losses ?? 0), 0),
      total_withdrawals_today: (dailyAgg.data ?? []).reduce((s: number, r: any) => s + (r.withdrawals_count ?? 0), 0),
      report_date: today,
    };

    const systemPrompt = `당신은 글로벌 핀테크 플랫폼의 SRE/Ops 어시스턴트입니다.
지난 24시간 운영 데이터를 받아 한국어로 핵심 요약과 위험 신호, 권장 액션을 분석합니다.
반드시 JSON 형식으로만 응답하세요.`;

    const userPrompt = `다음은 지난 24시간 운영 데이터입니다:\n${JSON.stringify(aggregated, null, 2)}\n\n이 데이터를 분석해서 다음 JSON 스키마로 응답:\n{\n  "summary": "2-3문장의 한국어 운영 요약",\n  "highlights": ["긍정/주요 지표 3-5개"],\n  "risks": [{"title": "위험 제목", "severity": "low|medium|high", "detail": "설명"}],\n  "actions": ["즉시 실행 가능한 권장 액션 3-5개"]\n}`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      const text = await aiRes.text();
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "rate_limited", detail: text }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "credits_exhausted", detail: text }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error ${aiRes.status}: ${text}`);
    }

    const aiJson = await aiRes.json();
    const content = aiJson.choices?.[0]?.message?.content ?? "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(content); } catch { parsed = { summary: content }; }

    const { data: inserted, error: insErr } = await admin
      .from("ai_daily_ops_reports")
      .insert({
        report_date: today,
        model: "google/gemini-2.5-flash",
        summary: parsed.summary ?? "(요약 생성 실패)",
        highlights: parsed.highlights ?? [],
        risks: parsed.risks ?? [],
        actions: parsed.actions ?? [],
        raw_input: aggregated,
      })
      .select()
      .single();

    if (insErr) throw insErr;

    return new Response(JSON.stringify({ ok: true, report: inserted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[ai-daily-ops-report]", e);
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
