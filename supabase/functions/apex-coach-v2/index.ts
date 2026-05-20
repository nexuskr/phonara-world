// P5-E — AI Coach v2 powered by Lovable AI Gateway (google/gemini-3-flash-preview).
// Reads recent 30 rolls for the caller, asks the model for {recommendation, risk_score, loss_protect_trigger}.
// If risk_score > 0.85 it idempotently arms loss protection via existing RPC.
// MONEY FLOW: 0 touch. Loss-protect RPC is the only state change and it's pre-existing.
// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const traceId = crypto.randomUUID();
  const t0 = Date.now();
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: auth } } });
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) return new Response(JSON.stringify({ ok: false, error: "unauthenticated", traceId }), {
      status: 401, headers: { ...cors, "Content-Type": "application/json" },
    });
    const uid = u.user.id;
    const svc = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

    const { data: rolls } = await svc.from("apex_game_rolls")
      .select("game_code,bet_phon,payout_phon,result,created_at")
      .eq("user_id", uid).order("created_at", { ascending: false }).limit(30);

    const sample = (rolls ?? []).map((r) => ({
      g: r.game_code, b: Number(r.bet_phon || 0), p: Number(r.payout_phon || 0),
    }));
    const netPhon = sample.reduce((acc, r) => acc + (r.p - r.b), 0);
    const totalBet = sample.reduce((acc, r) => acc + r.b, 0);

    const sys = "당신은 ApexForge의 차가운 베팅 코치입니다. 사용자의 최근 30 베팅 데이터를 보고 위험을 진단합니다. " +
      "출력은 JSON one-shot: {\"recommendation\":\"한국어 한 줄\",\"risk_score\":0.0~1.0,\"loss_protect_trigger\":bool,\"reasoning\":\"30자 이내\"} 만.";
    const user = JSON.stringify({ total_rolls: sample.length, net_phon: Math.round(netPhon), total_bet_phon: Math.round(totalBet), recent: sample.slice(0, 10) });

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${LOVABLE_API_KEY}` },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: sys }, { role: "user", content: user }],
        response_format: { type: "json_object" },
        max_tokens: 200,
      }),
    });

    if (aiResp.status === 429) return new Response(JSON.stringify({ ok: false, error: "rate_limit", traceId }), {
      status: 429, headers: { ...cors, "Content-Type": "application/json" },
    });
    if (aiResp.status === 402) return new Response(JSON.stringify({ ok: false, error: "credits_exhausted", traceId }), {
      status: 402, headers: { ...cors, "Content-Type": "application/json" },
    });
    if (!aiResp.ok) throw new Error(`AI gateway ${aiResp.status}`);
    const aiJson = await aiResp.json();
    const content = aiJson?.choices?.[0]?.message?.content ?? "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(content); } catch { parsed = { recommendation: content, risk_score: 0.5, loss_protect_trigger: false }; }

    const risk = Math.max(0, Math.min(1, Number(parsed.risk_score ?? 0)));
    let armed = false;
    if (risk > 0.85 || parsed.loss_protect_trigger === true) {
      try {
        await svc.rpc("apex_loss_protection_arm", { _idem_key: `coach-v2:${uid}:${new Date().toISOString().slice(0, 10)}` });
        armed = true;
      } catch (e) { console.warn("[apex-coach-v2] loss_protection_arm failed (likely no-op):", e); }
    }

    return new Response(JSON.stringify({
      ok: true, traceId, latency_ms: Date.now() - t0,
      recommendation: parsed.recommendation ?? "",
      risk_score: risk,
      loss_protect_armed: armed,
      net_phon: Math.round(netPhon),
      sample_size: sample.length,
    }), { headers: { ...cors, "Content-Type": "application/json", "x-trace-id": traceId } });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: String(e?.message ?? e), traceId }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
