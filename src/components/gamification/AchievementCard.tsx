import { Lock, Trophy } from "lucide-react";
import { BADGE_TIER_COLORS } from "@/lib/gamification";
import type { AchievementCatalogRow } from "@/hooks/use-achievement";

type Props = {
  ach: AchievementCatalogRow;
  unlocked: boolean;
  unlockedAt?: string;
};

export default function AchievementCard({ ach, unlocked, unlockedAt }: Props) {
  const tier = ach.badge_tier ?? "bronze";
  const tone = BADGE_TIER_COLORS[tier] ?? BADGE_TIER_COLORS.bronze;
  return (
    <div
      className={`relative rounded-xl border p-3 transition-colors ${
        unlocked ? "border-amber-400/40 bg-card/70" : "border-border/40 bg-card/30 opacity-70"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br ${tone} flex items-center justify-center text-white shadow-md`}
        >
          {unlocked ? <Trophy className="w-5 h-5" aria-hidden /> : <Lock className="w-4 h-4" aria-hidden />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm font-bold truncate">{ach.name}</div>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground shrink-0">{tier}</span>
          </div>
          <div className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{ach.description}</div>
          <div className="mt-1.5 flex items-center gap-2 text-[11px]">
            <span className="text-amber-300/90">AP {ach.ap}</span>
            {ach.reward_credit > 0 && (
              <span className="text-emerald-300/90">+{ach.reward_credit.toLocaleString()} PHON</span>
            )}
            {unlocked && unlockedAt && (
              <span className="ml-auto text-muted-foreground/70">
                {new Date(unlockedAt).toLocaleDateString("ko-KR")}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
