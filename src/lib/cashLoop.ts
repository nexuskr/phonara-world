/**
 * Cash Loop client — 3분 시뮬레이션 → 첫 입금 갓모드 전환 엔진.
 * - 모든 자금/잔고는 SIM(₡). 실제 KRW/USDT와 100% 분리.
 * - 토큰은 localStorage에 저장. 24h 재사용 가능.
 */
import { supabase } from "@/integrations/supabase/client";

const TOKEN_KEY = "phonara_cash_loop_token";

export type CashLoopPhase =
  | "welcome"
  | "sim_win"
  | "deposit_prompt"
  | "converted"
  | "expired";

export interface CashLoopSession {
  id: string;
  user_id: string | null;
  session_token: string;
  phase: CashLoopPhase;
  sim_balance: number;
  sim_pnl: number;
  is_simulated: boolean;
  started_at: string;
  completed_at: string | null;
  converted_at: string | null;
}

function getOrCreateToken(): string {
  if (typeof window === "undefined") return "ssr";
  let t = localStorage.getItem(TOKEN_KEY);
  if (!t) {
    t = `cl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
    localStorage.setItem(TOKEN_KEY, t);
  }
  return t;
}

export async function startCashLoop(): Promise<CashLoopSession | null> {
  const token = getOrCreateToken();
  const { data, error } = await supabase.rpc("start_cash_loop_session", { _token: token });
  if (error) {
    console.warn("[cashLoop] start failed", error.message);
    return null;
  }
  return data as unknown as CashLoopSession;
}

export async function advanceCashLoop(
  phase: CashLoopPhase,
  simPnl?: number,
): Promise<CashLoopSession | null> {
  const token = getOrCreateToken();
  const { data, error } = await supabase.rpc("advance_cash_loop_phase", {
    _token: token,
    _phase: phase,
    _sim_pnl: simPnl ?? null,
  });
  if (error) {
    console.warn("[cashLoop] advance failed", error.message);
    return null;
  }
  return data as unknown as CashLoopSession;
}

export async function claimFirstDepositGodMode(depositKrw: number) {
  const { data, error } = await supabase.rpc("claim_first_deposit_godmode", {
    _deposit_krw: depositKrw,
  });
  if (error) throw error;
  return data;
}

export async function getMyGodModeStatus() {
  const { data, error } = await supabase.rpc("get_my_godmode_status");
  if (error) return null;
  return data;
}
