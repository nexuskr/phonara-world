/**
 * Odds Engine — 시뮬레이션 양측 풀 + 변동 배당.
 * House Edge 6.2% 보존, 잔액 영향 0 (가상 PHON).
 */
export const HOUSE_EDGE = 0.062;

export interface PoolState {
  leftPool: number;
  rightPool: number;
  totalBets: number;
}

export function computeOdds(p: PoolState): { left: number; right: number } {
  const total = Math.max(1, p.leftPool + p.rightPool);
  const factor = 1 - HOUSE_EDGE;
  const left = (total / Math.max(1, p.leftPool)) * factor;
  const right = (total / Math.max(1, p.rightPool)) * factor;
  return {
    left: Math.max(1.01, Math.min(50, left)),
    right: Math.max(1.01, Math.min(50, right)),
  };
}

/** 한쪽 풀이 totalBets 의 비중 — pool_imbalance 트리거에 사용. */
export function poolImbalance(p: PoolState): number {
  const total = Math.max(1, p.leftPool + p.rightPool);
  return Math.abs(p.leftPool - p.rightPool) / total; // 0..1
}

export interface BetRecord {
  side: "left" | "right";
  amount: number;
  oddsAtPlace: number;
  ts: number;
}

export function settlePayout(bet: BetRecord, winner: "left" | "right"): number {
  if (bet.side !== winner) return 0;
  return Math.round(bet.amount * bet.oddsAtPlace);
}
