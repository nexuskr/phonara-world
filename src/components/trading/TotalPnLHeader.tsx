import { memo, useMemo } from "react";
import { TrendingUp, TrendingDown, Activity } from "lucide-react";
import type { LivePosition } from "@/lib/trading/types";
import { computePnl } from "@/lib/trading/engine";
import { KRW_PER_USDT, type Unit } from "@/lib/trading/currency";

interface Props {
  positions: LivePosition[];
  prices: Record<string, number>;
  unit: Unit;
}

/**
 * Real-time Total Unrealized PnL header — USDT + KRW dual display.
 * Color: emerald for positive, rose for negative.
 */
function TotalPnLHeaderImpl({ positions, prices, unit }: Props) {
  const { pnlUSDT, totalMargin, hasCross, equityUSDT, mmrPct } = useMemo(() => {
    let pnl = 0;
    let mg = 0;
    let crossInitial = 0;
    let crossUnrealized = 0;
    let cross = false;
    for (const p of positions) {
      const mark = prices[p.symbol] ?? p.entry;
      const ppnl = computePnl(p.side, p.entry, mark, p.size);
      pnl += ppnl;
      mg += p.margin;
      if (p.margin_mode === "cross") {
        cross = true;
        crossInitial += p.margin;
        crossUnrealized += ppnl;
      }
    }
    const pnlU = unit === "KRW" ? pnl / KRW_PER_USDT : pnl;
    const crossInitialU = unit === "KRW" ? crossInitial / KRW_PER_USDT : crossInitial;
    const crossUnrealU = unit === "KRW" ? crossUnrealized / KRW_PER_USDT : crossUnrealized;
    const eq = crossInitialU + crossUnrealU;
    const mmr = crossInitialU > 0 ? (eq / crossInitialU) * 100 : 0;
    return { pnlUSDT: pnlU, totalMargin: mg, hasCross: cross, equityUSDT: eq, mmrPct: mmr };
  }, [positions, prices, unit]);

  const pnlKRW = pnlUSDT * KRW_PER_USDT;
  const pct = totalMargin > 0 ? (pnlUSDT / (unit === "KRW" ? totalMargin / KRW_PER_USDT : totalMargin)) * 100 : 0;
  const positive = pnlUSDT >= 0;
  const has = positions.length > 0;

  return (
    <section
      className={`relative overflow-hidden rounded-3xl border p-4 sm:p-5 transition ${
        !has
          ? "border-border/40 bg-background/40"
          : positive
            ? "border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 via-background/40 to-background/40 shadow-[0_0_60px_rgba(52,211,153,0.18)]"
            : "border-rose-500/40 bg-gradient-to-br from-rose-500/10 via-background/40 to-background/40 shadow-[0_0_60px_rgba(244,63,94,0.18)]"
      }`}
      aria-label="Total unrealized PnL"
    >
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Activity className={`w-4 h-4 ${positive ? "text-emerald-300" : "text-rose-300"}`} />
          <span className="text-[11px] uppercase tracking-[0.18em] font-black text-muted-foreground">
            Unrealized PnL
          </span>
          {has && (
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-background/60 border border-border/50">
              {positions.length} open
            </span>
          )}
        </div>
        <div className="text-[10px] text-muted-foreground/80">실시간 · ≈ ₩{KRW_PER_USDT.toLocaleString()}/USDT</div>
      </div>

      <div className="mt-2 flex items-end flex-wrap gap-x-6 gap-y-1">
        <div
          className={`font-display font-black text-3xl sm:text-4xl tabular-nums tracking-tight ${
            positive ? "text-emerald-300" : "text-rose-300"
          }`}
        >
          {positive ? "+" : ""}{pnlUSDT.toFixed(2)} <span className="text-base font-bold opacity-70">USDT</span>
        </div>
        <div className={`text-base sm:text-lg font-mono tabular-nums font-black ${positive ? "text-emerald-400" : "text-rose-400"}`}>
          ≈ {pnlKRW < 0 ? "-" : positive && pnlKRW > 0 ? "+" : ""}₩{Math.abs(Math.floor(pnlKRW)).toLocaleString()}
        </div>
        {has && (
          <div className={`inline-flex items-center gap-1 text-sm font-black ${positive ? "text-emerald-400" : "text-rose-400"}`}>
            {positive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            {positive ? "+" : ""}{pct.toFixed(2)}%
          </div>
        )}
      </div>
      {hasCross && (
        <div className="mt-2 flex items-center justify-end gap-3 text-[11px] font-mono tabular-nums text-muted-foreground border-t border-border/40 pt-2">
          <span>
            <span className="opacity-70 mr-1">Equity</span>
            <span className="text-foreground font-bold">{equityUSDT.toFixed(2)} {unit}</span>
          </span>
          <span className="opacity-40">·</span>
          <span>
            <span className="opacity-70 mr-1">Maint. Margin</span>
            <span className={`font-bold ${mmrPct < 50 ? "text-rose-400" : mmrPct < 100 ? "text-amber-300" : "text-emerald-300"}`}>
              {mmrPct.toFixed(1)}%
            </span>
          </span>
        </div>
      )}
    </section>
  );
}

export default memo(TotalPnLHeaderImpl);
