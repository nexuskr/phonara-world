import { useEffect, useState } from "react";
import { usePaperStore } from "@/lib/paper-trading/store";
import type { Position } from "@/lib/paper-trading/types";
import { setVisibleInterval } from "@/lib/util/visible-interval";

export interface LastTradeResult {
  pnl: number;
  symbol: string;
  side: "long" | "short";
  leverage: number;
  margin: number;
  closedAt: number;
}

/**
 * 마지막 종료된 paper trade 결과를 반환.
 * 30s TTL. 손실 복구 프롬프트 등 즉시 액션 트리거에 사용.
 */
export function useLastTradeResult(): LastTradeResult | null {
  const last = usePaperStore((s) => s.history[0] as Position | undefined);
  const [tick, setTick] = useState(0);

  // refresh once after mount to evaluate TTL
  useEffect(() => {
    const id = setVisibleInterval(() => setTick((n) => n + 1), 5_000 , { meta: { owner: "use-last-trade-result", category: "cosmetic" } });
    return () => id();
  }, []);

  if (!last?.closed) return null;
  if (Date.now() - last.closed.at > 30_000) return null;
  // tick used to force re-eval
  void tick;
  return {
    pnl: last.closed.pnl,
    symbol: last.symbol,
    side: last.side,
    leverage: last.leverage,
    margin: last.margin,
    closedAt: last.closed.at,
  };
}
