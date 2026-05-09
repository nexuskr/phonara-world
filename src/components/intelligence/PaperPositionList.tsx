import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { usePaperStore } from "@/lib/paper-trading/store";
import { computePnl, computeRoi } from "@/lib/paper-trading/engine";
import { useBybitTicker } from "@/hooks/use-bybit-ticker";
import { notify } from "@/lib/notify";
import { track } from "@/lib/telemetry";
import { Activity, X } from "lucide-react";
import { celebrateWin, levelFromPnl, playLossThud } from "@/lib/paper-trading/celebrate";
import { pushWinMoment } from "./WinMomentOverlay";

export default function PaperPositionList() {
  const { prices } = useBybitTicker();
  const positions = usePaperStore((s) => s.positions);
  const close = usePaperStore((s) => s.close);

  const closeAll = () => {
    if (!positions.length) return;
    let totalPnl = 0;
    for (const p of [...positions]) {
      const price = prices[p.symbol] ?? p.entry;
      const closed = close(p.id, price, "manual");
      if (closed?.closed) totalPnl += closed.closed.pnl;
    }
    if (totalPnl > 0) celebrateWin(levelFromPnl(totalPnl));
    else if (totalPnl < 0) playLossThud();
    notify.message(`전체 청산 완료: ${totalPnl >= 0 ? "+" : ""}${totalPnl.toFixed(2)} USDT`);
    track("cta_click", { surface: "paper_trade", variant: "close_all", meta: { pnl: totalPnl } });
  };

  if (!positions.length) {
    return (
      <EmptyState
        icon={<Activity className="w-5 h-5" />}
        variant="muted"
        size="sm"
        title="열린 포지션이 없습니다"
        description="위에서 Long 또는 Short을 눌러 첫 트레이드를 시작하세요."
      />
    );
  }

  return (
    <div className="space-y-2">
      {positions.map((p) => {
        const price = prices[p.symbol] ?? p.entry;
        const pnl = computePnl(p, price);
        const roi = computeRoi(p, price) * 100;
        const positive = pnl >= 0;
        return (
          <div key={p.id} className="glass rounded-2xl border border-border/50 p-3 sm:p-4 grid grid-cols-2 sm:grid-cols-6 gap-2 items-center">
            <div className="text-sm font-bold">{p.symbol}</div>
            <div className={`text-xs font-bold ${p.side === "long" ? "text-emerald-400" : "text-rose-400"}`}>
              {p.side.toUpperCase()} {p.leverage}×
            </div>
            <div className="text-xs text-muted-foreground">
              <span className="block">진입</span>
              <span className="font-mono tabular-nums text-foreground">{p.entry.toFixed(2)}</span>
            </div>
            <div className="text-xs text-muted-foreground">
              <span className="block">현재가</span>
              <span className="font-mono tabular-nums text-foreground animate-pulse">{price.toFixed(2)}</span>
            </div>
            <div className={`text-sm font-mono tabular-nums font-bold ${positive ? "text-emerald-400" : "text-rose-400"}`}>
              {positive ? "+" : ""}{pnl.toFixed(2)}
              <span className="block text-[10px]">{roi.toFixed(1)}%</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const closed = close(p.id, price, "manual");
                if (closed) {
                  const cp = closed.closed!;
                  if (cp.pnl > 0) {
                    const lvl = levelFromPnl(cp.pnl);
                    celebrateWin(lvl);
                    pushWinMoment({
                      id: closed.id, pnl: cp.pnl, roi: cp.roi,
                      symbol: p.symbol, side: p.side, leverage: p.leverage, level: lvl,
                    });
                    notify.success(`익절: +${cp.pnl.toFixed(2)} USDT`, { description: `${p.symbol} ${(cp.roi * 100).toFixed(1)}%` });
                  } else {
                    playLossThud();
                    notify.message(`청산 완료: ${cp.pnl.toFixed(2)} USDT`);
                  }
                  track("convert", {
                    surface: "paper_trade",
                    variant: "manual",
                    meta: { symbol: p.symbol, side: p.side, leverage: p.leverage, margin: p.margin, pnl: cp.pnl, roi: cp.roi },
                  });
                }
              }}
            >
              청산
            </Button>
          </div>
        );
      })}
    </div>
  );
}
