import { motion } from "framer-motion";
import { Crown } from "lucide-react";
import { useLiveFomoCounters } from "@/hooks/use-live-fomo-counters";

/**
 * FoundingContendersBadge — Whale Strike Rail 옆 Founding Seat 경쟁자 수 표시.
 */
export default function FoundingContendersBadge() {
  const c = useLiveFomoCounters();
  if (!c) return null;
  return (
    <motion.div
      initial={{ opacity: 0, x: -4 }}
      animate={{ opacity: 1, x: 0 }}
      className="rounded-xl border border-secondary/30 bg-secondary/5 px-3 py-1.5 inline-flex items-center gap-2 text-[11px]"
    >
      <Crown className="w-3.5 h-3.5 text-secondary shrink-0" />
      <span className="text-foreground/90">
        지금{" "}
        <span className="font-black tabular-nums text-secondary">
          {c.founding_seat_contenders.toLocaleString()}
        </span>
        <span>명의 황제가 </span>
        <span className="font-bold text-secondary">Founding Seat</span>
        <span>을 노리는 중</span>
      </span>
    </motion.div>
  );
}
