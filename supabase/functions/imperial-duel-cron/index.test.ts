import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assert } from "https://deno.land/std@0.224.0/assert/mod.ts";

const URL = Deno.env.get("VITE_SUPABASE_URL") ?? Deno.env.get("SUPABASE_URL")!;
const KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;

Deno.test("cron responds with kill_switch_off or processed payload", async () => {
  const r = await fetch(`${URL}/functions/v1/imperial-duel-cron`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: KEY },
    body: "{}",
  });
  const body = await r.json();
  assert(r.ok);
  assert("ok" in body);
});
