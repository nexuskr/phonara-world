import { memo } from "react";
import { Flame } from "lucide-react";

function ComboStreakHUDImpl({ wins }: { wins: number }) {
  if (wins < 1) return null;
  const tier = wins >= 7 ? "INFERNO" : wins >= 5 ? "BLAZE" : wins >= 3 ? "HOT" : "WARM";
  const mult = wins >= 7 ? "x3.0" : wins >= 5 ? "x2.0" : wins >= 3 ? "x1.5" : "x1.2";
  const bigOn = wins >= 3;

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-black tracking-widest ${
      bigOn ? "border-amber-300/70 bg-amber-500/15 shadow-[0_0_30px_rgba(244,180,55,0.4)]" : "border-border/50 bg-background/60"
    }`}>
      <Flame className={`w-4 h-4 ${bigOn ? "text-amber-300 animate-pulse" : "text-muted-foreground"}`} />
      <span className={bigOn ? "text-amber-200" : "text-foreground"}>{wins} STREAK · {tier}</span>
      {bigOn && <span className="text-emerald-300">{mult}</span>}
    </div>
  );
}

export default memo(ComboStreakHUDImpl);
