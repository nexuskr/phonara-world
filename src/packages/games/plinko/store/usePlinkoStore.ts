/**
 * Imperial Plinko — store.
 */
import { create } from "zustand";
import type { PlinkoPhase, PlinkoRisk, PlinkoRow } from "../types";

interface PlinkoHistoryEntry {
  id: string;
  multiplier: number;
  bin: number;
  bet: number;
  payout: number;
  at: number;
}

interface PlinkoState {
  phase: PlinkoPhase;
  risk: PlinkoRisk;
  rows: PlinkoRow;
  bet: number;
  balance: number;
  history: PlinkoHistoryEntry[];
  totalProfit: number;
  setRisk: (r: PlinkoRisk) => void;
  setRows: (r: PlinkoRow) => void;
  setBet: (n: number) => void;
  setPhase: (p: PlinkoPhase) => void;
  recordSettlement: (e: Omit<PlinkoHistoryEntry, "id" | "at">) => void;
  topUpDemo: () => void;
}

export const usePlinkoStore = create<PlinkoState>((set) => ({
  phase: "idle",
  risk: "medium",
  rows: 12,
  bet: 10000,
  balance: 1_000_000,
  history: [],
  totalProfit: 0,
  setRisk: (risk) => set({ risk }),
  setRows: (rows) => set({ rows }),
  setBet: (bet) => set({ bet }),
  setPhase: (phase) => set({ phase }),
  recordSettlement: (e) =>
    set((s) => ({
      history: [
        { ...e, id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, at: Date.now() },
        ...s.history,
      ].slice(0, 30),
      balance: s.balance - e.bet + e.payout,
      totalProfit: s.totalProfit + (e.payout - e.bet),
    })),
  topUpDemo: () => set({ balance: 1_000_000 }),
}));
