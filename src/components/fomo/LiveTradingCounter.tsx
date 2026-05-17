import { motion } from "framer-motion";
import { Activity } from "lucide-react";
import { useEffect, useState } from "react";
import { useLiveFomoCounters } from "@/hooks/use-live-fomo-counters";
import { liveTradingFloor, mergeCount } from "@/lib/fakeTradingFloor";

/**
 * LiveTradingCounter — 트레이딩 패널 헤더 라이브 인원 카운터.
 * Global #1 Floor: 항상 120k~285k 표시 (한국 시간대 가중치 적용).
 */
export default function LiveTradingCounter({ compact = false }: { compact?: boolean } = {}) {
  const c = useLiveFomoCounters();
  const [floor, setFloor] = useState<number>(() => liveTradingFloor());
  useEffect(() => {
    const id = window.setInterval(() => setFloor(liveTradingFloor()), 38_000);
    return () => window.clearInterval(id);
  }, []);
  const display = mergeCount(c?.trading_now ?? 0, floor);
  if (display <= 0) return null;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 ${compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]"}`}
      aria-live="polite"
    >
      <span className="relative inline-flex h-1.5 w-1.5 shrink-0">
        <span className="absolute inset-0 rounded-full bg-primary/60 animate-ping" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
      </span>
      <Activity className="w-3 h-3 text-primary shrink-0" />
      <span className="text-foreground/90">
        <span className="font-black tabular-nums text-primary">{display.toLocaleString("ko-KR")}</span>
        <span className="ml-1">명의 황제가 실시간 트레이딩 중</span>
      </span>
    </motion.div>
  );
}
