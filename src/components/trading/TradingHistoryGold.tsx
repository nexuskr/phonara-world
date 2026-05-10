import { Flame, Trophy, Skull } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import type { LiveTrade } from "@/lib/trading/types";

export default function TradingHistoryGold({ history, unit = "USDT" }: { history: LiveTrade[]; unit?: "USDT" | "KRW" }) {
  const fmt = (n: number) => unit === "KRW"
    ? `${n < 0 ? "-" : ""}₩${Math.abs(Math.floor(n)).toLocaleString()}`
    : `${n.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDT`;
  if (!history.length) {
    return (
      <EmptyState
        icon={<Trophy className="w-5 h-5" />}
        variant="muted"
        size="sm"
        title="거래 내역 없음"
        description="첫 청산 결과가 여기에 골드로 새겨집니다."
      />
    );
  }

  return (
    <div className="space-y-2">
      {history.map((t) => {
        const big = t.pnl >= 1000 || t.roi >= 5;
        const liq = t.reason === "liquidation";
        const pos = t.pnl >= 0;
        return (
          <div
            key={t.id}
            className={`relative rounded-2xl border p-3 grid grid-cols-2 sm:grid-cols-7 gap-2 items-center text-xs ${
              liq ? "border-red-500/60 bg-red-500/5"
                : big ? "border-amber-300/70 bg-gradient-to-r from-amber-500/10 via-amber-300/5 to-amber-500/10 shadow-[0_0_30px_rgba(244,180,55,0.25)]"
                : "border-border/50 bg-background/40"
            }`}
          >
            {big && !liq && <Flame className="absolute -top-2 -right-2 w-5 h-5 text-amber-400 animate-pulse" />}
            {liq && <Skull className="absolute -top-2 -right-2 w-5 h-5 text-red-400" />}

            <div className="font-black">{t.symbol}</div>
            <div className={`font-black ${t.side === "long" ? "text-emerald-400" : "text-rose-400"}`}>
              {t.side.toUpperCase()} {t.leverage}×
            </div>
            <div className="text-muted-foreground">
              <span className="block text-[10px]">진입</span>
              <span className="font-mono tabular-nums text-foreground">{Number(t.entry).toFixed(4)}</span>
            </div>
            <div className="text-muted-foreground">
              <span className="block text-[10px]">청산</span>
              <span className="font-mono tabular-nums text-foreground">{Number(t.close_price).toFixed(4)}</span>
            </div>
            <div className={`font-mono tabular-nums font-black ${pos ? "text-emerald-400" : "text-rose-400"}`}>
              {pos ? "+" : ""}{fmt(t.pnl)}
            </div>
            <div className={`font-mono tabular-nums ${pos ? "text-emerald-400" : "text-rose-400"}`}>
              {(Number(t.roi) * 100).toFixed(1)}%
            </div>
            <div className="text-[10px] text-muted-foreground text-right">
              {liq ? <span className="text-red-400 font-black">LIQUIDATED</span> : new Date(t.closed_at).toLocaleString()}
            </div>
          </div>
        );
      })}
    </div>
  );
}
