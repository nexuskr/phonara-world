import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const URL = Deno.env.get("VITE_SUPABASE_URL") ?? Deno.env.get("SUPABASE_URL")!;
const KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;

Deno.test("settle requires auth", async () => {
  const r = await fetch(`${URL}/functions/v1/imperial-bet-settle`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: KEY },
    body: JSON.stringify({}),
  });
  await r.text();
  assert([400, 401].includes(r.status));
});

Deno.test("settle rejects bare aal1 token", async () => {
  const r = await fetch(`${URL}/functions/v1/imperial-bet-settle`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
    },
    body: JSON.stringify({ room_id: "00000000-0000-0000-0000-000000000000", server_seed: "x".repeat(32) }),
  });
  const body = await r.json();
  // Either invalid_input, not_authenticated, or aal2_required — never 200.
  assertEquals(r.ok, false);
  assert(body.error_code);
});
