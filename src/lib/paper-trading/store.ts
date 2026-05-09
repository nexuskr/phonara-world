import { create } from "zustand";
import { persist, createJSONStorage, StateStorage } from "zustand/middleware";
import { get as idbGet, set as idbSet, del as idbDel } from "idb-keyval";
import type { Position, Side } from "./types";
import { computePnl, computeRoi, isLiquidated, newId } from "./engine";

const STARTING_CREDIT = 10_000; // USDT paper

const idbStorage: StateStorage = {
  getItem: async (name) => (await idbGet(name)) ?? null,
  setItem: async (name, value) => { await idbSet(name, value); },
  removeItem: async (name) => { await idbDel(name); },
};

interface State {
  paperCredit: number;
  positions: Position[];
  history: Position[];
  comboWins: number;
  open: (args: { symbol: string; side: Side; leverage: number; margin: number; entry: number }) => Position | null;
  close: (id: string, price: number, reason?: "manual" | "liquidation") => Position | null;
  tick: (priceMap: Record<string, number>) => Position[]; // returns liquidated
  resetCredit: () => void;
}

export const usePaperStore = create<State>()(
  persist(
    (set, get) => ({
      paperCredit: STARTING_CREDIT,
      positions: [],
      history: [],
      comboWins: 0,
      open: ({ symbol, side, leverage, margin, entry }) => {
        if (margin <= 0 || margin > get().paperCredit) return null;
        if (leverage < 1 || leverage > 100) return null;
        if (entry <= 0) return null;
        const pos: Position = {
          id: newId(),
          symbol, side, leverage, margin, entry,
          openedAt: Date.now(),
        };
        set((s) => ({ paperCredit: s.paperCredit - margin, positions: [...s.positions, pos] }));
        return pos;
      },
      close: (id, price, reason = "manual") => {
        const pos = get().positions.find((p) => p.id === id);
        if (!pos) return null;
        const pnl = computePnl(pos, price);
        const roi = computeRoi(pos, price);
        const closedPos: Position = {
          ...pos,
          closed: { price, at: Date.now(), pnl, roi, reason },
        };
        set((s) => ({
          paperCredit: s.paperCredit + pos.margin + pnl,
          positions: s.positions.filter((p) => p.id !== id),
          history: [closedPos, ...s.history].slice(0, 500),
          comboWins: pnl > 0 ? s.comboWins + 1 : 0,
        }));
        return closedPos;
      },
      tick: (priceMap) => {
        const liquidated: Position[] = [];
        const { positions } = get();
        for (const p of positions) {
          const price = priceMap[p.symbol];
          if (!price) continue;
          if (isLiquidated(p, price)) {
            const closed = get().close(p.id, price, "liquidation");
            if (closed) liquidated.push(closed);
          }
        }
        return liquidated;
      },
      resetCredit: () => set({ paperCredit: STARTING_CREDIT, positions: [], history: [], comboWins: 0 }),
    }),
    {
      name: "phonara_paper_v1",
      storage: createJSONStorage(() => idbStorage),
      partialize: (s) => ({
        paperCredit: s.paperCredit,
        positions: s.positions,
        history: s.history,
        comboWins: s.comboWins,
      }),
    },
  ),
);
