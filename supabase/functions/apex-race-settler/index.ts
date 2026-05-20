/**
 * P3-D — apex-race-settler
 *  - Scans apex_races where ends_at <= now AND status='active'
 *  - Calls apex_settle_race(race_id) which assigns ranks + writes payouts
 *  - Logs to imperial_log_observability (read-only telemetry)
 *  - 머니플로 8경로 무변경 (payout 큐만 채움, fulfillment 별도)
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

  const t0 = performance.now();
  const { data: due, error } = await sb
    .from("apex_races")
    .select("id")
    .eq("status", "active")
    .lte("ends_at", new Date().toISOString())
    .limit(10);
  if (error) return new Response(JSON.stringify({ ok: false, error: error.message }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 });

  const results: Array<{ race_id: string; result: unknown }> = [];
  for (const r of due ?? []) {
    const { data, error: settleErr } = await sb.rpc("apex_settle_race", { _race_id: r.id });
    results.push({ race_id: r.id, result: settleErr ? { ok: false, error: settleErr.message } : data });
  }

  await sb.rpc("imperial_log_observability", {
    _event: "apex_race_settled",
    _payload: { count: results.length, results, duration_ms: Math.round(performance.now() - t0) },
  }).catch(() => null);

  return new Response(JSON.stringify({ ok: true, count: results.length, results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
