/**
 * useFomoOracle — Adaptive Global + Personalized + Spectator Pressure FOMO 시그널 12s 틱.
 * 모두 클라 시뮬, RPC 0.
 */
import { useEffect, useState } from "react";
import { computeFomo } from "../engine/fomo";
import { computeThreshold } from "../engine/dynamicThreshold";
import type { FomoSignals } from "../types";

const STORAGE_KEY = "phonara:duel_personal:v1";

interface Personal {
  recentNearMisses: number;
  consecutiveLosses: number;
  royalPassProgress: number;
  lastVisitAt: number;
  recentResults: Array<"left" | "right">;
}

function load(): Personal {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* */ }
  return {
    recentNearMisses: 1,
    consecutiveLosses: 2,
    royalPassProgress: 64,
    lastVisitAt: Date.now() - 31 * 60_000,
    recentResults: ["left", "right", "right", "left", "right"],
  };
}

function save(p: Personal) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); } catch { /* */ }
}

export function useFomoOracle(opts: { spectators: number; jackpotPct: number; poolImbalance?: number }): FomoSignals & {
  recordResult: (winner: "left" | "right", nearMiss: boolean) => void;
} {
  const [personal, setPersonal] = useState<Personal>(load);

  const minutesSinceLastVisit = Math.max(0, Math.floor((Date.now() - personal.lastVisitAt) / 60_000));
  const { threshold, offset } = computeThreshold({
    recentResults: personal.recentResults,
    personalHeat: Math.min(100, personal.consecutiveLosses * 10 + personal.recentNearMisses * 8 + 30),
  });
  const [signals, setSignals] = useState<FomoSignals>(() =>
    computeFomo({
      spectators: opts.spectators,
      jackpotPct: opts.jackpotPct,
      recentNearMisses: personal.recentNearMisses,
      consecutiveLosses: personal.consecutiveLosses,
      royalPassProgress: personal.royalPassProgress,
      minutesSinceLastVisit,
      dynamicOffset: offset,
      nearMissFlag: false,
      threshold,
      poolImbalance: opts.poolImbalance,
    }),
  );

  useEffect(() => {
    const compute = () =>
      setSignals(
        computeFomo({
          spectators: opts.spectators,
          jackpotPct: opts.jackpotPct,
          recentNearMisses: personal.recentNearMisses,
          consecutiveLosses: personal.consecutiveLosses,
          royalPassProgress: personal.royalPassProgress,
          minutesSinceLastVisit: Math.max(0, Math.floor((Date.now() - personal.lastVisitAt) / 60_000)),
          dynamicOffset: offset,
          nearMissFlag: false,
          threshold,
          poolImbalance: opts.poolImbalance,
        }),
      );
    compute();
    // Tracked interval for entropy categorization (category: 'fomo')
    const id = window.setInterval(compute, 12_000);
    try {
      (id as unknown as { __category?: string }).__category = "fomo";
      (window as any).__phonara_interval_meta?.set?.(id, { category: "fomo", owner: "duel/useFomoOracle" });
    } catch { /* */ }
    return () => window.clearInterval(id);
  }, [opts.spectators, opts.jackpotPct, opts.poolImbalance, personal, offset, threshold]);

  const recordResult = (winner: "left" | "right", nearMiss: boolean) => {
    setPersonal((p) => {
      const next: Personal = {
        recentNearMisses: Math.min(10, p.recentNearMisses + (nearMiss ? 1 : 0)),
        consecutiveLosses: winner === "right" ? p.consecutiveLosses + 1 : 0,
        royalPassProgress: Math.min(100, p.royalPassProgress + 1),
        lastVisitAt: Date.now(),
        recentResults: [...p.recentResults, winner].slice(-10),
      };
      save(next);
      return next;
    });
  };

  return { ...signals, recordResult };
}
