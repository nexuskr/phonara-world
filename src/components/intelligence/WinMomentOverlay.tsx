import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, Sparkles, Trophy } from "lucide-react";
import CountUp from "./CountUp";

export interface WinMoment {
  id: string;
  pnl: number;
  roi: number;
  symbol: string;
  side: "long" | "short";
  leverage: number;
  level: "small" | "big" | "huge";
}

let _push: ((m: WinMoment) => void) | null = null;

export function pushWinMoment(m: WinMoment) {
  _push?.(m);
}

export default function WinMomentOverlay() {
  const [moment, setMoment] = useState<WinMoment | null>(null);

  useEffect(() => {
    _push = (m) => {
      setMoment(m);
      window.setTimeout(() => setMoment((cur) => (cur?.id === m.id ? null : cur)), m.level === "huge" ? 3200 : m.level === "big" ? 2400 : 1600);
    };
    return () => { _push = null; };
  }, []);

  return (
    <AnimatePresence>
      {moment && (
        <motion.div
          key={moment.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none"
        >
          <motion.div
            initial={{ scale: 0.5, y: 30, rotate: -4 }}
            animate={{ scale: 1, y: 0, rotate: 0 }}
            exit={{ scale: 0.6, y: -20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 18 }}
            className="px-8 py-6 rounded-3xl border border-primary/60 bg-background/80 backdrop-blur-2xl shadow-[0_0_120px_hsl(45_88%_55%/0.45)] text-center"
          >
            <div className="flex items-center justify-center gap-2 text-primary text-xs tracking-[0.3em] font-bold">
              {moment.level === "huge" ? <Trophy className="w-4 h-4" /> : moment.level === "big" ? <Flame className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
              {moment.level === "huge" ? "LEGENDARY WIN" : moment.level === "big" ? "BIG WIN" : "WIN"}
            </div>
            <div className="mt-3 font-display font-black text-5xl sm:text-6xl text-primary drop-shadow-[0_0_24px_hsl(45_88%_55%/0.6)]">
              <CountUp value={moment.pnl} prefix="+" suffix=" USDT" decimals={2} duration={900} />
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              {moment.symbol} · <span className={moment.side === "long" ? "text-emerald-400" : "text-rose-400"}>
                {moment.side.toUpperCase()}
              </span> · {moment.leverage}× · ROI <span className="text-primary font-bold">{(moment.roi * 100).toFixed(1)}%</span>
            </div>
            <div className="mt-1 text-[10px] text-muted-foreground/70">Paper Trading 시뮬레이션</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
