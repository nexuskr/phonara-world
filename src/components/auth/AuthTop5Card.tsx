import { Trophy } from "lucide-react";
import type { Top5Item } from "@/hooks/use-auth-live-data";

interface Props { rows: Top5Item[] }

export default function AuthTop5Card({ rows }: Props) {
  return (
    <div className="rounded-2xl border border-gold/35 bg-background/75 backdrop-blur-md p-3 sm:p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="inline-flex items-center gap-1.5">
          <Trophy className="w-3.5 h-3.5 text-gold" />
          <span className="text-[10px] sm:text-xs font-black tracking-[0.24em] text-foreground">제국력 TOP 5</span>
        </div>
        <span className="text-[9px] tracking-widest text-muted-foreground">실시간</span>
      </div>
      <ul className="divide-y divide-border/30">
        {rows.map((r) => (
          <li key={r.rank} className="flex items-center gap-2 py-2 text-[12px] sm:text-sm">
            <span className="w-4 text-center font-imperial text-gold">{r.rank}</span>
            <span className="text-base leading-none">{r.flag}</span>
            <span className="flex-1 min-w-0 truncate font-bold text-foreground/90">{r.nick}</span>
            <span className="tabular-nums text-foreground/75">{r.score.toLocaleString()} <span className="text-[10px] text-muted-foreground">Crown</span></span>
          </li>
        ))}
      </ul>
    </div>
  );
}
