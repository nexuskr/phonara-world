import { TrendingUp, TrendingDown } from "lucide-react";
import { useSymbolSideCounts } from "@/hooks/use-hot-symbols";

interface Props {
  symbol: string;
}

/**
 * LiveSideCounter — 현재 종목의 롱/숏 인원 실시간 표시.
 */
export default function LiveSideCounter({ symbol }: Props) {
  const { longs, shorts } = useSymbolSideCounts(symbol);
  const total = longs + shorts;

  if (total === 0) {
    return (
      <div className="rounded-2xl border border-border/40 bg-card/40 px-3 py-2 text-[11px] text-muted-foreground">
        폐하가 이 코인의 첫 황제가 되실 수 있습니다 · {symbol.replace(/USDT$/, "")}
      </div>
    );
  }

  const longPct = Math.round((longs / total) * 100);
  const shortPct = 100 - longPct;
  const longLead = longs >= shorts;
  const base = symbol.replace(/USDT$/, "");

  return (
    <div className="rounded-2xl border border-border/40 bg-card/40 px-3 py-2.5">
      <div className="flex items-center justify-between gap-2 text-[11px] font-bold mb-1.5">
        <span className={`inline-flex items-center gap-1 ${longLead ? "text-emerald-300" : "text-muted-foreground"}`}>
          <TrendingUp className="w-3 h-3" /> {base} 롱 {longs}명
        </span>
        <span className={`inline-flex items-center gap-1 ${!longLead ? "text-rose-300" : "text-muted-foreground"}`}>
          숏 {shorts}명 <TrendingDown className="w-3 h-3" />
        </span>
      </div>
      <div className="h-2 rounded-full overflow-hidden flex bg-muted/30">
        <div
          className="bg-gradient-to-r from-emerald-500 to-emerald-300 transition-[width] duration-700"
          style={{ width: `${longPct}%` }}
        />
        <div
          className="bg-gradient-to-l from-rose-500 to-rose-300 transition-[width] duration-700"
          style={{ width: `${shortPct}%` }}
        />
      </div>
      <div className="mt-1.5 text-[11px] text-muted-foreground text-center">
        지금 <span className="text-foreground font-black">{total}명</span>의 황제가 {base}에 진입 중 ·
        {longLead ? " 롱 우세" : " 숏 우세"} <span className="text-amber-300 font-black tabular-nums">{Math.max(longPct, shortPct)}%</span>
      </div>
    </div>
  );
}
