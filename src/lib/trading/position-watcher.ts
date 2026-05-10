/**
 * Client-side absolute-price SL/TP/Trailing watcher (Real Mode).
 *
 * Complements `usePositionTriggerWatcher` (ROI%-based, Paper+Real) by handling
 * the new absolute-price triggers (`tp_price`, `sl_price`, `trailing_offset`,
 * `trailing_peak`) added in the 2026-05 migration.
 *
 * Polls ~1Hz via requestAnimationFrame and uses live mark prices from the
 * shared Bybit WebSocket stream (no REST polling). Server-side enforce-position-triggers
 * handles the same logic on a 30s cron — both sides are idempotent because
 * `admin_force_close_position` raises `position not found` on closed rows.
 */
import { useEffect, useRef } from "react";
import { useRealStore } from "@/lib/trading/real-store";
import { getFeed } from "@/lib/paper-trading/bybit-feed";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notify";
import type { LivePosition } from "@/lib/trading/types";

interface Args {
  enabled: boolean;
  userId: string | undefined;
  /** Threshold below which a Cross-mode toast warning fires (default 1%). */
  crossWarnRatio?: number;
}

const TICK_MS = 1000;
const EQUITY_CACHE_MS = 5000;

function shouldClose(p: LivePosition, mark: number): "tp" | "sl" | "trailing" | null {
  if (p.tp_price && p.tp_price > 0) {
    if ((p.side === "long" && mark >= p.tp_price) || (p.side === "short" && mark <= p.tp_price)) return "tp";
  }
  if (p.sl_price && p.sl_price > 0) {
    if ((p.side === "long" && mark <= p.sl_price) || (p.side === "short" && mark >= p.sl_price)) return "sl";
  }
  if (p.trailing_active && p.trailing_offset && p.trailing_offset > 0) {
    const peak = p.trailing_peak ?? mark;
    const drop = p.side === "long" ? peak - mark : mark - peak;
    if (drop >= p.trailing_offset) return "trailing";
  }
  return null;
}

export function usePositionWatcher({ enabled, userId, crossWarnRatio = 0.01 }: Args) {
  const close = useRealStore((s) => s.close);
  const positions = useRealStore((s) => s.positions);
  const closingRef = useRef<Set<string>>(new Set());
  const lastEquityCheckRef = useRef<number>(0);
  const equityWarnedRef = useRef<boolean>(false);

  useEffect(() => {
    if (!enabled || !userId) return;
    let raf = 0;
    let last = 0;

    const tick = async (ts: number) => {
      raf = requestAnimationFrame(tick);
      if (ts - last < TICK_MS) return;
      last = ts;

      const prices = getFeed().getPrices();
      const list = useRealStore.getState().positions;
      for (const p of list) {
        if (closingRef.current.has(p.id)) continue;
        const mark = prices[p.symbol];
        if (!mark || mark <= 0) continue;
        const reason = shouldClose(p, mark);
        if (!reason) continue;
        closingRef.current.add(p.id);
        try {
          await close(p.id, mark);
        } catch {
          /* server may have already closed */
        }
      }

      // Cross-mode equity warning (toast once per threshold breach).
      const hasCross = list.some((p) => p.margin_mode === "cross");
      if (hasCross && ts - lastEquityCheckRef.current > EQUITY_CACHE_MS) {
        lastEquityCheckRef.current = ts;
        try {
          const { data } = await supabase.rpc("live_account_equity", { p_user_id: userId } as never);
          const eq = data as { equity?: number; initial_margin_open?: number } | null;
          if (eq && eq.initial_margin_open && eq.initial_margin_open > 0 && typeof eq.equity === "number") {
            // Add live unrealized PnL.
            let liveUnrealized = 0;
            for (const p of list) {
              const m = prices[p.symbol];
              if (!m) continue;
              const dir = p.side === "long" ? 1 : -1;
              liveUnrealized += (m - p.entry) * Number(p.size) * dir;
            }
            const liveEquity = Number(eq.equity) + liveUnrealized;
            const ratio = liveEquity / Number(eq.initial_margin_open);
            if (ratio < crossWarnRatio && !equityWarnedRef.current) {
              equityWarnedRef.current = true;
              notify.error("Cross 유지증거금 임박", {
                description: "계좌 equity가 임계값 근처입니다. 일부 Cross 포지션이 강제 청산될 수 있습니다.",
              });
            } else if (ratio >= crossWarnRatio * 2) {
              equityWarnedRef.current = false;
            }
          }
        } catch {
          /* ignore */
        }
      }
    };

    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      closingRef.current.clear();
    };
  }, [enabled, userId, close, crossWarnRatio]);

  // Reset closing lock when a position id leaves the open list (closed by server / by us).
  useEffect(() => {
    const ids = new Set(positions.map((p) => p.id));
    for (const id of closingRef.current) {
      if (!ids.has(id)) closingRef.current.delete(id);
    }
  }, [positions]);
}
