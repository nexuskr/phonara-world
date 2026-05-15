import { supabase } from "@/integrations/supabase/client";

export type SpinResult = {
  symbols: number[][]; // [row][reel] 3x5, values 0-10
  win_lines: { line: number; symbol: number; count: number; mult: number }[];
  payout_phon?: number;
  payout_chips?: number;
  bet_phon?: number;
  bet_chips?: number;
  balance_chips?: number;
  bonus_triggered: boolean;
  bonus_multiplier: number | null;
  server_seed_hash?: string;
  server_seed?: string;
  client_seed?: string;
  nonce?: number;
  rtp_boost_pct?: number;
};

const rpc = supabase.rpc as any;

function genClientSeed() {
  return crypto.getRandomValues(new Uint32Array(2)).join("-");
}

export async function spinReal(
  gameCode: string,
  betPhon: number,
  isBuyBonus = false
): Promise<SpinResult> {
  const { data, error } = await rpc("spin_slot_real", {
    _game_code: gameCode,
    _bet_phon: betPhon,
    _client_seed: genClientSeed(),
    _is_buy_bonus: isBuyBonus,
  });
  if (error) throw error;
  return data as SpinResult;
}

export async function spinDemo(
  gameCode: string,
  betChips: number,
  isBuyBonus = false
): Promise<SpinResult> {
  const { data, error } = await rpc("spin_slot_demo", {
    _game_code: gameCode,
    _bet_chips: betChips,
    _client_seed: genClientSeed(),
    _is_buy_bonus: isBuyBonus,
  });
  if (error) throw error;
  return data as SpinResult;
}

export async function getDemoBalance(): Promise<number> {
  const { data } = await (supabase as any)
    .from("slot_demo_balances")
    .select("balance_chips")
    .maybeSingle();
  return data?.balance_chips ?? 10000;
}

export async function claimDemoRefill() {
  const { data, error } = await rpc("claim_demo_refill");
  if (error) throw error;
  return data as { refilled: boolean; balance_chips: number; reason?: string };
}
