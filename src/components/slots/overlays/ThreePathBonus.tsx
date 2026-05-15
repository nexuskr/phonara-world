import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { Swords, Mountain, Skull } from "lucide-react";
import { splitSum, mulberry32 } from "./bonusSplit";

/** Viking Thunder — 3-path free spins. Path is "chosen" deterministically by total magnitude. */
export default function ThreePathBonus({
  show, targetMultiplier, betAmount, unitLabel, onComplete,
}: {
  show: boolean; targetMultiplier: number; betAmount: number; unitLabel: string;
  onComplete: (winAmount: number) => void;
}) {
  const seed = Math.floor(targetMultiplier * 100) + 451;
  const totalWin = Math.round(targetMultiplier * betAmount);

  // Path selection mirrors mechanic intent: small wins → Helheim chaos, big → Asgard
  const path = useMemo(() => {
    if (targetMultiplier >= 100) return { name: "ASGARD", spins: 7, accent: "#ffd76a", icon: Swords, bg: "from-amber-950/95 to-blue-950/95", note: "고배율 폭딜" };
    if (targetMultiplier >= 15) return { name: "MIDGARD", spins: 12, accent: "#9ec5ff", icon: Mountain, bg: "from-blue-950/95 to-stone-950/95", note: "안정 빌드업" };
    return { name: "HELHEIM", spins: 16, accent: "#ff8e8e", icon: Skull, bg: "from-stone-950/95 to-red-950/95", note: "변동 폭탄" };
  }, [targetMultiplier]);

  const [phase, setPhase] = useState<"choose" | "spinning" | "done">("choose");
  const [spin, setSpin] = useState(0);
  const [winSoFar, setWinSoFar] = useState(0);
  const [bursts, setBursts] = useState<{ x: number; m: number }[]>([]);

  useEffect(() => {
    if (!show) { setPhase("choose"); setSpin(0); setWinSoFar(0); setBursts([]); return; }
    let cancelled = false;
    const winSeq = splitSum(totalWin, path.spins, seed);
    const rnd = mulberry32(seed + 31);
    const run = async () => {
      await new Promise((r) => setTimeout(r, 1300));
      if (cancelled) return;
      setPhase("spinning");
      for (let i = 0; i < path.spins; i++) {
        if (cancelled) return;
        await new Promise((r) => setTimeout(r, 280));
        setSpin(i + 1);
        setWinSoFar((w) => w + winSeq[i]);
        if (winSeq[i] > totalWin / path.spins * 1.6) {
          setBursts((arr) => [...arr.slice(-6), { x: rnd() * 280, m: winSeq[i] }]);
        }
      }
      setPhase("done");
      await new Promise((r) => setTimeout(r, 900));
      if (!cancelled) onComplete(totalWin);
    };
    run();
    return () => { cancelled = true; };
  }, [show, path, totalWin, seed, onComplete]);

  const Icon = path.icon;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="absolute inset-0 z-40 flex flex-col items-center justify-center pointer-events-auto"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          <div className={`absolute inset-0 bg-gradient-to-b ${path.bg} backdrop-blur-md`} />
          <div className="relative text-center mb-2">
            <div className="font-imperial text-2xl sm:text-3xl tracking-[0.22em]" style={{ color: path.accent, textShadow: `0 0 14px ${path.accent}66` }}>
              {phase === "choose" ? "PATH CHOSEN" : "THUNDER PATH"}
            </div>
            <div className="text-[11px] text-blue-100/80 tracking-[0.3em] mt-1">
              {phase === "spinning" ? `SPIN ${spin}/${path.spins}` : path.note}
            </div>
          </div>
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
            className="relative flex items-center gap-3 px-6 py-3 rounded-2xl border-2 bg-black/50"
            style={{ borderColor: `${path.accent}90`, boxShadow: `0 0 32px ${path.accent}55` }}
          >
            <Icon className="w-7 h-7" style={{ color: path.accent }} />
            <div>
              <div className="font-imperial text-xl tracking-[0.3em]" style={{ color: path.accent }}>{path.name}</div>
              <div className="text-[10px] text-blue-100/70 tracking-widest">{path.spins} FREE SPINS</div>
            </div>
          </motion.div>
          <div className="relative w-[300px] h-[60px] mt-4 rounded-md bg-black/40 border border-white/10 overflow-hidden">
            {bursts.map((b, i) => (
              <motion.div key={i}
                initial={{ y: 60, opacity: 0, scale: 0.6 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                className="absolute font-mono font-black text-xs"
                style={{ left: `${b.x}px`, top: 6, color: path.accent, textShadow: `0 0 8px ${path.accent}` }}
              >
                +{Math.round(b.m).toLocaleString()}
              </motion.div>
            ))}
            <motion.div
              className="absolute bottom-0 left-0 h-1"
              style={{ background: path.accent }}
              animate={{ width: `${(spin / path.spins) * 100}%` }}
              transition={{ duration: 0.2 }}
            />
          </div>
          <div className="relative mt-4 text-center">
            <div className="text-[10px] tracking-widest" style={{ color: path.accent }}>RAID TOTAL</div>
            <div className="font-mono text-2xl sm:text-3xl font-black tabular-nums" style={{ color: path.accent }}>
              +{Math.round(winSoFar).toLocaleString()} {unitLabel}
            </div>
            <div className="text-[11px] text-blue-100/70 mt-1">{targetMultiplier.toFixed(2)}×</div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
