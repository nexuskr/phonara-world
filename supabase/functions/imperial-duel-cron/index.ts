// Imperial Empire — Duel Cron tick
// Sweeps rooms past their settle_at horizon. Each room is settled
// independently so partial failures do not block others.
// Uses service role for RPC dispatch; RPC itself enforces seed-hash integrity.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Kill-switch short circuit
  const { data: ks } = await supabase
    .from("platform_kill_switches")
    .select("enabled")
    .eq("key", "phon_betting_enabled")
    .maybeSingle();
  if (!ks?.enabled) return json(200, { ok: true, skipped: "kill_switch_off" });

  const now = new Date().toISOString();

  // Atomic-ish ready room scan with SKIP LOCKED behavior baked into the RPC contract.
  const { data: rooms, error } = await supabase
    .from("imperial_duel_rooms")
    .select("id, server_seed_plaintext, status, settle_at")
    .in("status", ["open", "locked"])
    .lt("settle_at", now)
    .limit(50);

  if (error) return json(500, { error: error.message });
  if (!rooms?.length) return json(200, { ok: true, processed: 0 });

  let ok = 0;
  const failures: Array<{ id: string; reason: string }> = [];

  for (const room of rooms) {
    if (!room.server_seed_plaintext) {
      failures.push({ id: room.id, reason: "missing_seed_plaintext" });
      continue;
    }
    try {
      const { error: rpcErr } = await supabase.rpc("imperial_settle_duel", {
        p_room_id: room.id,
        p_server_seed: room.server_seed_plaintext,
      });
      if (rpcErr) {
        failures.push({ id: room.id, reason: rpcErr.message });
        await supabase.from("imperial_duel_audit").insert({
          room_id: room.id,
          event: "cron_partial_fail",
          meta: { reason: rpcErr.message, at: now },
        });
      } else {
        ok += 1;
      }
    } catch (e) {
      failures.push({ id: room.id, reason: String(e) });
    }
  }

  return json(200, { ok: true, processed: rooms.length, settled: ok, failures });
});
