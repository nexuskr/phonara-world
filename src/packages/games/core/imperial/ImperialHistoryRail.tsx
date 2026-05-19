/**
 * ImperialHistoryRail — color-coded history pill rail.
 * Gold < 2x · Orange 2~10x · Pink 10x+.
 */
import { memo } from "react";

interface Entry { id: string; value: number; label?: string }
interface Props {
  entries: Entry[];
  formatter?: (n: number) => string;
}

const fmtX = (n: number) => `${n.toFixed(2)}x`;

function pillClass(v: number) {
  if (v >= 10) return "bg-[hsl(var(--pink))]/15 text-[hsl(var(--pink))] border-[hsl(var(--pink))]/40";
  if (v >= 2) return "bg-orange-500/10 text-orange-300 border-orange-400/40";
  return "bg-[hsl(var(--gold))]/10 text-[hsl(var(--gold))] border-[hsl(var(--gold))]/40";
}

function ImperialHistoryRailImpl({ entries, formatter = fmtX }: Props) {
  if (!entries.length) {
    return (
      <div className="h-9 rounded-xl border border-border/40 bg-card/40 flex items-center justify-center text-[11px] text-muted-foreground">
        첫 라운드의 주인공이 되어보세요
      </div>
    );
  }
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {entries.map((e) => (
        <span
          key={e.id}
          className={`shrink-0 px-2.5 h-9 rounded-xl border text-xs font-bold tabular-nums flex items-center ${pillClass(e.value)}`}
        >
          {e.label ?? formatter(e.value)}
        </span>
      ))}
    </div>
  );
}

export const ImperialHistoryRail = memo(ImperialHistoryRailImpl);
export default ImperialHistoryRail;
