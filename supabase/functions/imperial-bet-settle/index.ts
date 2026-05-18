// Imperial Empire — PHON Real Bet Settle (Mode B)
// Admin + AAL2 enforced. RPC verifies SHA-256(server_seed) == committed hash.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3.23.8";

const Body = z.object({
  room_id: z.string().uuid(),
  server_seed: z.string().min(16).max(256),
});

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json(401, { error_code: "not_authenticated", error: "로그인이 필요합니다." });
  }

  let parsed;
  try {
    parsed = Body.safeParse(await req.json());
  } catch {
    return json(400, { error_code: "invalid_json", error: "요청 본문이 올바르지 않습니다." });
  }
  if (!parsed.success) {
    return json(400, { error_code: "invalid_input", error: "입력값을 확인해 주세요." });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: claimsData } = await supabase.auth.getClaims(authHeader.replace("Bearer ", ""));
  const claims = claimsData?.claims as Record<string, unknown> | undefined;
  if (!claims?.sub) return json(401, { error_code: "not_authenticated", error: "로그인이 필요합니다." });

  // AAL2 enforcement — admin must be stepped up
  if ((claims.aal as string) !== "aal2") {
    return json(403, { error_code: "aal2_required", error: "관리자 2차 인증이 필요합니다." });
  }

  const { data, error } = await supabase.rpc("imperial_settle_duel", {
    p_room_id: parsed.data.room_id,
    p_server_seed: parsed.data.server_seed,
  });

  if (error) {
    return json(409, { error_code: "rpc_error", error: error.message });
  }

  // Broadcast cinematic_signals for spectators
  try {
    const ch = supabase.channel(`game:imperial_duel:${parsed.data.room_id}`);
    await ch.send({
      type: "broadcast",
      event: "settled",
      payload: { room_id: parsed.data.room_id, result: data, at: new Date().toISOString() },
    });
    await ch.unsubscribe();
  } catch (_e) { /* ignore */ }

  return json(200, { ok: true, result: data });
});
