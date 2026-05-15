import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { Anchor } from "lucide-react";

/** Pirate's Curse — Crash Cannon. Multiplier curve climbs, cannon fires at server-decided cashout. */
export default function CrashCannonBonus({
  show, targetMultiplier, betAmount, unitLabel, onComplete,
}: {
  show: boolean; targetMultiplier: number; betAmount: number; unitLabel: string;
  onComplete: (winAmount: number) => void;
}) {
  const totalWin = Math.round(targetMultiplier * betAmount);
  const target = Math.max(1.05, targetMultiplier);
  const ticks = useMemo(() => Math.min(140, Math.max(28, Math.ceil(Math.log(target) / 0.04))), [target]);
  const stepMs = 55;

  const [tick, setTick] = useState(0);
  const [exploded, setExploded] = useState(false);

  useEffect(() => {
    if (!show) { setTick(0); setExploded(false); return; }
    let cancelled = false;
    let i = 0;
    const id = setInterval(() => {
      if (cancelled) return;
      i++;
      setTick(i);
      if (i >= ticks) {
        clearInterval(id);
        setExploded(true);
        setTimeout(() => !cancelled && onComplete(totalWin), 1500);
      }
    }, stepMs);
    return () => { cancelled = true; clearInterval(id); };
  }, [show, ticks, totalWin, onComplete]);

  // Exponential curve toward target
  const liveMult = useMemo(() => {
    const t = ticks <= 0 ? 1 : tick / ticks;
    return 1 + (target - 1) * Math.pow(t, 1.6);
  }, [tick, ticks, target]);

  // Path points for SVG curve
  const points = useMemo(() => {
    const n = Math.max(1, tick);
    const pts: string[] = [];
    for (let i = 0; i <= n; i++) {
      const tt = i / Math.max(1, ticks);
      const m = 1 + (target - 1) * Math.pow(tt, 1.6);
      const x = tt * 280;
      const y = 140 - Math.min(130, Math.log(m) * 38);
      pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }
    return pts.join(" ");
  }, [tick, ticks, target]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="absolute inset-0 z-40 flex flex-col items-center justify-center pointer-events-auto"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-stone-950/95 via-teal-950/95 to-black/95 backdrop-blur-md" />
          <div className="relative text-center mb-2">
            <div className="font-imperial text-2xl sm:text-3xl tracking-[0.22em] text-amber-200" style={{ textShadow: "0 0 14px rgba(40,200,180,0.6)" }}>
              CRASH CANNON
            </div>
            <div className="text-[11px] text-teal-200/80 tracking-[0.3em] mt-1">{exploded ? "💥 CANNON FIRED" : "ARMING…"}</div>
          </div>
          <div className="relative w-[300px] h-[160px] rounded-xl border border-teal-400/40 bg-black/60 overflow-hidden">
            <svg viewBox="0 0 300 160" className="absolute inset-0 w-full h-full">
              <defs>
                <linearGradient id="crashFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(255,180,40,0.5)" />
                  <stop offset="100%" stopColor="rgba(255,180,40,0)" />
                </linearGradient>
              </defs>
              <polyline points={`0,140 ${points} ${tick === 0 ? "" : `${(tick / Math.max(1, ticks)) * 280},140`}`}
                fill="url(#crashFill)" />
              <polyline points={points} fill="none" stroke={exploded ? "#ff5e5e" : "#ffd76a"} strokeWidth="2.4" />
              {exploded && (
                <circle cx={(tick / Math.max(1, ticks)) * 280} cy={140 - Math.min(130, Math.log(target) * 38)} r="14" fill="#ff5e5e" opacity="0.9" />
              )}
            </svg>
            <div className="absolute top-2 left-3 text-[10px] text-teal-200/70 tracking-widest">MULT</div>
            <div className="absolute top-1.5 right-3 font-mono text-2xl font-black tabular-nums" style={{ color: exploded ? "#ff8e8e" : "#ffe48a" }}>
              {liveMult.toFixed(2)}×
            </div>
          </div>
          <div className="relative mt-4 text-center">
            <div className="text-[10px] text-amber-200/70 tracking-widest">CASHOUT</div>
            <div className="font-mono text-2xl sm:text-3xl font-black text-amber-300 tabular-nums">
              +{Math.round(liveMult * betAmount).toLocaleString()} {unitLabel}
            </div>
            <div className="flex items-center justify-center gap-1 mt-1 text-[11px] text-teal-200/70">
              <Anchor className="w-3 h-3" /> Pirate's Curse · {target.toFixed(2)}× target
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
