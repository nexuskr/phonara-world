import { supabase } from "@/integrations/supabase/client";

export type CrashStatus = "none" | "pending" | "running" | "crashed";

export interface CurrentRound {
  status: CrashStatus;
  id?: string;
  seed_hash?: string;
  pending_until?: string;
  started_at?: string;
  server_time?: string;
  bet_count?: number;
  total_phon?: number;
  last_crash?: number;
}

export interface RecentWin {
  nick: string;
  avatar_id: string | null;
  multiplier: number;
  payout: number;
  created_at: string;
  round_id: string;
}

export interface LiveBet {
  nick: string;
  avatar_id: string | null;
  bet_phon: number;
  cashed_at: number | null;
  payout: number;
  status: "live" | "won" | "lost";
}

export interface MyCrashStats {
  total: number;
  wins: number;
  best_mult: number;
  streak: number;
  today_bets: number;
  mission_ready: boolean;
  mission_claimed: boolean;
}

export interface RoundProof {
  ok: boolean;
  id?: string;
  seed_hash?: string;
  seed?: string | null;
  seed_revealed?: boolean;
  crash_multiplier?: number | null;
  status?: CrashStatus;
  crashed_at?: string | null;
  started_at?: string | null;
  created_at?: string;
  error?: string;
}

export interface HistoryRow {
  bet_id: string;
  round_id: string;
  seed_hash: string;
  crash_multiplier: number;
  crashed_at: string | null;
  bet_phon: number;
  auto_cashout: number | null;
  cashed_out_at_multiplier: number | null;
  payout_phon: number;
  bonus_mult: number;
  won: boolean;
  created_at: string;
}

export type HistoryFilter = "all" | "won" | "lost" | "cashed" | "busted" | "today" | "7d";

export async function getCurrentRound(): Promise<CurrentRound> {
  const { data, error } = await supabase.rpc("crash_get_current_round");
  if (error) throw error;
  return (data as unknown as CurrentRound) ?? { status: "none" };
}

export async function getRecentWins(limit = 20): Promise<RecentWin[]> {
  const { data, error } = await supabase.rpc("crash_get_recent_wins", { _limit: limit });
  if (error) throw error;
  return (data as RecentWin[]) ?? [];
}

export async function getLiveBets(roundId: string): Promise<LiveBet[]> {
  const { data, error } = await supabase.rpc("crash_get_live_bets", { _round_id: roundId });
  if (error) throw error;
  return (data as LiveBet[]) ?? [];
}

export async function getMyStats(): Promise<MyCrashStats> {
  const { data, error } = await supabase.rpc("crash_get_my_stats");
  if (error) throw error;
  return (data as unknown as MyCrashStats) ?? {
    total: 0, wins: 0, best_mult: 0, streak: 0, today_bets: 0, mission_ready: false, mission_claimed: false,
  };
}

export async function placeBet(betPhon: number, autoCashout: number | null) {
  const { data, error } = await supabase.rpc("crash_place_bet", {
    _bet_phon: betPhon,
    _auto_cashout: autoCashout,
  });
  if (error) throw error;
  return data as { ok: boolean; round_id: string; bonus_mult: number; tier: string; streak: number };
}

export async function cashoutNow(roundId: string) {
  const { data, error } = await supabase.rpc("crash_cashout", { _round_id: roundId });
  if (error) throw error;
  return data as { ok: boolean; mult: number; effective: number; payout: number };
}

export async function claimCrashMission() {
  const { data, error } = await supabase.rpc("claim_crash_mission_phon");
  if (error) throw error;
  return data as { ok: boolean; reward: number };
}

export async function getRoundProof(roundId: string): Promise<RoundProof> {
  const { data, error } = await supabase.rpc("crash_get_round_proof", { _round_id: roundId });
  if (error) throw error;
  return (data as unknown as RoundProof) ?? { ok: false };
}

export async function getMyHistory(
  limit = 50,
  offset = 0,
  filter: HistoryFilter = "all"
): Promise<HistoryRow[]> {
  const { data, error } = await supabase.rpc("crash_get_my_history", {
    _limit: limit, _offset: offset, _filter: filter,
  });
  if (error) throw error;
  return (data as HistoryRow[]) ?? [];
}

/** Live multiplier curve mirrors server: m = exp(0.06 * t_seconds) */
export function liveMultiplier(startedAt: number | null, serverNowOffsetMs: number, crash?: number) {
  if (!startedAt) return 1.0;
  const elapsedMs = Date.now() - serverNowOffsetMs - startedAt;
  if (elapsedMs <= 0) return 1.0;
  const m = Math.exp(0.06 * (elapsedMs / 1000));
  return crash ? Math.min(m, crash) : m;
}

/**
 * Mirrors server `_crash_compute_multiplier`:
 *  r = first 13 hex chars of sha256(seed) / 2^52
 *  if r < 0.03 → 1.00
 *  else m = floor((100*99)/(1-r))/100, clamped to [1.01, 1000]
 */
export async function recomputeMultiplierFromSeed(seed: string): Promise<number> {
  const enc = new TextEncoder().encode(seed);
  const digest = await crypto.subtle.digest("SHA-256", enc);
  const hex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0")).join("");
  const r = parseInt(hex.slice(0, 13), 16) / 4503599627370496;
  if (r < 0.03) return 1.0;
  let m = Math.floor((100 * 99) / (1 - r)) / 100;
  if (m < 1.01) m = 1.01;
  if (m > 1000) m = 1000;
  return m;
}

export function friendlyError(e: unknown): string {
  const msg = String((e as { message?: string })?.message ?? e ?? "");
  if (msg.includes("insufficient_phon")) return "PHON 잔액이 부족합니다";
  if (msg.includes("over_max_bet")) return "VIP 티어 최대 베팅을 초과했어요";
  if (msg.includes("bet_too_small")) return "최소 베팅은 100 PHON";
  if (msg.includes("no_open_round")) return "라운드 대기 중입니다";
  if (msg.includes("auto_cashout_invalid")) return "자동 캐시아웃은 1.01x 이상";
  if (msg.includes("already_cashed_out")) return "이미 캐시아웃 완료";
  if (msg.includes("round_not_live")) return "라운드가 진행 중이 아닙니다";
  if (msg.includes("no_bet")) return "베팅 기록이 없어요";
  if (msg.includes("too_early")) return "조금만 더 기다리세요";
  if (msg.includes("need_3_plays")) return "오늘 3판 이상 베팅이 필요해요";
  if (msg.includes("already_claimed")) return "오늘 보상은 이미 받았어요";
  if (msg.includes("auth_required")) return "로그인이 필요해요";
  return "문제가 발생했어요. 다시 시도해주세요";
}
