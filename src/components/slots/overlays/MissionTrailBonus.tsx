import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { Flag } from "lucide-react";
import { mulberry32 } from "./bonusSplit";

/** Cherry Sakura — Mission Trail. Pawn moves along board, triggers checkpoints to total target. */
export default function MissionTrailBonus({
  show, targetMultiplier, betAmount, unitLabel, onComplete,
}: {
  show: boolean; targetMultiplier: number; betAmount: number; unitLabel: string;
  onComplete: (winAmount: number) => void;
}) {
  const totalWin = Math.round(targetMultiplier * betAmount);
  const seed = Math.floor(targetMultiplier * 100) + 555;
  // Pick step count to land at by inverse-mapping target → checkpoint zone
  const finalStep = useMemo(() => {
    if (targetMultiplier >= 400) return 100;
    if (targetMultiplier >= 40) return 80;
    if (targetMultiplier >= 15) return 50;
    if (targetMultiplier >= 6) return 30;
    if (targetMultiplier >= 2) return 15;
    return 5;
  }, [targetMultiplier]);

  const checkpoints = [5, 15, 30, 50, 80, 100];
  const STEPS_TOTAL = 100;

  const [pos, setPos] = useState(0);
  const [hits, setHits] = useState<number[]>([]);
  const [winSoFar, setWinSoFar] = useState(0);

  useEffect(() => {
    if (!show) { setPos(0); setHits([]); setWinSoFar(0); return; }
    let cancelled = false;
    const rnd = mulberry32(seed);
    const run = async () => {
      let cur = 0;
      while (cur < finalStep) {
        if (cancelled) return;
        await new Promise((r) => setTimeout(r, 320));
        const dist = Math.min(finalStep - cur, 1 + Math.floor(rnd() * 5));
        cur += dist;
        setPos(cur);
        const hit = checkpoints.find((cp) => cp === cur);
        if (hit) setHits((h) => [...h, hit]);
      }
      // Distribute winnings across hits, cinematic count-up
      const reachedHits = checkpoints.filter((cp) => cp <= finalStep);
      const portion = totalWin / Math.max(1, reachedHits.length);
      for (let i = 0; i < reachedHits.length; i++) {
        if (cancelled) return;
        await new Promise((r) => setTimeout(r, 250));
        setWinSoFar((w) => w + portion);
      }
      // Drift correction
      setWinSoFar(totalWin);
      await new Promise((r) => setTimeout(r, 900));
      if (!cancelled) onComplete(totalWin);
    };
    run();
    return () => { cancelled = true; };
  }, [show, finalStep, totalWin, seed, onComplete]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="absolute inset-0 z-40 flex flex-col items-center justify-center pointer-events-auto"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-pink-950/95 via-rose-950/95 to-teal-950/95 backdrop-blur-md" />
          <div className="absolute inset-0 opacity-40"
            style={{ background: "radial-gradient(2px 2px at 20% 30%, rgba(255,180,210,0.7), transparent 60%), radial-gradient(2px 2px at 70% 60%, rgba(255,200,220,0.6), transparent 60%), radial-gradient(2px 2px at 50% 80%, rgba(255,170,200,0.6), transparent 60%)" }} />
          <div className="relative text-center mb-3">
            <div className="font-imperial text-2xl sm:text-3xl text-gradient-imperial tracking-[0.22em]">SAKURA TRAIL</div>
            <div className="text-[11px] text-pink-200/80 tracking-[0.3em] mt-1">STEP {pos}/{STEPS_TOTAL}</div>
          </div>
          <div className="relative w-[300px] h-[120px] rounded-xl border border-pink-300/40 bg-black/50 p-3 overflow-hidden">
            {/* Trail path */}
            <div className="absolute inset-x-3 top-1/2 h-1 -translate-y-1/2 rounded-full bg-pink-200/15" />
            <motion.div
              className="absolute top-1/2 left-3 h-1 -translate-y-1/2 rounded-full bg-gradient-to-r from-pink-300 to-rose-400"
              animate={{ width: `${(pos / STEPS_TOTAL) * 274}px` }}
              transition={{ duration: 0.3 }}
            />
            {checkpoints.map((cp) => {
              const x = (cp / STEPS_TOTAL) * 274;
              const reached = hits.includes(cp);
              return (
                <div key={cp} className="absolute top-1/2 -translate-y-1/2 flex flex-col items-center" style={{ left: `${x + 12 - 6}px` }}>
                  <Flag className={`w-3.5 h-3.5 ${reached ? "text-amber-300" : "text-pink-200/40"}`} />
                  <span className={`text-[8px] font-mono ${reached ? "text-amber-300" : "text-pink-200/40"}`}>{cp}</span>
                </div>
              );
            })}
            <motion.div
              className="absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-gradient-to-br from-pink-200 to-rose-500 shadow-[0_0_16px_rgba(255,150,190,0.85)] border-2 border-white"
              animate={{ left: `${(pos / STEPS_TOTAL) * 274 + 12 - 10}px` }}
              transition={{ type: "spring", stiffness: 220, damping: 18 }}
            />
          </div>
          <div className="relative mt-4 text-center">
            <div className="text-[10px] text-pink-200/70 tracking-widest">MISSION REWARD</div>
            <div className="font-mono text-2xl sm:text-3xl font-black text-amber-300 tabular-nums">
              +{Math.round(winSoFar).toLocaleString()} {unitLabel}
            </div>
            <div className="text-[11px] text-pink-200/70 mt-1">
              {hits.length} 체크포인트 · {targetMultiplier.toFixed(2)}×
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
