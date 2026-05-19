import { create } from "zustand";
import type { BlackjackPhase, Card, Outcome } from "../types";

interface HistoryEntry { id: string; outcome: Outcome; profit: number; at: number }

interface BlackjackState {
  phase: BlackjackPhase;
  bet: number;
  balance: number;
  player: Card[];
  dealer: Card[];
  dealerHidden: boolean;
  history: HistoryEntry[];
  setPhase: (p: BlackjackPhase) => void;
  setBet: (n: number) => void;
  setHands: (p: Card[], d: Card[], hidden: boolean) => void;
  recordSettle: (o: Outcome, profit: number) => void;
  topUpDemo: () => void;
}

export const useBlackjackStore = create<BlackjackState>((set) => ({
  phase: "idle",
  bet: 10000,
  balance: 1_000_000,
  player: [],
  dealer: [],
  dealerHidden: true,
  history: [],
  setPhase: (phase) => set({ phase }),
  setBet: (bet) => set({ bet }),
  setHands: (player, dealer, dealerHidden) => set({ player, dealer, dealerHidden }),
  recordSettle: (outcome, profit) =>
    set((s) => ({
      balance: s.balance + profit,
      history: [
        { id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, outcome, profit, at: Date.now() },
        ...s.history,
      ].slice(0, 30),
    })),
  topUpDemo: () => set({ balance: 1_000_000 }),
}));
