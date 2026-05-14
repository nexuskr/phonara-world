/**
 * useWithdrawQueue — admin 출금 큐 통합 훅
 *
 * 단일 책임: withdrawal_requests 테이블에서 활성 큐를 가져오고,
 * useRealtimeChannel(통합 진입점)로 INSERT/UPDATE를 구독해 자동 갱신한다.
 *
 * - supabase.channel 직접 호출 금지 → useRealtimeChannel만 사용
 * - 채널 down 시 15s 폴링 폴백 (useRealtimeChannel 내장)
 * - 통계는 useMemo로만 계산 (divide-by-zero/NaN 가드)
 *
 * priority: smallint, 낮을수록 우선 (기본 100). priority < 100 = priority 큐.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeChannel } from "@/hooks/use-realtime-channel";

export type WithdrawalStatus =
  | "pending"
  | "processing"
  | "approved"
  | "completed"
  | "rejected"
  | "cancelled";

export interface WithdrawalRow {
  id: string;
  user_id: string;
  amount: number;
  method: string;
  status: WithdrawalStatus;
  priority: number;
  tier_at_request: string;
  tx_code: string;
  created_at: string;
  process_by: string;
  approved_at: string | null;
  completed_at: string | null;
  rejected_reason: string | null;
}

export interface QueueStats {
  pending_count: number;
  priority_count: number;
  avg_processing_minutes: number;
  delayed_count: number;
}

const ACTIVE_STATUSES: WithdrawalStatus[] = ["pending", "processing", "approved"];

export function useWithdrawQueue() {
  const [withdrawals, setWithdrawals] = useState<WithdrawalRow[]>([]);
  const [recentCompleted, setRecentCompleted] = useState<WithdrawalRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWithdrawals = useCallback(async () => {
    setError(null);
    try {
      const sinceIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const [activeRes, completedRes] = await Promise.all([
        supabase
          .from("withdrawal_requests")
          .select(
            "id,user_id,amount,method,status,priority,tier_at_request,tx_code,created_at,process_by,approved_at,completed_at,rejected_reason",
          )
          .in("status", ACTIVE_STATUSES)
          .order("priority", { ascending: true })
          .order("created_at", { ascending: true })
          .limit(500),
        supabase
          .from("withdrawal_requests")
          .select("id,user_id,amount,method,status,priority,tier_at_request,tx_code,created_at,process_by,approved_at,completed_at,rejected_reason")
          .eq("status", "completed")
          .gte("completed_at", sinceIso)
          .order("completed_at", { ascending: false })
          .limit(200),
      ]);

      if (activeRes.error) throw activeRes.error;
      if (completedRes.error) throw completedRes.error;

      setWithdrawals((activeRes.data ?? []) as WithdrawalRow[]);
      setRecentCompleted((completedRes.data ?? []) as WithdrawalRow[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "출금 큐 로드 실패");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchWithdrawals();
  }, [fetchWithdrawals]);

  // 통합 realtime — 단일 채널 (INSERT/UPDATE 모두). 폴링 15s 폴백 + focus 재개.
  useRealtimeChannel({
    key: "admin-withdraw-queue",
    bindings: [{ event: "*", table: "withdrawal_requests" }],
    onEvent: () => {
      void fetchWithdrawals();
    },
    pollMs: 15_000,
    onPoll: () => { void fetchWithdrawals(); },
    resumeOnFocus: true,
    resumeOnAuthChange: true,
  });

  const stats = useMemo<QueueStats>(() => {
    const now = Date.now();
    let pending = 0;
    let priority = 0;
    let delayed = 0;

    for (const w of withdrawals) {
      if (w.status !== "pending") continue;
      pending += 1;
      if (typeof w.priority === "number" && w.priority < 100) priority += 1;
      const dueMs = Date.parse(w.process_by);
      if (Number.isFinite(dueMs) && dueMs < now) delayed += 1;
    }

    let totalMin = 0;
    let counted = 0;
    for (const w of recentCompleted) {
      if (!w.completed_at) continue;
      const start = Date.parse(w.created_at);
      const end = Date.parse(w.completed_at);
      if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) continue;
      totalMin += (end - start) / 60_000;
      counted += 1;
    }
    const avg = counted > 0 ? totalMin / counted : 0;

    return {
      pending_count: pending,
      priority_count: priority,
      avg_processing_minutes: Math.round(avg),
      delayed_count: delayed,
    };
  }, [withdrawals, recentCompleted]);

  return {
    withdrawals,
    stats,
    isLoading,
    error,
    refetch: fetchWithdrawals,
  };
}
