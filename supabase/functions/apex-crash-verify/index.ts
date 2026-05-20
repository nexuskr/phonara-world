// apex-crash-verify — public Ed25519 verifier + crash_x recompute for a given round_no.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { importEd25519Public, verifyEd25519, deriveCrashX, sha256Hex } from "../_shared/ed25519.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const url = new URL(req.url);
    const roundNo = Number(url.searchParams.get("round_no") ?? "0");
    if (!roundNo) return json({ error: "round_no_required" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!,
    );
    const { data, error } = await supabase.rpc("apex_crash_get_round", { _round_no: roundNo });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    if (!row || row.status !== "revealed") return json({ error: "round_not_revealed" }, 404);

    // Recompute hash + crash_x
    const recomputedHash = await sha256Hex(row.server_seed);
    const hashOk = recomputedHash === row.server_seed_hash;
    const recomputedX = await deriveCrashX(row.server_seed, row.public_seed, Number(row.nonce));
    const xOk = Math.abs(recomputedX - Number(row.crash_x)) < 1e-9;

    // Verify Ed25519
    const payload = JSON.stringify({
      round_no: Number(row.round_no), server_seed: row.server_seed,
      public_seed: row.public_seed, nonce: Number(row.nonce), crash_x: Number(row.crash_x),
    });
    const pub = await importEd25519Public(row.ed25519_public_key_b64);
    const sigOk = await verifyEd25519(pub, payload, row.ed25519_signature);

    return json({
      round_no: Number(row.round_no),
      crash_x: Number(row.crash_x),
      verdict: hashOk && xOk && sigOk ? "VALID" : "INVALID",
      checks: { server_seed_hash: hashOk, crash_x_recompute: xOk, ed25519_signature: sigOk },
      round: row,
    });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
