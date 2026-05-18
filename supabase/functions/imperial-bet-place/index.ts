// Imperial Empire — PHON Real Bet Place (Mode B)
// Validates JWT, calls imperial_place_phon_bet RPC (idempotent + atomic),
// then broadcasts a game-channel signal so other clients refresh the pot.
// MONEY_FLOW_NEW_PATH: phon_betting (Mode B) — does NOT touch FREEZE 8.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3.23.8";

const Body = z.object({
  room_id: z.string().uuid(),
  side: z.enum(["left", "right"]),
  amount_phon: z.number().positive().max(10_000_000),
  idem_key: z.string().min(8).max(80),
});

const ERR_KO: Record<string, string> = {
  phon_betting_disabled: "황제의 결투가 잠시 봉인되었습니다.",
  insufficient_balance: "PHON 잔액이 부족합니다.",
  room_not_open: "이미 마감된 결투입니다.",
  invalid_side: "베팅 방향이 잘못되었습니다.",
  invalid_amount: "베팅 금액이 잘못되었습니다.",
  not_authenticated: "로그인이 필요합니다.",
};

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
    return json(401, { error_code: "not_authenticated", error: ERR_KO.not_authenticated });
  }

  let parsed;
  try {
    parsed = Body.safeParse(await req.json());
  } catch {
    return json(400, { error_code: "invalid_json", error: "요청 본문이 올바르지 않습니다." });
  }
  if (!parsed.success) {
    return json(400, { error_code: "invalid_input", error: "입력값을 확인해 주세요.", details: parsed.error.flatten().fieldErrors });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: claims } = await supabase.auth.getClaims(authHeader.replace("Bearer ", ""));
  if (!claims?.claims?.sub) {
    return json(401, { error_code: "not_authenticated", error: ERR_KO.not_authenticated });
  }

  const { room_id, side, amount_phon, idem_key } = parsed.data;
  const { data, error } = await supabase.rpc("imperial_place_phon_bet", {
    p_room_id: room_id,
    p_side: side,
    p_amount: amount_phon,
    p_idem_key: idem_key,
  });

  if (error) {
    const code = (error.message || "").trim().split(/[:\s]/)[0];
    const ko = ERR_KO[code] || "베팅 처리 중 오류가 발생했습니다.";
    return json(409, { error_code: code || "rpc_error", error: ko, raw: error.message });
  }

  // Best-effort realtime broadcast — failures must NOT block the bet.
  try {
    const ch = supabase.channel(`game:imperial_duel:${room_id}`);
    await ch.send({
      type: "broadcast",
      event: "bet_placed",
      payload: { room_id, side, amount_phon, at: new Date().toISOString() },
    });
    await ch.unsubscribe();
  } catch (_e) { /* ignore — RPC already committed */ }

  return json(200, { ok: true, result: data });
});
