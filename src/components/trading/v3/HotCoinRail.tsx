import { Flame } from "lucide-react";
import { useHotSymbols } from "@/hooks/use-hot-symbols";

interface Props {
  current: string;
  onPick: (symbol: string) => void;
}

/**
 * HotCoinRail — 지금 핫한 코인 Top 5. 클릭 시 차트 심볼 변경.
 */
export default function HotCoinRail({ current, onPick }: Props) {
  const rows = useHotSymbols(5);

  if (rows.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border/40 bg-card/40 px-3 py-2.5">
      <div className="flex items-center gap-1.5 px-1 mb-1.5">
        <Flame className="w-3.5 h-3.5 text-orange-400" />
        <span className="text-[11px] font-black tracking-[0.18em] text-muted-foreground">
          지금 황제들이 가장 많이 트레이딩 중
        </span>
      </div>
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1">
        {rows.map((r) => {
          const active = r.sym === current;
          const base = r.sym.replace(/USDT$/, "");
          return (
            <button
              key={r.sym}
              type="button"
              onClick={() => onPick(r.sym)}
              className={[
                "shrink-0 min-h-12 px-3 py-2 rounded-xl border text-left transition-colors press",
                active
                  ? "border-amber-300/70 bg-gradient-to-br from-amber-400/20 to-pink-500/20 text-foreground"
                  : "border-border/50 bg-card/60 hover:border-primary/40",
              ].join(" ")}
            >
              <div className="text-xs font-black tracking-wide flex items-center gap-1">
                {base}
                {r.open_positions >= 5 && <Flame className="w-3 h-3 text-orange-400" />}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5 tabular-nums">
                {r.open_positions}명 진입 중 · 24h {r.traders_24h}명
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
