/**
 * PhonPositionsList — PHON 열린 포지션 + 1탭 청산.
 * priceStore 의 mark 가격으로 PnL% 계산 후 close_position_phon 호출.
 */
import { useSyncExternalStore } from "react";
import { TrendingUp, TrendingDown, X } from "lucide-react";
import { useMyPhonOpenPositions } from "@/hooks/use-my-phon-open-positions";
import { useClosePhonPosition } from "@/hooks/use-close-phon-position";
import { priceStore } from "@/lib/trading/priceStore";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingList } from "@/components/ui/loading-state";

function usePrices() {
  return useSyncExternalStore(priceStore.subscribe, priceStore.getSnapshot, priceStore.getSnapshot);
}

export default function PhonPositionsList() {
  const { rows, loading } = useMyPhonOpenPositions();
  const { close, busy } = useClosePhonPosition();
  const { prices } = usePrices();

  if (loading) {
    return (
      <div className="rounded-2xl border border-border/30 bg-card/40 p-3">
        <LoadingList rows={2} />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        title="아직 열린 PHON 포지션이 없어요"
        description="위에서 PHON 으로 LONG · SHORT 를 눌러 시작해 보세요"
      />
    );
  }

  return (
    <div className="space-y-2">
      {rows.map((p) => {
        const mark = prices[p.symbol] ?? p.entry;
        const dir = p.side === "long" ? 1 : -1;
        const pnlPct = ((mark - p.entry) / p.entry) * dir * 100;
        const pnlPhon = (pnlPct / 100) * p.margin * p.leverage;
        const positive = pnlPct >= 0;
        return (
          <div
            key={p.id}
            className={[
              "rounded-2xl border p-3 flex items-center gap-3",
              positive
                ? "border-emerald-400/30 bg-emerald-500/5"
                : "border-rose-400/30 bg-rose-500/5",
            ].join(" ")}
          >
            <div className={[
              "w-9 h-9 rounded-lg flex items-center justify-center text-white shrink-0",
              p.side === "long" ? "bg-emerald-500" : "bg-rose-500",
            ].join(" ")}>
              {p.side === "long" ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-imperial text-sm">{p.symbol}</span>
                <span className="text-[10px] font-black tracking-wide text-muted-foreground">{p.leverage}x</span>
                <span className="text-[10px] text-amber-300">PHON</span>
              </div>
              <div className="text-[11px] text-muted-foreground tabular-nums">
                {Math.floor(p.margin).toLocaleString("ko-KR")} P · 진입 {Number(p.entry).toFixed(4)}
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className={[
                "font-black tabular-nums text-sm",
                positive ? "text-emerald-300" : "text-rose-300",
              ].join(" ")}>
                {positive ? "+" : ""}{Math.floor(pnlPhon).toLocaleString("ko-KR")} P
              </div>
              <div className={[
                "text-[10px] tabular-nums",
                positive ? "text-emerald-400/80" : "text-rose-400/80",
              ].join(" ")}>
                {positive ? "+" : ""}{pnlPct.toFixed(2)}%
              </div>
            </div>
            <button
              type="button"
              onClick={() => close(p.id, pnlPct)}
              disabled={busy}
              className="shrink-0 min-h-11 min-w-11 rounded-xl bg-card border border-border/60 hover:border-rose-400/60 flex items-center justify-center press disabled:opacity-50"
              aria-label="청산"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
