import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

const SEGMENTS = [2, 3, 5, 10, 20, 50, 100, 1000] as const;
const SEG_COLORS = [
  "#3b2f1a", "#5b3d1b", "#7a4d1d", "#9c5d20",
  "#c4720f", "#e08a05", "#ff9f0a", "#ff5e00",
];

/**
 * 8-segment wheel that locks onto a server-decided multiplier.
 * `targetMultiplier` MUST be in SEGMENTS — caller maps server result to wheel.
 */
export default function BonusWheel({
  show,
  targetMultiplier,
  betAmount,
  unitLabel,
  onComplete,
}: {
  show: boolean;
  targetMultiplier: number;
  betAmount: number;
  unitLabel: string;
  onComplete: (winAmount: number) => void;
}) {
  const [phase, setPhase] = useState<"spin" | "lock" | "reveal">("spin");
  const [angle, setAngle] = useState(0);

  useEffect(() => {
    if (!show) {
      setPhase("spin");
      setAngle(0);
      return;
    }
    // Find target index (snap to nearest if not exact match)
    let idx = SEGMENTS.findIndex((m) => m === targetMultiplier);
    if (idx < 0) {
      // Find closest
      idx = SEGMENTS.reduce(
        (best, m, i) =>
          Math.abs(m - targetMultiplier) < Math.abs(SEGMENTS[best] - targetMultiplier) ? i : best,
        0,
      );
    }
    // We want segment idx centered at top (12 o'clock = 0deg).
    // Each segment spans 45°. Segment center for idx = idx * 45 + 22.5
    // To bring it to top, we rotate the wheel by `-segCenter`. Add 6 full turns.
    const segCenter = idx * 45 + 22.5;
    const finalAngle = 360 * 6 - segCenter;
    const t1 = setTimeout(() => setAngle(finalAngle), 60);
    const t2 = setTimeout(() => setPhase("lock"), 4200);
    const t3 = setTimeout(() => setPhase("reveal"), 4900);
    const t4 = setTimeout(() => onComplete(betAmount * targetMultiplier), 6800);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [show, targetMultiplier, betAmount, onComplete]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="absolute inset-0 z-40 flex flex-col items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/85 backdrop-blur-md" />

          <div className="relative mb-4 text-center">
            <div className="text-[10px] sm:text-xs text-amber-200/80 tracking-[0.4em] font-bold">
              WHEEL OF OLYMPUS
            </div>
            <div className="font-imperial text-2xl sm:text-3xl text-gradient-imperial tracking-[0.18em] mt-1">
              스핀 결과
            </div>
          </div>

          <div className="relative w-[280px] h-[280px] sm:w-[340px] sm:h-[340px]">
            {/* Pointer */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
              <div className="w-0 h-0 border-l-[12px] border-r-[12px] border-t-[20px] border-l-transparent border-r-transparent border-t-amber-300 drop-shadow-[0_0_10px_rgba(255,200,80,0.8)]" />
            </div>

            {/* Outer ring */}
            <div className="absolute inset-0 rounded-full border-[6px] border-amber-400/60 shadow-[0_0_60px_rgba(255,200,80,0.5)]" />

            {/* Wheel */}
            <motion.svg
              viewBox="-100 -100 200 200"
              className="absolute inset-0"
              animate={{ rotate: angle }}
              transition={{ duration: 4, ease: [0.18, 0.85, 0.25, 1] }}
            >
              {SEGMENTS.map((m, i) => {
                const a1 = (i * 45 - 90 - 22.5) * (Math.PI / 180);
                const a2 = ((i + 1) * 45 - 90 - 22.5) * (Math.PI / 180);
                const x1 = Math.cos(a1) * 95;
                const y1 = Math.sin(a1) * 95;
                const x2 = Math.cos(a2) * 95;
                const y2 = Math.sin(a2) * 95;
                const path = `M 0 0 L ${x1} ${y1} A 95 95 0 0 1 ${x2} ${y2} Z`;
                const labelAng = (i * 45 - 90) * (Math.PI / 180);
                const lx = Math.cos(labelAng) * 62;
                const ly = Math.sin(labelAng) * 62;
                const isJackpot = m === 1000;
                return (
                  <g key={i}>
                    <path
                      d={path}
                      fill={SEG_COLORS[i]}
                      stroke="rgba(255,200,80,0.4)"
                      strokeWidth="0.8"
                    />
                    <text
                      x={lx}
                      y={ly}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      transform={`rotate(${i * 45 + 22.5} ${lx} ${ly})`}
                      className={isJackpot ? "fill-amber-100" : "fill-white"}
                      style={{
                        fontSize: isJackpot ? "16px" : "14px",
                        fontWeight: 900,
                        fontFamily: "monospace",
                      }}
                    >
                      {m}×
                    </text>
                  </g>
                );
              })}
              <circle cx="0" cy="0" r="14" fill="#1a0f04" stroke="#ffb84a" strokeWidth="1.5" />
            </motion.svg>
          </div>

          <AnimatePresence>
            {phase === "reveal" && (
              <motion.div
                initial={{ y: 30, opacity: 0, scale: 0.6 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="relative mt-8 text-center"
              >
                <div className="text-xs text-amber-200/70 tracking-[0.4em] font-bold">
                  YOU WON
                </div>
                <div className="font-mono text-4xl sm:text-5xl font-black text-amber-200 mt-1 drop-shadow-[0_0_20px_rgba(255,200,80,0.8)]">
                  {targetMultiplier}×
                </div>
                <div className="text-sm font-bold text-amber-100/90 mt-1">
                  +{(betAmount * targetMultiplier).toLocaleString()} {unitLabel}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Snap any server multiplier to the closest wheel segment for visualization. */
export function snapToSegment(serverMult: number): number {
  return SEGMENTS.reduce((best, m) =>
    Math.abs(m - serverMult) < Math.abs(best - serverMult) ? m : best,
  ) as number;
}
