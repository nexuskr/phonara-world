/**
 * useShadowBetting — useOddsEngine 위에 얹은 Shadow Ledger 베팅 레이어.
 * 실잔액 변동 0, sessionStorage 만 사용. UI/UX 는 real betting 과 99% 동일.
 */
import { useCallback, useState } from "react";
import { shadowLedger, type ShadowEntry } from "../engine/shadowLedger";

export function useShadowBetting() {
  const [state, setState] = useState(() => shadowLedger.read());

  const reserve = useCallback((stake: number) => {
    const next = shadowLedger.reserve(stake);
    setState({ ...next });
    return next.balance;
  }, []);

  const settle = useCallback((args: {
    round: number;
    side: "left" | "right";
    stake: number;
    winnerSide: "left" | "right";
    payout: number;
    hmacShort: string;
  }) => {
    const next = shadowLedger.settle(args);
    setState({ ...next });
    return next;
  }, []);

  const reset = useCallback(() => {
    const next = shadowLedger.reset();
    setState({ ...next });
  }, []);

  return {
    balance: state.balance,
    history: state.history as ShadowEntry[],
    lifetimeStaked: state.lifetimeStaked,
    lifetimeWon: state.lifetimeWon,
    reserve,
    settle,
    reset,
  };
}
