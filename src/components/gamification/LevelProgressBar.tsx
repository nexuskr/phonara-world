import { Crown, Star } from "lucide-react";
import { usePhonLevel } from "@/hooks/use-phon-level";
import { PHON_MAX_LEVEL } from "@/lib/gamification";

type Props = {
  compact?: boolean;
  className?: string;
};

/** PHON Level (1~100) + XP progress bar. Warm King gold gradient. */
export default function LevelProgressBar({ compact = false, className }: Props) {
  const { level, xp, xpToNext, totalXp, progressPct, loading, isMax } = usePhonLevel();

  if (loading) {
    return (
      <div className={`rounded-xl border border-border/60 bg-card/60 backdrop-blur-md p-3 ${className ?? ""}`}>
        <div className="h-3 w-24 bg-muted/40 rounded animate-pulse mb-2" />
        <div className="h-2 w-full bg-muted/30 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border border-amber-400/30 bg-gradient-to-br from-amber-950/30 via-card/60 to-card/40 backdrop-blur-md p-3 ${className ?? ""}`}
      aria-label={`PHON 레벨 ${level}`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-amber-200">
          <Crown className="w-4 h-4" aria-hidden />
          <span>PHON Lv {level}</span>
          {isMax && <span className="text-[10px] uppercase tracking-wider text-amber-300/80">MAX</span>}
        </div>
        {!compact && (
          <div className="text-[11px] text-muted-foreground">
            누적 XP {totalXp.toLocaleString()}
          </div>
        )}
      </div>
      <div className="relative h-2 w-full rounded-full bg-muted/30 overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 transition-all duration-700"
          style={{ width: `${isMax ? 100 : progressPct}%` }}
        />
      </div>
      {!compact && !isMax && (
        <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Star className="w-3 h-3 text-amber-300" aria-hidden />
            {xp.toLocaleString()} / {xpToNext.toLocaleString()} XP
          </span>
          <span>다음 레벨까지 {Math.max(0, xpToNext - xp).toLocaleString()}</span>
        </div>
      )}
      {!compact && isMax && (
        <div className="mt-1 text-[11px] text-amber-300/90">
          만렙 폐하 · PHON {PHON_MAX_LEVEL} 레벨 정점
        </div>
      )}
    </div>
  );
}
