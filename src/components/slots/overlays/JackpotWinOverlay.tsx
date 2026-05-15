import { useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Crown, Sparkles, X } from "lucide-react";

type Props = {
  open: boolean;
  amount: number;
  gameTitle: string;
  onClose: () => void;
};

function fmt(n: number) {
  return Math.round(n).toLocaleString();
}

// Fire 36 confetti shards from center.
const SHARDS = Array.from({ length: 36 }).map((_, i) => ({
  id: i,
  angle: (i / 36) * Math.PI * 2,
  dist: 220 + Math.random() * 180,
  hue: [42, 16, 280, 200, 340][i % 5],
  delay: Math.random() * 0.15,
  rot: (Math.random() - 0.5) * 720,
}));

export default function JackpotWinOverlay({ open, amount, gameTitle, onClose }: Props) {
  const reduceMotion = useReducedMotion();
  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(onClose, 8000);
    return () => window.clearTimeout(t);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-background/85 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          {/* radial god-rays */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            aria-hidden
            style={{
              background:
                "radial-gradient(circle at 50% 50%, hsl(45 95% 60% / 0.35) 0%, transparent 55%)",
            }}
            animate={reduceMotion ? undefined : { scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* confetti — skipped under prefers-reduced-motion */}
          {!reduceMotion && (
            <div className="absolute left-1/2 top-1/2 pointer-events-none" aria-hidden>
              {SHARDS.map((s) => (
                <motion.span
                  key={s.id}
                  className="absolute block w-2 h-3 rounded-sm"
                  style={{
                    background: `hsl(${s.hue} 95% 60%)`,
                    boxShadow: `0 0 12px hsl(${s.hue} 95% 60% / 0.8)`,
                  }}
                  initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 1 }}
                  animate={{
                    x: Math.cos(s.angle) * s.dist,
                    y: Math.sin(s.angle) * s.dist + 200,
                    opacity: 0,
                    rotate: s.rot,
                    scale: 0.4,
                  }}
                  transition={{ duration: 2.6, delay: s.delay, ease: [0.2, 0.6, 0.4, 1] }}
                />
              ))}
            </div>
          )}
          {/* main card */}
          <motion.div
            className="relative max-w-md w-[90vw] mx-4 rounded-3xl border border-yellow-400/40 bg-gradient-to-b from-yellow-500/15 via-amber-500/10 to-orange-600/15 p-8 text-center shadow-[0_0_80px_-10px_hsl(45_95%_60%/0.6)]"
            initial={{ scale: 0.5, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", stiffness: 240, damping: 18 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-background/40 hover:bg-background/60 text-foreground/70"
              aria-label="닫기"
            >
              <X className="w-4 h-4" />
            </button>

            <motion.div
              className="mx-auto w-20 h-20 rounded-full flex items-center justify-center bg-gradient-to-br from-yellow-300 to-amber-600 shadow-[0_0_40px_hsl(45_95%_60%/0.7)]"
              animate={{ rotate: [0, -8, 8, -4, 4, 0], scale: [1, 1.08, 1] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            >
              <Crown className="w-11 h-11 text-yellow-50" />
            </motion.div>

            <motion.div
              className="mt-5 text-xs uppercase tracking-[0.4em] text-yellow-300/90 font-semibold flex items-center justify-center gap-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Sparkles className="w-3.5 h-3.5" />
              PROGRESSIVE JACKPOT
              <Sparkles className="w-3.5 h-3.5" />
            </motion.div>

            <motion.h2
              className="mt-2 text-3xl font-black text-yellow-50"
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.25, type: "spring", stiffness: 280 }}
            >
              JACKPOT!
            </motion.h2>

            <div className="text-xs text-foreground/60 mt-1">{gameTitle}</div>

            <motion.div
              className="mt-5 text-5xl font-black bg-gradient-to-b from-yellow-200 to-amber-500 bg-clip-text text-transparent tabular-nums"
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.45, type: "spring", stiffness: 220 }}
            >
              +{fmt(amount)}
            </motion.div>
            <div className="text-[11px] tracking-[0.3em] text-yellow-300/80 mt-1">PHON</div>

            <motion.button
              onClick={onClose}
              className="mt-7 w-full py-3 rounded-xl bg-gradient-to-r from-yellow-400 to-amber-500 text-yellow-950 font-bold text-sm hover:brightness-110 active:scale-[0.98] transition"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
            >
              수령 완료 — 계속 플레이
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
