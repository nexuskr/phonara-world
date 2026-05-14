/**
 * Oracle chaos drill — Phase 3 verification.
 *
 * Usage (admin auth required):
 *   bun scripts/oracle-chaos.ts kill bybit
 *   bun scripts/oracle-chaos.ts kill binance
 *   bun scripts/oracle-chaos.ts clear
 *   bun scripts/oracle-chaos.ts status
 *
 * Run in browser console while logged in as admin:
 *   import('/scripts/oracle-chaos.ts').then(m => m.killSource('bybit'))
 */

import { supabase } from "@/integrations/supabase/client";

export async function killSource(source: "bybit" | "binance" | "coinbase", minutes = 1) {
  const { data, error } = await supabase.rpc("admin_oracle_chaos_stale_source" as any, {
    _source: source, _minutes: minutes,
  });
  if (error) throw error;
  console.log(`[chaos] ${source} → stale (${data} rows)`);
  return data;
}

export async function clearChaos() {
  const { data, error } = await supabase.rpc("admin_oracle_chaos_clear" as any);
  if (error) throw error;
  console.log(`[chaos] cleared (${data} rows refreshed)`);
  return data;
}

export async function status() {
  const { data, error } = await supabase.rpc("admin_get_oracle_health" as any);
  if (error) throw error;
  const h = data as any;
  console.log("[oracle] summary:", h.summary);
  console.log("[oracle] sample:", h.matrix?.slice(0, 5));
  return h;
}

// CLI entrypoint when run via bun
if (typeof process !== "undefined" && process.argv[1]?.includes("oracle-chaos")) {
  const cmd = process.argv[2];
  const arg = process.argv[3];
  (async () => {
    try {
      if (cmd === "kill") await killSource(arg as any);
      else if (cmd === "clear") await clearChaos();
      else if (cmd === "status") await status();
      else console.log("usage: bun scripts/oracle-chaos.ts <kill {bybit|binance|coinbase} | clear | status>");
    } catch (e) {
      console.error(e);
      process.exit(1);
    }
  })();
}
