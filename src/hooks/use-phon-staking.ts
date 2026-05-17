/**
 * usePhonStaking — PHON 스테이킹 RPC 래퍼 + 요약.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notify";

export interface StakeRow {
  id: string;
  amount: number;
  started_at: string;
  last_yield_at: string | null;
  status: "active" | "closed";
  apy_bps: number;
  lock_days: number;
}

export interface StakeSummary {
  active_total: number;
  count: number;
  total_yield: number;
  apy_bps: number;
}

function humanError(code?: string): string {
  switch (code) {
    case "feature_disabled": return "지금은 스테이킹이 잠시 멈춰 있어요.";
    case "amount_below_min": return "최소 스테이킹 수량을 확인해 주세요.";
    case "insufficient_phon": return "보유한 PHON 이 부족해요.";
    case "stake_locked": return "아직 락업 기간이 끝나지 않았어요.";
    case "stake_already_closed": return "이미 해제된 스테이크입니다.";
    case "stake_not_found": return "스테이크를 찾을 수 없어요.";
    default: return "잠시 후 다시 시도해 주세요. 폐하의 자산은 안전합니다.";
  }
}

export function usePhonStaking() {
  const [summary, setSummary] = useState<StakeSummary>({ active_total: 0, count: 0, total_yield: 0, apy_bps: 0 });
  const [stakes, setStakes] = useState<StakeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const [{ data: s }, { data: list }] = await Promise.all([
      (supabase as any).rpc("get_my_stake_summary"),
      (supabase as any).rpc("get_my_stakes"),
    ]);
    if (s) setSummary(s as StakeSummary);
    if (list) setStakes(list as StakeRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const stake = useCallback(async (amount: number) => {
    if (!amount || amount <= 0) { notify.warning("금액을 입력해 주세요"); return { ok: false as const }; }
    setBusy(true);
    const tId = notify.loading("스테이킹 진행 중…");
    try {
      const { data, error } = await (supabase as any).rpc("stake_phon", { p_amount: amount });
      if (error) {
        notify.error("스테이킹 실패", { id: tId, description: humanError((error as any).message) });
        return { ok: false as const };
      }
      notify.success("스테이킹 완료", { id: tId, description: "오늘부터 매일 자동으로 배당이 쌓여요." });
      await refresh();
      return { ok: true as const, data };
    } finally { setBusy(false); }
  }, [refresh]);

  const unstake = useCallback(async (stakeId: string) => {
    setBusy(true);
    const tId = notify.loading("스테이킹 해제 중…");
    try {
      const { data, error } = await (supabase as any).rpc("unstake_phon", { p_stake_id: stakeId });
      if (error) {
        notify.error("해제 실패", { id: tId, description: humanError((error as any).message) });
        return { ok: false as const };
      }
      notify.success("PHON 이 다시 폐하의 손에 돌아왔어요", { id: tId });
      await refresh();
      return { ok: true as const, data };
    } finally { setBusy(false); }
  }, [refresh]);

  return { summary, stakes, loading, busy, stake, unstake, refresh };
}
