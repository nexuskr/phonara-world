import { useMemo } from "react";
import { Activity, TrendingDown, TrendingUp } from "lucide-react";
import { usePaperStore } from "@/lib/paper-trading/store";
import { buildEquityCurve, computeRiskMetrics } from "@/lib/paper-trading/analytics";
import { EmptyState } from "@/components/ui/empty-state";

export default function EquityCurveCard() {
  const history = usePaperStore((s) => s.history);
  const paperCredit = usePaperStore((s) => s.paperCredit);

  const { points, metrics, path, areaPath, minE, maxE, last } = useMemo(() => {
    const points = buildEquityCurve(history);
    const metrics = computeRiskMetrics(history);
    if (points.length < 2) {
      return { points, metrics, path: "", areaPath: "", minE: 0, maxE: 0, last: paperCredit };
    }
    const W = 600, H = 160, P = 4;
    const minT = points[0].t;
    const maxT = points[points.length - 1].t || (minT + 1);
    const equities = points.map((p) => p.equity);
    const minE = Math.min(...equities);
    const maxE = Math.max(...equities);
    const range = Math.max(1, maxE - minE);
    const x = (t: number) => P + ((t - minT) / Math.max(1, maxT - minT)) * (W - P * 2);
    const y = (e: number) => H - P - ((e - minE) / range) * (H - P * 2);
    let path = `M ${x(points[0].t).toFixed(2)} ${y(points[0].equity).toFixed(2)}`;
    for (let i = 1; i < points.length; i++) {
      path += ` L ${x(points[i].t).toFixed(2)} ${y(points[i].equity).toFixed(2)}`;
    }
    const areaPath = `${path} L ${x(points[points.length - 1].t).toFixed(2)} ${H - P} L ${x(points[0].t).toFixed(2)} ${H - P} Z`;
    return { points, metrics, path, areaPath, minE, maxE, last: points[points.length - 1].equity };
  }, [history, paperCredit]);

  const positive = last >= 10_000;
  const change = last - 10_000;
  const changePct = (change / 10_000) * 100;

  return (
    <section className="glass-strong rounded-3xl border border-primary/20 p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="font-display font-bold text-lg flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          Equity Curve
        </h2>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">시작 10,000 →</span>
          <span className={`font-display font-black text-lg tabular-nums ${positive ? "text-emerald-400" : "text-rose-400"}`}>
            {last.toFixed(0)}
          </span>
          <span className={`flex items-center gap-0.5 font-bold ${positive ? "text-emerald-400" : "text-rose-400"}`}>
            {positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {change >= 0 ? "+" : ""}{changePct.toFixed(1)}%
          </span>
        </div>
      </div>

      {points.length < 2 ? (
        <EmptyState size="sm" variant="muted" title="아직 데이터가 없습니다" description="첫 트레이드 종료 시 곡선이 생성됩니다." />
      ) : (
        <div className="rounded-2xl border border-border/40 bg-background/40 p-3">
          <svg viewBox="0 0 600 160" className="w-full h-40" preserveAspectRatio="none">
            <defs>
              <linearGradient id="eqfill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.35" />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="eqstroke" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="hsl(var(--primary))" />
                <stop offset="100%" stopColor="hsl(var(--primary))" />
              </linearGradient>
            </defs>
            {/* baseline (10k) */}
            {(() => {
              const range = Math.max(1, maxE - minE);
              const yBase = 160 - 4 - ((10_000 - minE) / range) * (160 - 8);
              if (yBase < 0 || yBase > 160) return null;
              return <line x1="0" x2="600" y1={yBase} y2={yBase} stroke="hsl(var(--border))" strokeDasharray="4 4" strokeWidth="1" />;
            })()}
            <path d={areaPath} fill="url(#eqfill)" />
            <path d={path} fill="none" stroke="url(#eqstroke)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          </svg>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <Metric label="Peak" value={metrics.peak.toFixed(0)} />
        <Metric label="Max Drawdown" value={`-${metrics.maxDrawdown.toFixed(0)} (${metrics.maxDrawdownPct.toFixed(1)}%)`} negative />
        <Metric
          label="Profit Factor"
          value={metrics.profitFactor === Infinity ? "∞" : metrics.profitFactor.toFixed(2)}
          positive={metrics.profitFactor >= 1}
        />
        <Metric label="Best Streak" value={`${metrics.bestWinStreak} W`} positive={metrics.bestWinStreak > 0} />
      </div>

      <p className="text-[10px] text-muted-foreground/80">
        Paper Trading 시뮬레이션 결과 — 실제 자산과 무관합니다.
      </p>
    </section>
  );
}

function Metric({ label, value, positive, negative }: { label: string; value: string; positive?: boolean; negative?: boolean }) {
  return (
    <div className="rounded-xl border border-border/40 bg-background/40 p-3">
      <div className="text-[10px] text-muted-foreground tracking-wider">{label}</div>
      <div className={`mt-1 font-display font-black text-base tabular-nums ${
        negative ? "text-rose-400" : positive ? "text-emerald-400" : ""
      }`}>
        {value}
      </div>
    </div>
  );
}
