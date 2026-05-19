import { create } from "zustand";
import type { RouletteBets, RoulettePhase } from "../types";

interface HistoryEntry { id: string; number: number; profit: number; at: number }

interface RouletteState {
  phase: RoulettePhase;
  bets: RouletteBets;
  balance: number;
  lastResult: number | null;
  history: HistoryEntry[];
  setPhase: (p: RoulettePhase) => void;
  addBet: (b: RouletteBets[number]) => void;
  clearBets: () => void;
  recordSettle: (number: number, profit: number) => void;
  topUpDemo: () => void;
}

export const useRouletteStore = create<RouletteState>((set) => ({
  phase: "idle",
  bets: [],
  balance: 1_000_000,
  lastResult: null,
  history: [],
  setPhase: (phase) => set({ phase }),
  addBet: (b) => set((s) => ({ bets: [...s.bets, b] })),
  clearBets: () => set({ bets: [] }),
  recordSettle: (number, profit) =>
    set((s) => ({
      lastResult: number,
      balance: s.balance + profit,
      history: [
        { id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, number, profit, at: Date.now() },
        ...s.history,
      ].slice(0, 30),
    })),
  topUpDemo: () => set({ balance: 1_000_000 }),
}));
