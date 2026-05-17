/**
 * SpectatorDeck — 좌/우 군중 비율, 실시간 관중, 합류 토스트.
 */
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Flame } from "lucide-react";
import type { Arrival } from "../../hooks/useSpectatorSync";
import type { PoolState } from "../../engine/odds";

export function SpectatorDeck({
  spectators,
  arrivals,
  pool,
  leftName,
  rightName,
}: {
  spectators: number;
  arrivals: Arrival[];
  pool: PoolState;
  leftName: string;
  rightName: string;
}) {
  const total = Math.max(1, pool.leftPool + pool.rightPool);
  const leftPct = Math.round((pool.leftPool / total) * 100);
  const rightPct = 100 - leftPct;

  const latest = arrivals[arrivals.length - 1];
  const [toastKey, setToastKey] = useState(0);
  useEffect(() => { if (latest) setToastKey((k) => k + 1); }, [latest]);

  const headerCopy = useMemo(() => {
    if (spectators > 800) return "황실이 뜨겁게 끓고 있습니다 — 배당이 폭발합니다";
    if (spectators > 400) return "황실이 점차 달아오릅니다";
    return "황실이 폐하의 입장을 기다립니다";
  }, [spectators]);

  return (
    <div className="rounded-2xl border border-amber-400/25 bg-black/45 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="inline-flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-amber-300" />
          <span className="font-imperial text-base text-amber-100 tabular-nums">
            {spectators.toLocaleString()}
          </span>
          <span className="text-[10px] text-amber-300/75">명 관전</span>
        </div>
        <motion.div
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2.4, repeat: Infinity }}
          className="inline-flex items-center gap-1 text-[10px] tracking-[0.22em] font-black uppercase text-pink-300/90"
        >
          <Flame className="w-3 h-3" /> LIVE
        </motion.div>
      </div>

      <div className="text-[11px] text-amber-200/85 break-keep">{headerCopy}</div>

      {/* 좌/우 풀 비율 게이지 */}
      <div className="space-y-1">
        <div className="flex justify-between text-[10px] tracking-[0.18em] font-black uppercase">
          <span className="text-amber-300/85 truncate max-w-[40%]">{leftName} {leftPct}%</span>
          <span className="text-pink-300/85 truncate max-w-[40%] text-right">{rightPct}% {rightName}</span>
        </div>
        <div className="h-2 rounded-full bg-black/55 overflow-hidden flex">
          <motion.div
            animate={{ width: `${leftPct}%` }}
            transition={{ type: "spring", stiffness: 90, damping: 18 }}
            className="h-full"
            style={{ background: "linear-gradient(90deg,#F5C518,#F59E0B)" }}
          />
          <motion.div
            animate={{ width: `${rightPct}%` }}
            transition={{ type: "spring", stiffness: 90, damping: 18 }}
            className="h-full"
            style={{ background: "linear-gradient(90deg,#F472B6,#EC4899)" }}
          />
        </div>
      </div>

      {/* 합류 토스트 */}
      <div className="h-5 relative overflow-hidden">
        <AnimatePresence mode="popLayout">
          {latest && (
            <motion.div
              key={toastKey}
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -12, opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="absolute inset-x-0 text-[11px] text-amber-100/95 truncate"
            >
              {latest.nick} ▸ {latest.side === "left" ? leftName : rightName} 진영 합류
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default SpectatorDeck;
