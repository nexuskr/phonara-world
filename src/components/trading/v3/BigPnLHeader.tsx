import { useMemo } from "react";
import { TrendingUp, TrendingDown, Activity } from "lucide-react";
import type { LivePosition } from "@/lib/trading/types";

interface Props {
  positions: LivePosition[];
  prices: Record<string, number>;
  unit: "USDT" | "KRW";
}

/**
 * BigPnLHeader — 트레이딩 페이지 상단 거대 미실현 PnL 표시.
 * 사이드 효과 없음 — 순수 표시용.
 */
export default function BigPnLHeader({ positions, prices, unit }: Props) {
  const { pnl, count } = useMemo(() => {
    let total = 0;
    for (const p of positions) {
      const mark = prices[p.symbol] ?? p.entry;
      if (!mark || !p.entry) continue;
      const dir = p.side === "long" ? 1 : -1;
      total += dir * (mark - Number(p.entry)) * Number(p.size);
    }
    return { pnl: total, count: positions.length };
  }, [positions, prices]);

  const positive = pnl >= 0;
  const fmt = unit === "KRW" ? Math.round(pnl).toLocaleString("ko-KR") : pnl.toFixed(2);

  if (count === 0) {
    return (
      <div className="rounded-2xl border border-border/40 bg-gradient-to-br from-card/60 to-card/30 px-4 py-3 flex items-center gap-3">
        <Activity className="w-5 h-5 text-muted-foreground" />
        <div className="flex-1">
          <div className="text-[11px] font-bold tracking-[0.18em] text-muted-foreground">현재 손익</div>
          <div className="text-sm text-muted-foreground/80 mt-0.5">
            폐하, 아직 열린 포지션이 없습니다 · 오늘의 첫 베팅을 시작해 보세요
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={[
        "rounded-2xl border px-4 py-3 sm:py-4 transition-colors",
        positive
          ? "border-emerald-400/40 bg-gradient-to-br from-emerald-500/15 to-emerald-500/5"
          : "border-rose-400/40 bg-gradient-to-br from-rose-500/15 to-rose-500/5",
      ].join(" ")}
      aria-live="polite"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-bold tracking-[0.18em] text-muted-foreground flex items-center gap-1.5">
            {positive ? <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> : <TrendingDown className="w-3.5 h-3.5 text-rose-400" />}
            현재 미실현 손익 · {count}건
          </div>
          <div
            className={[
              "mt-1 font-display font-black tabular-nums leading-none",
              "text-3xl sm:text-4xl md:text-5xl",
              positive ? "text-emerald-300" : "text-rose-300",
            ].join(" ")}
          >
            {positive ? "+" : ""}{fmt} <span className="text-base sm:text-lg font-bold opacity-70">{unit}</span>
          </div>
        </div>
      </div>
      <div className="mt-1.5 text-[11px] text-muted-foreground/90">
        {positive
          ? "폐하, 흐름이 좋습니다 · 익절 타이밍도 함께 보세요"
          : "폐하, 감정적 추격은 금물입니다 · 스탑로스를 확인하세요"}
      </div>
    </div>
  );
}
