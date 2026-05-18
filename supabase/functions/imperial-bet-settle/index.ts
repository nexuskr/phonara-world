// IMPERIAL-SINGULARITY: PHON Real Bet Settle (Mode B) — admin AAL2 + telemetry
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3.23.8";
import { newTraceId, tlog, traceHeaders } from "../_shared/duel-telemetry.ts";

const FN = "imperial-bet-settle";

const Body = z.object({
  room_id: z.string().uuid(),
  server_seed: z.string().min(16).max(256),
});

function json(status: number, body: unknown, trace_id: string) {
  return new Response(JSON.stringify({ ...((body as object) ?? {}), trace_id }), {
    status,
    headers: { ...corsHeaders, ...traceHeaders(trace_id), "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const trace_id = newTraceId();
  const t0 = Date.now();

  if (req.method !== "POST") return json(405, { error: "method_not_allowed" }, trace_id);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json(401, { error_code: "not_authenticated", error: "로그인이 필요합니다." }, trace_id);
  }

  let parsed;
  try {
    parsed = Body.safeParse(await req.json());
  } catch {
    return json(400, { error_code: "invalid_json", error: "요청 본문이 올바르지 않습니다." }, trace_id);
  }
  if (!parsed.success) {
    return json(400, { error_code: "invalid_input", error: "입력값을 확인해 주세요." }, trace_id);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: claimsData } = await supabase.auth.getClaims(authHeader.replace("Bearer ", ""));
  const claims = claimsData?.claims as Record<string, unknown> | undefined;
  if (!claims?.sub) return json(401, { error_code: "not_authenticated", error: "로그인이 필요합니다." }, trace_id);

  if ((claims.aal as string) !== "aal2") {
    await tlog(trace_id, FN, "warn", "aal2_required", { sub: claims.sub });
    return json(403, { error_code: "aal2_required", error: "관리자 2차 인증이 필요합니다." }, trace_id);
  }

  await tlog(trace_id, FN, "info", "settle_attempt", { room_id: parsed.data.room_id });

  const { data, error } = await supabase.rpc("imperial_settle_duel", {
    p_room_id: parsed.data.room_id,
    p_server_seed: parsed.data.server_seed,
  });

  const latency_ms = Date.now() - t0;

  if (error) {
    console.error("[imperial-bet-settle] settle_failed", { trace_id, raw: error.message });
    await tlog(trace_id, FN, "error", "settle_failed", { latency_ms, raw: error.message });
    return json(409, { error_code: "rpc_error", error: "bet_settlement_failed" }, trace_id);
  }

  await tlog(trace_id, FN, "info", "settle_ok", { room_id: parsed.data.room_id, latency_ms });

  try {
    const ch = supabase.channel(`game:imperial_duel:${parsed.data.room_id}`);
    await ch.send({
      type: "broadcast",
      event: "settled",
      payload: { room_id: parsed.data.room_id, result: data, at: new Date().toISOString() },
    });
    await ch.unsubscribe();
  } catch (_e) { /* ignore */ }

  return json(200, { ok: true, result: data }, trace_id);
});
