import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import { pickCells, splitSum, mulberry32 } from "./bonusSplit";

/**
 * Cosmic Forge — Sticky Multiplier Free Spins.
 * 12 spins, sticky multiplier cells persist on the 5x3 grid.
 * Server decides total bonus payout; client deterministically renders the story.
 */
export default function StickyMultiBonus({
  show, targetMultiplier, betAmount, unitLabel, onComplete,
}: {
  show: boolean;
  targetMultiplier: number;
  betAmount: number;
  unitLabel: string;
  onComplete: (winAmount: number) => void;
}) {
  const SPINS = 12;
  const seed = Math.floor(targetMultiplier * 1000) + 7;
  const totalWin = Math.round(targetMultiplier * betAmount);

  // Decide how many sticky cells to land (3..9) based on total
  const cellCount = useMemo(() => {
    if (targetMultiplier >= 200) return 9;
    if (targetMultiplier >= 50) return 7;
    if (targetMultiplier >= 10) return 5;
    return 3;
  }, [targetMultiplier]);

  const cells = useMemo(() => pickCells(15, cellCount, seed), [cellCount, seed]);
  const cellMults = useMemo(() => {
    const rnd = mulberry32(seed + 91);
    const choices = [2, 3, 5, 10, 25, 100];
    return cells.map(() => choices[Math.floor(rnd() * choices.length)]);
  }, [cells, seed]);

  const [spin, setSpin] = useState(0);
  const [revealed, setRevealed] = useState<number[]>([]);
  const [winSoFar, setWinSoFar] = useState(0);

  useEffect(() => {
    if (!show) { setSpin(0); setRevealed([]); setWinSoFar(0); return; }
    let cancelled = false;
    const cellsPerSpin = Math.ceil(cells.length / Math.min(8, SPINS));
    const winPerStep = splitSum(totalWin, SPINS, seed + 13);
    const run = async () => {
      for (let i = 0; i < SPINS; i++) {
        if (cancelled) return;
        await new Promise((r) => setTimeout(r, 350));
        setSpin(i + 1);
        const targetCount = Math.min(cells.length, (i + 1) * cellsPerSpin);
        setRevealed(cells.slice(0, targetCount));
        setWinSoFar((w) => w + winPerStep[i]);
      }
      await new Promise((r) => setTimeout(r, 1100));
      if (!cancelled) onComplete(totalWin);
    };
    run();
    return () => { cancelled = true; };
  }, [show, cells, totalWin, seed, onComplete]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="absolute inset-0 z-40 flex flex-col items-center justify-center pointer-events-auto"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/95 via-violet-950/95 to-black/95 backdrop-blur-md" />
          <div className="absolute inset-0 opacity-40"
            style={{ background: "radial-gradient(circle at 50% 40%, rgba(180,120,255,0.5), transparent 60%)" }} />
          <div className="relative text-center mb-3">
            <div className="font-imperial text-2xl sm:text-3xl text-gradient-imperial tracking-[0.22em]">SUPERNOVA SPINS</div>
            <div className="text-[11px] text-violet-200/80 tracking-[0.3em] mt-1">SPIN {spin}/{SPINS} · {cells.length} CELLS LOCKED</div>
          </div>
          <div className="relative grid grid-cols-5 gap-1.5 p-3 rounded-xl border border-violet-400/40 bg-black/40">
            {Array.from({ length: 15 }).map((_, idx) => {
              const ci = cells.indexOf(idx);
              const isLocked = ci >= 0 && revealed.includes(idx);
              return (
                <div key={idx} className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-md border border-violet-500/30 bg-violet-950/50 flex items-center justify-center">
                  {isLocked && (
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", stiffness: 260, damping: 15 }}
                      className="absolute inset-0.5 rounded-md bg-gradient-to-br from-fuchsia-500 to-violet-700 shadow-[0_0_18px_rgba(220,120,255,0.7)] flex items-center justify-center"
                    >
                      <span className="font-black text-white text-sm sm:text-base">×{cellMults[ci]}</span>
                    </motion.div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="relative mt-4 text-center">
            <div className="text-[10px] text-violet-200/70 tracking-widest">SUPERNOVA WIN</div>
            <div className="font-mono text-2xl sm:text-3xl font-black text-amber-300 tabular-nums">
              +{Math.round(winSoFar).toLocaleString()} {unitLabel}
            </div>
            <div className="flex items-center justify-center gap-1 mt-1 text-[11px] text-violet-200/70">
              <Sparkles className="w-3 h-3" /> {targetMultiplier.toFixed(2)}× · {SPINS} 프리스핀
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
