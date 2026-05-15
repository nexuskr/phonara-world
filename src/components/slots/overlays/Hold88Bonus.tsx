import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { Coins } from "lucide-react";
import { pickCells, splitSum, mulberry32 } from "./bonusSplit";

/** Neon Tokyo 88 — Hold & Spin coin lock cinematic. */
export default function Hold88Bonus({
  show, targetMultiplier, betAmount, unitLabel, onComplete,
}: {
  show: boolean; targetMultiplier: number; betAmount: number; unitLabel: string;
  onComplete: (winAmount: number) => void;
}) {
  const seed = Math.floor(targetMultiplier * 100) + 88;
  const totalWin = Math.round(targetMultiplier * betAmount);
  const isGrand = targetMultiplier >= 8000;

  const coinCount = useMemo(() => {
    if (isGrand) return 15;
    if (targetMultiplier >= 500) return 13;
    if (targetMultiplier >= 100) return 10;
    if (targetMultiplier >= 20) return 7;
    return 4;
  }, [targetMultiplier, isGrand]);

  const cellsOrder = useMemo(() => pickCells(15, coinCount, seed), [coinCount, seed]);
  const coinValues = useMemo(() => splitSum(totalWin, coinCount, seed + 7).map((v) => Math.max(1, Math.round(v))), [totalWin, coinCount, seed]);

  const [revealed, setRevealed] = useState(0);
  const [respin, setRespin] = useState(3);
  const [winSoFar, setWinSoFar] = useState(0);

  useEffect(() => {
    if (!show) { setRevealed(0); setRespin(3); setWinSoFar(0); return; }
    let cancelled = false;
    const run = async () => {
      for (let i = 0; i < cellCount(); i++) {
        if (cancelled) return;
        await new Promise((r) => setTimeout(r, 380));
        setRevealed(i + 1);
        setRespin(3);
        setWinSoFar((w) => w + (coinValues[i] ?? 0));
      }
      // Drain respins
      for (let r = 3; r >= 1; r--) {
        if (cancelled) return;
        await new Promise((r2) => setTimeout(r2, 380));
        setRespin(r - 1);
      }
      await new Promise((r) => setTimeout(r, 800));
      if (!cancelled) onComplete(totalWin);
    };
    function cellCount() { return cellsOrder.length; }
    run();
    return () => { cancelled = true; };
  }, [show, cellsOrder, coinValues, totalWin, onComplete]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="absolute inset-0 z-40 flex flex-col items-center justify-center pointer-events-auto"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-fuchsia-950/95 via-purple-950/95 to-cyan-950/95 backdrop-blur-md" />
          <div aria-hidden className="absolute inset-0 opacity-30"
            style={{ background: "repeating-linear-gradient(0deg, rgba(255,60,180,0.15) 0 1px, transparent 1px 4px)" }} />
          <div className="relative text-center mb-3">
            <div className="font-imperial text-2xl sm:text-3xl tracking-[0.22em]" style={{ color: "#ff5cdc", textShadow: "0 0 18px rgba(255,80,200,0.7)" }}>88 HOLD &amp; SPIN</div>
            <div className="flex items-center justify-center gap-3 text-[11px] mt-1">
              <span className="text-cyan-300 tracking-[0.3em]">COINS {revealed}/{cellsOrder.length}</span>
              <span className="text-pink-300 tracking-[0.3em]">RESPIN {respin}</span>
            </div>
          </div>
          <div className="relative grid grid-cols-5 gap-1.5 p-3 rounded-xl border border-fuchsia-400/40 bg-black/50">
            {Array.from({ length: 15 }).map((_, idx) => {
              const i = cellsOrder.indexOf(idx);
              const isOn = i >= 0 && i < revealed;
              return (
                <div key={idx} className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-md border border-fuchsia-500/30 bg-purple-950/50 flex items-center justify-center">
                  {isOn && (
                    <motion.div
                      initial={{ scale: 0, y: -30, opacity: 0 }}
                      animate={{ scale: 1, y: 0, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 300, damping: 16 }}
                      className="absolute inset-0.5 rounded-full bg-gradient-to-br from-amber-300 to-orange-600 shadow-[0_0_22px_rgba(255,180,40,0.85)] flex items-center justify-center"
                    >
                      <span className="font-black text-stone-900 text-[10px] sm:text-xs tabular-nums">
                        {(coinValues[i] ?? 0) >= 1000 ? `${Math.round((coinValues[i] ?? 0) / 1000)}k` : coinValues[i]}
                      </span>
                    </motion.div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="relative mt-4 text-center">
            <div className="text-[10px] text-cyan-200/80 tracking-widest">{isGrand ? "GRAND JACKPOT" : "COIN POOL"}</div>
            <div className="font-mono text-2xl sm:text-3xl font-black text-amber-300 tabular-nums">
              +{Math.round(winSoFar).toLocaleString()} {unitLabel}
            </div>
            <div className="flex items-center justify-center gap-1 mt-1 text-[11px] text-pink-200/80">
              <Coins className="w-3 h-3" /> {targetMultiplier.toFixed(2)}×
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
