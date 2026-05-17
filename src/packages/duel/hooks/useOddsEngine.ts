/**
 * useOddsEngine — 시뮬레이션 양측 풀 ledger + 가짜 베터 tick.
 * 클라 전용, RPC/DB 영향 0.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { computeOdds, settlePayout, type BetRecord, type PoolState } from "../engine/odds";

interface Options {
  roomId: string;
  heat: number; // 1..5
  initialLeft?: number;
  initialRight?: number;
}

export function useOddsEngine({ roomId, heat, initialLeft = 18_500, initialRight = 21_200 }: Options) {
  const [pool, setPool] = useState<PoolState>({
    leftPool: initialLeft,
    rightPool: initialRight,
    totalBets: 0,
  });
  const [myBet, setMyBet] = useState<BetRecord | null>(null);
  const seedRef = useRef(0);

  // 가짜 베터 0.5s tick — heat 가 높을수록 변동 폭 증가
  useEffect(() => {
    seedRef.current = 0;
    const intensity = 600 + heat * 320;
    const id = window.setInterval(() => {
      seedRef.current++;
      setPool((p) => {
        const side: "left" | "right" = Math.random() < 0.5 ? "left" : "right";
        const delta = Math.floor((Math.random() * 0.7 + 0.3) * intensity);
        return {
          leftPool: side === "left" ? p.leftPool + delta : p.leftPool,
          rightPool: side === "right" ? p.rightPool + delta : p.rightPool,
          totalBets: p.totalBets + 1,
        };
      });
    }, 500);
    return () => window.clearInterval(id);
  }, [roomId, heat]);

  const odds = computeOdds(pool);

  const place = useCallback(
    (side: "left" | "right", amount: number) => {
      const o = computeOdds(pool);
      const rec: BetRecord = { side, amount, oddsAtPlace: o[side], ts: Date.now() };
      setMyBet(rec);
      setPool((p) => ({
        leftPool: side === "left" ? p.leftPool + amount : p.leftPool,
        rightPool: side === "right" ? p.rightPool + amount : p.rightPool,
        totalBets: p.totalBets + 1,
      }));
      return rec;
    },
    [pool],
  );

  const settleRound = useCallback(
    (winner: "left" | "right"): { payout: number; bet: BetRecord | null } => {
      if (!myBet) return { payout: 0, bet: null };
      const payout = settlePayout(myBet, winner);
      const settled = myBet;
      setMyBet(null);
      return { payout, bet: settled };
    },
    [myBet],
  );

  return { pool, odds, myBet, place, settleRound };
}
