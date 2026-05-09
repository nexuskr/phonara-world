import { Sparkles, ArrowRight } from "lucide-react";
import type { PrefilledOrder } from "./LongShortTradingPanel";

const DECISIONS: Array<{ id: string; title: string; reason: string; order: PrefilledOrder }> = [
  { id: "btc-momentum",
    title: "BTC 단기 모멘텀",
    reason: "최근 4h EMA 정배열 · 변동성 확장",
    order: { symbol: "BTCUSDT", side: "long", leverage: 10 } },
  { id: "alt-momentum",
    title: "알트 모멘텀 (SOL)",
    reason: "거래량 증가 · 단기 추세 확인",
    order: { symbol: "SOLUSDT", side: "long", leverage: 15 } },
  { id: "hedge",
    title: "ETH 헷지 (Short)",
    reason: "단기 과열 · 평균회귀 시도",
    order: { symbol: "ETHUSDT", side: "short", leverage: 5 } },
];

export default function DecisionCoreCard({ onPick }: { onPick: (o: PrefilledOrder) => void }) {
  return (
    <section className="glass rounded-3xl border border-primary/20 p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-primary" />
        <h2 className="font-display font-bold text-base">오늘의 AI 결정 코어</h2>
        <span className="ml-auto text-[10px] tracking-widest text-muted-foreground">RULE-BASED v1</span>
      </div>
      <div className="grid sm:grid-cols-3 gap-2">
        {DECISIONS.map((d) => (
          <button
            key={d.id}
            onClick={() => onPick(d.order)}
            className="text-left rounded-2xl border border-border/40 bg-background/40 p-3 hover:border-primary/40 transition press"
          >
            <div className="text-sm font-bold">{d.title}</div>
            <div className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{d.reason}</div>
            <div className="mt-2 flex items-center justify-between text-[11px]">
              <span className={`font-bold ${d.order.side === "long" ? "text-emerald-400" : "text-rose-400"}`}>
                {d.order.side?.toUpperCase()} {d.order.leverage}× · {d.order.symbol}
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-primary" />
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
