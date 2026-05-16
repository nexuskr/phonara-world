/**
 * useDepositCountdown — expiresAt 기반 카운트다운. visibilitychange drift fix.
 *
 * - setInterval tick에 의존하지 않고 매 tick마다 (expiresAt - Date.now()) 재계산.
 * - 백그라운드 복귀 시 즉시 재계산 + onResume 콜백.
 */
import { useEffect, useState } from "react";

export interface CountdownState {
  remainingMs: number;
  expired: boolean;
}

export function useDepositCountdown(
  expiresAt: number | null,
  onResume?: () => void,
): CountdownState {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!expiresAt) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [expiresAt]);

  useEffect(() => {
    if (!expiresAt) return;
    const onVis = () => {
      if (document.visibilityState === "visible") {
        setNow(Date.now());
        onResume?.();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onVis);
    };
  }, [expiresAt, onResume]);

  if (!expiresAt) return { remainingMs: 0, expired: false };
  const remainingMs = Math.max(0, expiresAt - now);
  return { remainingMs, expired: remainingMs <= 0 };
}

export function formatCountdown(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m.toString().padStart(2, "0")}:${r.toString().padStart(2, "0")}`;
}
