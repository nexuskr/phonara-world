import { memo } from "react";

interface Props { prizePoolPhon: number; entryFeePhon: number; bracketSize: number; entriesCount?: number; }

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}

export const CupPrizePool = memo(function CupPrizePool({ prizePoolPhon, entryFeePhon, bracketSize, entriesCount = 0 }: Props) {
  return (
    <div className="rounded-xl border border-primary/40 bg-gradient-to-br from-primary/15 via-background to-background p-5 shadow-lg">
      <div className="text-xs uppercase tracking-widest text-primary/80">Apocalypse Cup Prize Pool</div>
      <div className="mt-1 text-4xl font-black tracking-tight text-foreground">{fmt(prizePoolPhon)} <span className="text-base text-muted-foreground">PHON</span></div>
      <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
        <div><div className="text-muted-foreground">Entry</div><div className="font-semibold">{fmt(entryFeePhon)} PHON</div></div>
        <div><div className="text-muted-foreground">Bracket</div><div className="font-semibold">{bracketSize}</div></div>
        <div><div className="text-muted-foreground">Entered</div><div className="font-semibold">{entriesCount}/{bracketSize}</div></div>
      </div>
    </div>
  );
});
