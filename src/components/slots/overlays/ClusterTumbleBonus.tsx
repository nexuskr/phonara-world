import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { Sun } from "lucide-react";
import { splitSum, mulberry32 } from "./bonusSplit";

/** Aztec Sun — Cluster Tumble cascade. Each tumble bumps cell-mult ladder. */
export default function ClusterTumbleBonus({
  show, targetMultiplier, betAmount, unitLabel, onComplete,
}: {
  show: boolean; targetMultiplier: number; betAmount: number; unitLabel: string;
  onComplete: (winAmount: number) => void;
}) {
  const seed = Math.floor(targetMultiplier * 100) + 1212;
  const totalWin = Math.round(targetMultiplier * betAmount);
  const ladder = [2, 3, 5, 8, 16, 32];
  const tumbles = useMemo(() => {
    if (targetMultiplier >= 200) return 6;
    if (targetMultiplier >= 50) return 5;
    if (targetMultiplier >= 10) return 4;
    return 3;
  }, [targetMultiplier]);

  const [tumble, setTumble] = useState(0);
  const [winSoFar, setWinSoFar] = useState(0);
  const [grid, setGrid] = useState<number[][]>(() => Array.from({ length: 5 }, () => Array(5).fill(0)));

  useEffect(() => {
    if (!show) { setTumble(0); setWinSoFar(0); setGrid(Array.from({ length: 5 }, () => Array(5).fill(0))); return; }
    let cancelled = false;
    const seq = splitSum(totalWin, tumbles, seed);
    const rnd = mulberry32(seed + 9);
    const run = async () => {
      for (let i = 0; i < tumbles; i++) {
        if (cancelled) return;
        await new Promise((r) => setTimeout(r, 520));
        // Random cluster glow positions
        const next = Array.from({ length: 5 }, () => Array(5).fill(0));
        const clusterSize = 5 + Math.floor(rnd() * 6);
        for (let k = 0; k < clusterSize; k++) {
          const r = Math.floor(rnd() * 5), c = Math.floor(rnd() * 5);
          next[r][c] = ladder[Math.min(i, ladder.length - 1)];
        }
        setGrid(next);
        setTumble(i + 1);
        setWinSoFar((w) => w + seq[i]);
      }
      await new Promise((r) => setTimeout(r, 900));
      if (!cancelled) onComplete(totalWin);
    };
    run();
    return () => { cancelled = true; };
  }, [show, tumbles, totalWin, seed, onComplete]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="absolute inset-0 z-40 flex flex-col items-center justify-center pointer-events-auto"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-emerald-950/95 via-amber-950/95 to-stone-950/95 backdrop-blur-md" />
          <div className="absolute inset-0 opacity-30"
            style={{ background: "conic-gradient(from 0deg at 50% 50%, rgba(255,200,80,0.25), transparent 30deg, rgba(255,200,80,0.2) 60deg, transparent 90deg)" }} />
          <div className="relative text-center mb-3">
            <div className="font-imperial text-2xl sm:text-3xl text-gradient-imperial tracking-[0.22em]">SUN CASCADE</div>
            <div className="text-[11px] text-amber-200/80 tracking-[0.3em] mt-1">TUMBLE {tumble}/{tumbles} · ×{ladder[Math.min(tumble - 1, ladder.length - 1)] || ladder[0]}</div>
          </div>
          <div className="relative grid grid-cols-5 gap-1 p-3 rounded-xl border border-amber-500/40 bg-black/50">
            {grid.flat().map((v, idx) => (
              <div key={idx} className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-md border border-emerald-500/30 bg-emerald-950/50 flex items-center justify-center">
                {v > 0 && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 320, damping: 18 }}
                    className="absolute inset-0.5 rounded-md bg-gradient-to-br from-amber-300 to-orange-600 shadow-[0_0_18px_rgba(255,180,40,0.7)] flex items-center justify-center"
                  >
                    <span className="font-black text-stone-900 text-xs">×{v}</span>
                  </motion.div>
                )}
              </div>
            ))}
          </div>
          <div className="relative mt-4 text-center">
            <div className="text-[10px] text-amber-200/70 tracking-widest">CASCADE TOTAL</div>
            <div className="font-mono text-2xl sm:text-3xl font-black text-amber-300 tabular-nums">
              +{Math.round(winSoFar).toLocaleString()} {unitLabel}
            </div>
            <div className="flex items-center justify-center gap-1 mt-1 text-[11px] text-amber-200/70">
              <Sun className="w-3 h-3" /> {targetMultiplier.toFixed(2)}×
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
