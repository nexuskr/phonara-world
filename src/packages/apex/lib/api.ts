// ApexForge thin RPC wrappers (Phase 1).
// money-flow FREEZE: 신규 RPC만 사용. apex_play_mock_game 본문 무변경.
import { supabase } from "@/integrations/supabase/client";

export interface ApexSummary {
  rolls_24h: number;
  bet_phon_eq: number;
  payout_phon_eq: number;
  rtp_24h: number | null;
  streak: number;
}

export interface ApexBigWin {
  nick: string;
  game_code: string;
  multiplier: number;
  payout_phon_eq: number;
  created_at: string;
}

export async function apexGetMySummary(): Promise<ApexSummary | null> {
  const { data, error } = await supabase.rpc("apex_get_my_summary" as any);
  if (error || !data || (data as any).error) return null;
  return data as ApexSummary;
}

export async function apexGetLiveBigwins(limit = 20): Promise<ApexBigWin[]> {
  const { data, error } = await supabase.rpc("apex_get_live_bigwins" as any, { _limit: limit });
  if (error || !data) return [];
  return data as ApexBigWin[];
}

export async function apexClaimDailyVault(): Promise<
  { ok: true; reward_phon: number; ymd: string } | { ok: false; error: string }
> {
  const { data, error } = await supabase.rpc("apex_claim_daily_vault" as any);
  if (error) return { ok: false, error: error.message };
  const d = data as any;
  if (d?.error) return { ok: false, error: d.error };
  return { ok: true, reward_phon: Number(d?.reward_phon ?? 0), ymd: String(d?.ymd ?? "") };
}

export async function apexVerifyRoll(rollId: string, clientSeed: string) {
  const { data, error } = await supabase.rpc("apex_verify_roll" as any, {
    _roll_id: rollId,
    _client_seed: clientSeed,
  });
  if (error) return null;
  return data as any;
}

export async function apexLogShare(
  kind: "kakao" | "band" | "twitter" | "web_share" | "referral",
  refId?: string
) {
  const { data, error } = await supabase.rpc("apex_log_kakao_share" as any, {
    _kind: kind,
    _ref_id: refId ?? null,
  });
  if (error) return null;
  return data as any;
}
