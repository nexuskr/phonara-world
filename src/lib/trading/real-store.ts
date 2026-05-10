import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";
import type { LivePosition, LiveTrade, Side } from "./types";

interface State {
  positions: LivePosition[];
  history: LiveTrade[];
  comboWins: number;
  loaded: boolean;
  loading: boolean;
  load: () => Promise<void>;
  open: (args: { symbol: string; side: Side; leverage: number; margin: number; mark: number; tpPct?: number; slPct?: number; trailingPct?: number }) => Promise<{ id: string } | { error: string }>;
  setTriggers: (id: string, t: { tpPct?: number; slPct?: number; trailingPct?: number }) => Promise<{ ok: true } | { error: string }>;
  close: (id: string, mark: number) => Promise<{ pnl: number; roi: number; credit: number; exit: number } | { error: string }>;
  liquidate: (id: string, mark: number) => Promise<{ liquidated: true; margin_lost: number } | { error: string }>;
  subscribe: (userId: string) => () => void;
}

export const useRealStore = create<State>()((set, get) => ({
  positions: [],
  history: [],
  comboWins: 0,
  loaded: false,
  loading: false,

  async load() {
    set({ loading: true });
    const [p, h] = await Promise.all([
      supabase.rpc("live_get_open_positions"),
      supabase.rpc("live_get_history", { p_limit: 50 }),
    ]);
    set({
      positions: (p.data ?? []) as LivePosition[],
      history: (h.data ?? []) as LiveTrade[],
      loaded: true,
      loading: false,
    });
  },

  async open({ symbol, side, leverage, margin, mark, tpPct, slPct, trailingPct }) {
    const { data, error } = await supabase.rpc("live_open_position", {
      p_symbol: symbol, p_side: side, p_leverage: leverage,
      p_margin: margin, p_mark_price: mark,
      p_tp_pct: tpPct ?? null, p_sl_pct: slPct ?? null, p_trailing_pct: trailingPct ?? null,
    });
    if (error) return { error: error.message };
    await get().load();
    return { id: data as string };
  },

  async setTriggers(id, { tpPct, slPct, trailingPct }) {
    const { error } = await supabase.rpc("live_set_position_triggers", {
      p_position_id: id,
      p_tp_pct: tpPct ?? null,
      p_sl_pct: slPct ?? null,
      p_trailing_pct: trailingPct ?? null,
    });
    if (error) return { error: error.message };
    await get().load();
    return { ok: true };
  },

  async close(id, mark) {
    const { data, error } = await supabase.rpc("live_close_position", {
      p_position_id: id, p_mark_price: mark,
    });
    if (error) return { error: error.message };
    const r = data as { pnl: number; roi: number; credit: number; exit: number };
    set((s) => ({ comboWins: r.pnl > 0 ? s.comboWins + 1 : 0 }));
    await get().load();
    return r;
  },

  async liquidate(id, mark) {
    const { data, error } = await supabase.rpc("live_liquidate_position", {
      p_position_id: id, p_mark_price: mark,
    });
    if (error) return { error: error.message };
    set({ comboWins: 0 });
    await get().load();
    return data as { liquidated: true; margin_lost: number };
  },

  subscribe(userId) {
    const ch = supabase.channel(`live:${userId}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "live_positions", filter: `user_id=eq.${userId}` },
        () => { get().load(); })
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "live_trade_history", filter: `user_id=eq.${userId}` },
        () => { get().load(); })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  },
}));
