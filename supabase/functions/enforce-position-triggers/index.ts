// Server-side TP/SL/Trailing-Stop watcher for live_positions.
// Runs on a schedule (cron) — does not require user JWT (uses service-role key).
// For every open position with TP/SL/Trailing set (ROI% or absolute price),
// fetches Bybit prices and force-closes via admin_force_close_position.
// Also performs Cross-mode maintenance margin check per user.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

function isAuthorizedCron(req: Request): boolean {
  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  if (!token) return false;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (service && token.length === service.length && timingSafeEqual(token, service)) return true;
  // Anon key fallback REMOVED: pg_cron jobs must now sign with the service-role key
  // (vault.decrypted_secrets.email_queue_service_role_key) to invoke this function.
  return false;
}

type Pos = {
  id: string;
  user_id: string;
  symbol: string;
  side: "long" | "short";
  leverage: number;
  margin: number;
  size: number;
  entry: number;
  tp_pct: number | null;
  sl_pct: number | null;
  trailing_pct: number | null;
  trailing_active: boolean;
  trailing_peak_roi_pct: number | null;
  margin_mode: "isolated" | "cross";
  allocated_margin: number | null;
  tp_price: number | null;
  sl_price: number | null;
  trailing_offset: number | null;
  trailing_peak: number | null;
};

async function fetchBybitPrices(symbols: string[]): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  try {
    const r = await fetch("https://api.bybit.com/v5/market/tickers?category=linear", {
      signal: AbortSignal.timeout(8000),
    });
    const j = await r.json();
    const list: any[] = j?.result?.list ?? [];
    const set = new Set(symbols);
    for (const t of list) {
      if (set.has(t.symbol)) {
        const p = parseFloat(t.lastPrice ?? t.markPrice ?? "0");
        if (p > 0) out[t.symbol] = p;
      }
    }
  } catch (e) {
    console.error("bybit fetch failed", e);
  }
  return out;
}

function roiPct(p: Pos, mark: number): number {
  if (p.entry <= 0 || p.leverage <= 0) return 0;
  const change = (mark - p.entry) / p.entry;
  return (p.side === "long" ? change : -change) * p.leverage * 100;
}

function unrealizedPnl(p: Pos, mark: number): number {
  const dir = p.side === "long" ? 1 : -1;
  return (mark - p.entry) * Number(p.size) * dir;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (!isAuthorizedCron(req)) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const thresholdRaw = Deno.env.get("MAINTENANCE_MARGIN_RATIO_THRESHOLD");
  const MMR_THRESHOLD = thresholdRaw && Number.isFinite(parseFloat(thresholdRaw))
    ? parseFloat(thresholdRaw)
    : 0.005;
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

  try {
    const { data, error } = await supabase
      .from("live_positions")
      .select(
        "id,user_id,symbol,side,leverage,margin,size,entry,tp_pct,sl_pct,trailing_pct,trailing_active,trailing_peak_roi_pct,margin_mode,allocated_margin,tp_price,sl_price,trailing_offset,trailing_peak",
      )
      .eq("status", "open")
      .limit(2000);
    if (error) throw error;

    const list = (data ?? []) as Pos[];
    if (list.length === 0) {
      return new Response(JSON.stringify({ scanned: 0, closed: 0, cross_liquidated: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const symbols = Array.from(new Set(list.map((p) => p.symbol)));
    const prices = await fetchBybitPrices(symbols);

    // Mirror Bybit prices into oracle_prices (server-trusted truth for safeguards)
    try {
      const rows = Object.entries(prices).map(([symbol, last_price]) => ({
        symbol, last_price, source: "bybit", updated_at: new Date().toISOString(),
      }));
      if (rows.length) await supabase.from("oracle_prices").upsert(rows, { onConflict: "symbol" });
    } catch (e) { console.error("oracle upsert failed", e); }

    let closed = 0;
    let trailingPeakUpdates = 0;
    const errors: string[] = [];
    const closedIds = new Set<string>();

    // ---------- Phase 1: per-position triggers (abs price > ROI%) ----------
    for (const p of list) {
      const mark = prices[p.symbol];
      if (!mark) continue;
      const roi = roiPct(p, mark);

      // Trailing peak tracking — favor absolute price when offset is set.
      let trailingHit = false;
      if (p.trailing_active) {
        if (p.trailing_offset && p.trailing_offset > 0) {
          // Absolute-price trailing: track best price in favor of position.
          const peak = p.trailing_peak ?? mark;
          const newPeak = p.side === "long" ? Math.max(peak, mark) : Math.min(peak, mark);
          if (newPeak !== peak || p.trailing_peak == null) {
            const { error: pErr } = await supabase.rpc("admin_update_trailing_price_peak", {
              p_position_id: p.id,
              p_peak_price: newPeak,
            });
            if (pErr) errors.push(`peakPx ${p.id}: ${pErr.message}`);
            else trailingPeakUpdates++;
          }
          const dropFromPeak = p.side === "long" ? newPeak - mark : mark - newPeak;
          if (dropFromPeak >= p.trailing_offset) trailingHit = true;
        } else if (p.trailing_pct && p.trailing_pct > 0) {
          const peak = p.trailing_peak_roi_pct ?? 0;
          if (roi > peak) {
            const { error: pErr } = await supabase.rpc("admin_update_trailing_peak", {
              p_position_id: p.id,
              p_peak_roi_pct: roi,
            });
            if (pErr) errors.push(`peak ${p.id}: ${pErr.message}`);
            else trailingPeakUpdates++;
          } else if (peak > 0 && roi <= peak - p.trailing_pct) {
            trailingHit = true;
          }
        }
      }

      let reason: "tp" | "sl" | "trailing" | null = null;

      // 1) Absolute-price TP/SL (highest priority when set).
      if (p.tp_price && p.tp_price > 0) {
        if ((p.side === "long" && mark >= p.tp_price) || (p.side === "short" && mark <= p.tp_price)) {
          reason = "tp";
        }
      }
      if (!reason && p.sl_price && p.sl_price > 0) {
        if ((p.side === "long" && mark <= p.sl_price) || (p.side === "short" && mark >= p.sl_price)) {
          reason = "sl";
        }
      }
      // 2) Trailing.
      if (!reason && trailingHit) reason = "trailing";
      // 3) ROI% fallback.
      if (!reason && p.tp_pct && p.tp_pct > 0 && roi >= p.tp_pct) reason = "tp";
      if (!reason && p.sl_pct && p.sl_pct > 0 && roi <= -p.sl_pct) reason = "sl";

      if (reason) {
        const { error: rpcErr } = await supabase.rpc("admin_force_close_position", {
          p_position_id: p.id,
          p_mark_price: mark,
          p_reason: reason,
          p_cross_equity: null,
        });
        if (rpcErr) errors.push(`${p.id}/${reason}: ${rpcErr.message}`);
        else { closed++; closedIds.add(p.id); }
      }
    }

    // ---------- Phase 2: Cross maintenance margin check per user ----------
    let crossLiquidated = 0;
    const crossUsers = new Set<string>(
      list.filter((p) => p.margin_mode === "cross" && !closedIds.has(p.id)).map((p) => p.user_id),
    );
    for (const uid of crossUsers) {
      const { data: eqRow, error: eqErr } = await supabase.rpc("live_account_equity", { p_user_id: uid });
      if (eqErr) { errors.push(`equity ${uid}: ${eqErr.message}`); continue; }
      const eq = eqRow as Record<string, number> | null;
      if (!eq) continue;
      // Compute live equity = base equity + Σ unrealized PnL of all open positions for this user.
      const userPositions = list.filter((p) => p.user_id === uid && !closedIds.has(p.id));
      let liveUnrealized = 0;
      for (const p of userPositions) {
        const m = prices[p.symbol];
        if (!m) continue;
        liveUnrealized += unrealizedPnl(p, m);
      }
      const baseEquity = Number(eq.equity ?? 0);
      const initialMarginOpen = Number(eq.initial_margin_open ?? 0);
      if (initialMarginOpen <= 0) continue;
      const liveEquity = baseEquity + liveUnrealized;
      const ratio = liveEquity / initialMarginOpen;
      if (ratio < MMR_THRESHOLD) {
        // Force-close largest unrealized loss Cross positions until ratio recovers (cap at 3 per cycle).
        const crossLosses = userPositions
          .filter((p) => p.margin_mode === "cross")
          .map((p) => ({ p, m: prices[p.symbol], pnl: prices[p.symbol] ? unrealizedPnl(p, prices[p.symbol]) : 0 }))
          .filter((x) => x.m && x.pnl < 0)
          .sort((a, b) => a.pnl - b.pnl);
        let toLiquidate = crossLosses.slice(0, 3);
        for (const x of toLiquidate) {
          const { error: rpcErr } = await supabase.rpc("admin_force_close_position", {
            p_position_id: x.p.id,
            p_mark_price: x.m,
            p_reason: "cross_maintenance",
            p_cross_equity: liveEquity,
          });
          if (rpcErr) errors.push(`xMM ${x.p.id}: ${rpcErr.message}`);
          else { crossLiquidated++; closedIds.add(x.p.id); }
        }
      }
    }

    return new Response(
      JSON.stringify({
        scanned: list.length,
        closed,
        cross_liquidated: crossLiquidated,
        trailing_peak_updates: trailingPeakUpdates,
        threshold: MMR_THRESHOLD,
        errors: errors.slice(0, 10),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
