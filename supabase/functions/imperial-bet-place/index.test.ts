// Smoke + invariant tests for imperial-bet-place edge.
// Requires SUPABASE_URL + SUPABASE_PUBLISHABLE_KEY at sandbox env.
import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const URL = Deno.env.get("VITE_SUPABASE_URL") ?? Deno.env.get("SUPABASE_URL")!;
const KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;

Deno.test("rejects unauthenticated", async () => {
  const r = await fetch(`${URL}/functions/v1/imperial-bet-place`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: KEY },
    body: JSON.stringify({}),
  });
  await r.text();
  assert([400, 401].includes(r.status));
});

Deno.test("rejects invalid body shape", async () => {
  const r = await fetch(`${URL}/functions/v1/imperial-bet-place`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: KEY, Authorization: `Bearer ${KEY}` },
    body: JSON.stringify({ room_id: "not-a-uuid", side: "middle", amount_phon: -1 }),
  });
  const body = await r.json();
  assertEquals(r.status, 400);
  assert(body.error_code);
});

Deno.test("CORS preflight returns ok", async () => {
  const r = await fetch(`${URL}/functions/v1/imperial-bet-place`, { method: "OPTIONS" });
  await r.text();
  assertEquals(r.status, 200);
});
