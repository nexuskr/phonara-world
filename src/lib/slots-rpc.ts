import { supabase } from "@/integrations/supabase/client";
import { hasVerifiedSession } from "@/lib/auth-recovery";

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
  /** Which bonus mechanic to render (sticky_multi / hold88 / crash_cannon / pick_reveal / three_path / cluster_tumble / mission_trail / wheel). null when no bonus. */
  bonus_kind?: string | null;
  /** Deterministic seed for the bonus overlay so visuals reproduce server math. */
  bonus_seed?: number | null;
  server_seed_hash?: string;
  server_seed?: string;
  client_seed?: string;
  nonce?: number;
  rtp_boost_pct?: number;
};

export type BuyBonusQuote = {
  game_code: string;
  name: string;
  bet_phon: number;
  buy_bonus_multiplier: number;
  cost_phon: number;
  max_multiplier: number;
  bonus_kind: string;
};

export async function getBuyBonusQuote(
  gameCode: string,
  betPhon: number
): Promise<BuyBonusQuote> {
  const { data, error } = await supabase.rpc("get_slot_buy_bonus_quote" as any, {
    _game_code: gameCode,
    _bet_phon: betPhon,
  });
  if (error) throw error;
  return data as BuyBonusQuote;
}

function genClientSeed() {
  return crypto.getRandomValues(new Uint32Array(2)).join("-");
}

// IMPORTANT: never destructure / detach `supabase.rpc` — `this` binding breaks
// inside the postgrest client and triggers `Cannot read properties of undefined (reading 'rest')`.
export async function spinReal(
  gameCode: string,
  betPhon: number,
  isBuyBonus = false
): Promise<SpinResult> {
  const { data, error } = await supabase.rpc("spin_slot_real" as any, {
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
  const ok = await hasVerifiedSession();
  if (!ok) throw new Error("auth_required");
  const { data, error } = await supabase.rpc("spin_slot_demo" as any, {
    _game_code: gameCode,
    _bet_chips: betChips,
    _client_seed: genClientSeed(),
    _is_buy_bonus: isBuyBonus,
  });
  if (error) throw error;
  return data as SpinResult;
}

export async function getDemoBalance(): Promise<number> {
  const ok = await hasVerifiedSession();
  if (!ok) return 10000;
  const { data, error } = await (supabase as any)
    .from("slot_demo_balances")
    .select("balance_chips")
    .maybeSingle();
  if (error) return 10000;
  return data?.balance_chips ?? 10000;
}

export async function claimDemoRefill() {
  const ok = await hasVerifiedSession();
  if (!ok) throw new Error("auth_required");
  const { data, error } = await supabase.rpc("claim_demo_refill" as any);
  if (error) throw error;
  return data as { refilled: boolean; balance_chips: number; reason?: string };
}
