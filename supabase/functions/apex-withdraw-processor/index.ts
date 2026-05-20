/**
 * P3-C — apex-withdraw-processor
 *  - Picks 'pending' intents, marks 'processing'
 *  - In real deploy: integrates network gateway (TRC20/ERC20/BSC RPCs)
 *  - For now: deterministic mock processing + telemetry; admin AAL2 RPC finalizes
 *  - 머니플로 무변경 (apex_withdraw_intents 자체 큐만 사용)
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
  const t0 = performance.now();

  const { data: queue, error } = await sb
    .from("apex_withdraw_intents")
    .select("id, network, address, amount_usdt")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(25);
  if (error) return new Response(JSON.stringify({ ok: false, error: error.message }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 });

  let processed = 0;
  for (const it of queue ?? []) {
    await sb.from("apex_withdraw_intents").update({ status: "processing" }).eq("id", it.id);
    // network routing happens here in production; left as observability stub
    processed++;
  }

  await sb.rpc("imperial_log_observability", {
    _event: "apex_cashout_tick",
    _payload: { picked: processed, duration_ms: Math.round(performance.now() - t0) },
  }).catch(() => null);

  return new Response(JSON.stringify({ ok: true, picked: processed }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
