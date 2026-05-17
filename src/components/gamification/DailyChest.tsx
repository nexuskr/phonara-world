import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gift, Sparkles } from "lucide-react";
import { useDailyChest, type ChestOpenResult } from "@/hooks/use-daily-chest";
import { DAILY_CHEST_REWARDS } from "@/lib/gamification";
import { notify } from "@/lib/notify";

/** Daily Reward Chest — once-per-day open, tier from attendance streak. */
export default function DailyChest({ className }: { className?: string }) {
  const { canOpen, streakDay, tierPreview, loading, opening, open } = useDailyChest();
  const [result, setResult] = useState<ChestOpenResult | null>(null);

  const meta = DAILY_CHEST_REWARDS[tierPreview];

  const handleOpen = async () => {
    try {
      const r = await open();
      if (r) {
        setResult(r);
        const tierMeta = DAILY_CHEST_REWARDS[r.tier];
        if (r.tier === "legendary") {
          notify.important(`🏆 ${tierMeta.label}`, {
            description: `${r.phonReward.toLocaleString()} PHON + ${r.boosterHours}시간 Empire Booster`,
          });
        } else {
          notify.passive(`${tierMeta.label} 획득`, {
            description: `${r.phonReward.toLocaleString()} PHON · +${r.xpReward} XP`,
          });
        }
      }
    } catch (e) {
      notify.fail("보물상자를 열 수 없어요", e);
    }
  };

  if (loading) {
    return <div className={`rounded-xl border border-border/60 bg-card/60 p-4 h-28 animate-pulse ${className ?? ""}`} />;
  }

  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-amber-400/30 bg-gradient-to-br ${meta.tone} p-4 ${className ?? ""}`}
      aria-label="일일 보상 상자"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <motion.div
            animate={canOpen ? { rotate: [-3, 3, -3] } : {}}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
            className="text-3xl drop-shadow-[0_2px_6px_rgba(0,0,0,0.4)]"
          >
            🎁
          </motion.div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-white drop-shadow truncate">{meta.label}</div>
            <div className="text-[11px] text-white/80">
              {canOpen
                ? `오늘 폐하의 ${streakDay}일차 보물이 도착했습니다`
                : "내일 다시 새로운 보물이 도착합니다"}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={handleOpen}
          disabled={!canOpen || opening}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-white/20 hover:bg-white/30 disabled:bg-white/10 disabled:text-white/50 px-3 py-1.5 text-xs font-bold text-white backdrop-blur-md transition-colors border border-white/30"
        >
          <Gift className="w-3.5 h-3.5" aria-hidden />
          {opening ? "여는 중..." : canOpen ? "열기" : "오픈 완료"}
        </button>
      </div>

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-3 rounded-lg bg-black/30 backdrop-blur-md px-3 py-2 text-xs text-white border border-white/20"
          >
            <div className="flex items-center gap-1.5 font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-amber-200" aria-hidden />
              +{result.phonReward.toLocaleString()} PHON · +{result.xpReward} XP
              {result.boosterHours > 0 && ` · Booster ${result.boosterHours}h`}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
