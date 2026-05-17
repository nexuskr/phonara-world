// Daily PHON staking settlement — invoked by pg_cron at 15:10 UTC (00:10 KST)
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const startedAt = new Date().toISOString();
  try {
    const { data, error } = await supabase.rpc("settle_phon_staking_daily");
    if (error) throw error;

    return new Response(
      JSON.stringify({ ok: true, started_at: startedAt, result: data ?? null }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // Best-effort error log; ignore failure
    try {
      await supabase.from("error_logs").insert({
        source: "settle-phon-staking-daily",
        message: msg,
        meta: { started_at: startedAt },
      });
    } catch (_) { /* noop */ }

    return new Response(
      JSON.stringify({ ok: false, error: msg, started_at: startedAt }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
    );
  }
});
