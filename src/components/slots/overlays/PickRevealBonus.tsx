import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { Gem } from "lucide-react";
import { splitSum, mulberry32 } from "./bonusSplit";

/** Pharaoh's Vault — Pick & Reveal. 9 sarcophagi, server total split into 3 prizes (+ bombs). */
export default function PickRevealBonus({
  show, targetMultiplier, betAmount, unitLabel, onComplete,
}: {
  show: boolean; targetMultiplier: number; betAmount: number; unitLabel: string;
  onComplete: (winAmount: number) => void;
}) {
  const seed = Math.floor(targetMultiplier * 100) + 23;
  const totalWin = Math.round(targetMultiplier * betAmount);
  const isJackpot = targetMultiplier >= 1000;
  const PICKS = 3;

  // 9 cells; 3 are real prizes summing to total, 1 is JACKPOT marker (if jackpot), rest are stop tokens
  const layout = useMemo(() => {
    const rnd = mulberry32(seed);
    const prizes = splitSum(totalWin, PICKS, seed + 1).map((v) => Math.max(1, Math.round(v)));
    const cells: { kind: "prize" | "stop" | "jackpot"; value: number }[] = Array.from({ length: 9 }, () => ({ kind: "stop" as const, value: 0 }));
    const slots = Array.from({ length: 9 }, (_, i) => i);
    for (let i = slots.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [slots[i], slots[j]] = [slots[j], slots[i]];
    }
    for (let p = 0; p < PICKS; p++) {
      cells[slots[p]] = isJackpot && p === 0 ? { kind: "jackpot", value: prizes[0] } : { kind: "prize", value: prizes[p] };
    }
    return cells;
  }, [seed, totalWin, isJackpot]);

  // Auto-pick the 3 prize cells in order
  const [picked, setPicked] = useState<number[]>([]);
  const [winSoFar, setWinSoFar] = useState(0);

  useEffect(() => {
    if (!show) { setPicked([]); setWinSoFar(0); return; }
    let cancelled = false;
    const order = layout
      .map((c, i) => ({ c, i }))
      .filter(({ c }) => c.kind !== "stop")
      .map(({ i }) => i);
    const run = async () => {
      for (let p = 0; p < order.length; p++) {
        if (cancelled) return;
        await new Promise((r) => setTimeout(r, 900));
        const idx = order[p];
        setPicked((arr) => [...arr, idx]);
        setWinSoFar((w) => w + layout[idx].value);
      }
      await new Promise((r) => setTimeout(r, 1300));
      if (!cancelled) onComplete(totalWin);
    };
    run();
    return () => { cancelled = true; };
  }, [show, layout, totalWin, onComplete]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="absolute inset-0 z-40 flex flex-col items-center justify-center pointer-events-auto"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-amber-950/95 via-stone-950/95 to-blue-950/95 backdrop-blur-md" />
          <div className="relative text-center mb-3">
            <div className="font-imperial text-2xl sm:text-3xl text-gradient-imperial tracking-[0.22em]">PHARAOH'S PICK</div>
            <div className="text-[11px] text-amber-200/80 tracking-[0.3em] mt-1">REVEAL {picked.length}/{PICKS}</div>
          </div>
          <div className="relative grid grid-cols-3 gap-2 p-3 rounded-xl border border-amber-400/40 bg-black/50">
            {layout.map((c, idx) => {
              const isOpen = picked.includes(idx);
              return (
                <motion.div
                  key={idx}
                  className="relative w-16 h-20 sm:w-20 sm:h-24 rounded-md flex items-center justify-center"
                  animate={isOpen ? { rotateY: 180 } : { rotateY: 0 }}
                  transition={{ duration: 0.6, type: "spring", stiffness: 200, damping: 18 }}
                  style={{ transformStyle: "preserve-3d" as any }}
                >
                  <div className="absolute inset-0 rounded-md border-2 border-amber-700/70 bg-gradient-to-b from-amber-900 to-stone-950 flex items-center justify-center"
                    style={{ backfaceVisibility: "hidden" as any }}>
                    <span className="font-imperial text-2xl text-amber-300/90">𓂀</span>
                  </div>
                  <div className="absolute inset-0 rounded-md border-2 border-amber-300 bg-gradient-to-br from-amber-300 to-orange-600 flex flex-col items-center justify-center text-stone-900 font-black"
                    style={{ backfaceVisibility: "hidden" as any, transform: "rotateY(180deg)" }}>
                    {c.kind === "jackpot" ? (
                      <>
                        <span className="text-[10px] tracking-widest">JACKPOT</span>
                        <span className="text-sm tabular-nums">+{c.value.toLocaleString()}</span>
                      </>
                    ) : (
                      <span className="text-sm tabular-nums">+{c.value.toLocaleString()}</span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
          <div className="relative mt-4 text-center">
            <div className="text-[10px] text-amber-200/70 tracking-widest">VAULT TOTAL</div>
            <div className="font-mono text-2xl sm:text-3xl font-black text-amber-300 tabular-nums">
              +{Math.round(winSoFar).toLocaleString()} {unitLabel}
            </div>
            <div className="flex items-center justify-center gap-1 mt-1 text-[11px] text-amber-200/70">
              <Gem className="w-3 h-3" /> {targetMultiplier.toFixed(2)}×{isJackpot ? " · JACKPOT" : ""}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
