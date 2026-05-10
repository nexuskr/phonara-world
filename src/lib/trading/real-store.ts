import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notify";
import type { LivePosition, LiveTrade, MarginMode, Side } from "./types";

function reasonLabel(reason: string): { title: string; variant: "success" | "error" | "info" } {
  switch (reason) {
    case "tp": return { title: "익절(TP) 자동 청산", variant: "success" };
    case "sl": return { title: "손절(SL) 자동 청산", variant: "error" };
    case "trailing": return { title: "트레일링 스탑 자동 청산", variant: "info" };
    case "liquidation": return { title: "강제 청산 (Liquidation)", variant: "error" };
    case "manual": return { title: "포지션 청산 완료", variant: "info" };
    default: return { title: `포지션 청산 (${reason})`, variant: "info" };
  }
}

function notifyHistoryRow(row: any) {
  if (!row) return;
  const { title, variant } = reasonLabel(String(row.reason ?? ""));
  const pnl = Number(row.pnl ?? 0);
  const roi = Number(row.roi ?? 0) * 100;
  const sign = pnl >= 0 ? "+" : "";
  const desc = `${row.symbol} ${String(row.side ?? "").toUpperCase()} ${row.leverage}× · PnL ${sign}${Math.round(pnl).toLocaleString()}원 (${sign}${roi.toFixed(2)}%)`;
  notify[variant](title, { description: desc });
}

export interface OpenArgs {
  symbol: string;
  side: Side;
  leverage: number;
  margin: number;
  mark: number;
  tpPct?: number;
  slPct?: number;
  trailingPct?: number;
  marginMode?: MarginMode;
  allocatedMargin?: number;
  tpPrice?: number;
  slPrice?: number;
  trailingOffset?: number;
}

export interface SetTriggersArgs {
  tpPct?: number;
  slPct?: number;
  trailingPct?: number;
  tpPrice?: number;
  slPrice?: number;
  trailingOffset?: number;
}

interface State {
  positions: LivePosition[];
  history: LiveTrade[];
  comboWins: number;
  loaded: boolean;
  loading: boolean;
  load: () => Promise<void>;
  open: (args: OpenArgs) => Promise<{ id: string } | { error: string }>;
  setTriggers: (id: string, t: SetTriggersArgs) => Promise<{ ok: true } | { error: string }>;
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

  async open(args) {
    const { data, error } = await supabase.rpc("live_open_position", {
      p_symbol: args.symbol,
      p_side: args.side,
      p_leverage: args.leverage,
      p_margin: args.margin,
      p_mark_price: args.mark,
      p_tp_pct: args.tpPct ?? null,
      p_sl_pct: args.slPct ?? null,
      p_trailing_pct: args.trailingPct ?? null,
      p_margin_mode: args.marginMode ?? "isolated",
      p_allocated_margin: args.allocatedMargin ?? null,
      p_tp_price: args.tpPrice ?? null,
      p_sl_price: args.slPrice ?? null,
      p_trailing_offset: args.trailingOffset ?? null,
    } as never);
    if (error) return { error: error.message };
    await get().load();
    return { id: data as string };
  },

  async setTriggers(id, t) {
    const { error } = await supabase.rpc("live_set_position_triggers", {
      p_position_id: id,
      p_tp_pct: t.tpPct ?? null,
      p_sl_pct: t.slPct ?? null,
      p_trailing_pct: t.trailingPct ?? null,
      p_tp_price: t.tpPrice ?? null,
      p_sl_price: t.slPrice ?? null,
      p_trailing_offset: t.trailingOffset ?? null,
    } as never);
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
        (payload) => {
          notifyHistoryRow(payload.new);
          get().load();
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  },
}));
