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

/** Live multiplier curve mirrors server: m = exp(0.06 * t_seconds) */
export function liveMultiplier(startedAt: number | null, serverNowOffsetMs: number, crash?: number) {
  if (!startedAt) return 1.0;
  const elapsedMs = Date.now() - serverNowOffsetMs - startedAt;
  if (elapsedMs <= 0) return 1.0;
  const m = Math.exp(0.06 * (elapsedMs / 1000));
  return crash ? Math.min(m, crash) : m;
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
  return "문제가 발생했어요. 다시 시도해주세요";
}
