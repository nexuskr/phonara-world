import { motion, AnimatePresence } from "framer-motion";
import { Flame } from "lucide-react";
import { useWinStreak } from "@/hooks/use-win-streak";

/**
 * C2 — 연승 카운터. 3 / 5 / 10 단계별 시각 강도.
 */
export default function StreakBadge() {
  const { streak } = useWinStreak();
  if (streak < 3) return null;

  const tier = streak >= 10 ? "emperor" : streak >= 5 ? "gold" : "amber";
  const cls =
    tier === "emperor"
      ? "bg-gradient-imperial text-primary-foreground glow-imperial border-primary"
      : tier === "gold"
        ? "bg-primary/20 text-primary border-primary/60 shadow-[0_0_24px_hsl(var(--primary)/0.6)]"
        : "bg-amber-500/15 text-amber-300 border-amber-500/40";

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={streak}
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: [1, 1.15, 1], opacity: 1 }}
        exit={{ scale: 0.85, opacity: 0 }}
        transition={{ duration: 0.35 }}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border font-imperial tracking-[0.15em] text-xs ${cls}`}
      >
        <Flame className={`w-3.5 h-3.5 ${tier === "amber" ? "" : "animate-pulse"}`} />
        <span className="tabular-nums">{streak}연승 중</span>
        {tier === "emperor" && <span className="text-[10px]">👑</span>}
      </motion.div>
    </AnimatePresence>
  );
}
