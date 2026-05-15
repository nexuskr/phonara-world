import { Crown } from "lucide-react";
import { useCountUp } from "@/hooks/use-count-up";

interface Props { value: number }

export default function AuthCrownExplosionCard({ value }: Props) {
  const v = useCountUp(value, 1100);
  return (
    <div className="relative rounded-2xl border border-gold/45 bg-gradient-to-br from-gold/15 via-background/95 to-background/95 p-3 sm:p-4 overflow-hidden">
      <div className="flex items-center justify-between mb-2">
        <div className="inline-flex items-center gap-1.5">
          <Crown className="w-3.5 h-3.5 text-gold" />
          <span className="text-[10px] sm:text-xs font-black tracking-[0.24em] text-foreground">CROWN EXPLOSION</span>
        </div>
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-500/15 border border-red-500/40 text-[9px] font-black tracking-widest text-red-400">
          <span className="h-1 w-1 rounded-full bg-red-500 animate-pulse" />
          LIVE
        </span>
      </div>
      <div className="flex items-center justify-center gap-2 py-1">
        <div className="font-imperial text-3xl sm:text-4xl text-gradient-gold tabular-nums">
          +{Math.round(v).toLocaleString()}
        </div>
        <Crown className="w-7 h-7 sm:w-9 sm:h-9 text-gold drop-shadow-[0_0_10px_hsl(var(--gold)/0.7)]" />
      </div>
      <div className="text-center text-[10px] sm:text-[11px] text-muted-foreground mt-1">
        Phantom Emperor
      </div>
    </div>
  );
}
