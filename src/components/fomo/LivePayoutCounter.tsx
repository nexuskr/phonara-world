import { motion } from "framer-motion";
import { ArrowDownToLine } from "lucide-react";
import { useLiveFomoCounters } from "@/hooks/use-live-fomo-counters";

/**
 * LivePayoutCounter — Dashboard 상단 라이브 출금 인원 카운터 (15s 폴링).
 */
export default function LivePayoutCounter() {
  const c = useLiveFomoCounters();
  if (!c) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-money-strong/30 bg-money-strong/5 px-3 py-2 flex items-center gap-2 text-[12px]"
      aria-live="polite"
    >
      <span className="relative inline-flex h-2 w-2 shrink-0">
        <span className="absolute inset-0 rounded-full bg-money-strong/60 animate-ping" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-money-strong" />
      </span>
      <ArrowDownToLine className="w-3.5 h-3.5 text-money-strong shrink-0" />
      <span className="text-foreground/90">
        지금 이 순간에도{" "}
        <span className="font-black tabular-nums text-money-strong">{c.withdrawing_now.toLocaleString()}</span>
        <span className="text-foreground/90">명의 황제가 출금 중입니다</span>
      </span>
    </motion.div>
  );
}
