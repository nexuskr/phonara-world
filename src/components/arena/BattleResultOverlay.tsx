import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, RotateCcw, Sparkles } from "lucide-react";
import { formatKRW } from "@/lib/store";
import type { Side } from "@/lib/trading/armyMapping";
import { useNowTick } from "@/hooks/use-now-tick";

type Result = "win" | "loss" | "near_miss";

type Props = {
  open: boolean;
  result: Result | null;
  side: Side | null;
  pnlPct: number;
  size: number;       // USDT
  entryPrice: number;
  onClose: () => void;
  onRecovery?: () => void;   // Near miss → recovery 베팅
};

const COPY: Record<Result, { emoji: string; title: (s: Side) => string; tone: string; sub: string }> = {
  win:       { emoji: "🏆", title: (s) => `${s === "long" ? "Conquest" : "Raid"} 승리`, tone: "text-money-strong", sub: "영광스러운 진군" },
  loss:      { emoji: "💀", title: () => "제국 함락", tone: "text-rose-400", sub: "다음 승부를 준비하소서" },
  near_miss: { emoji: "⚠️", title: () => "적장 도주 — Near Miss", tone: "text-gold", sub: "30초 안에 Recovery 발동" },
};

export default function BattleResultOverlay({ open, result, side, pnlPct, size, entryPrice, onClose, onRecovery }: Props) {
  const startRef = useRef<number>(0);
  const [counter, setCounter] = useState(30);
  const tickNow = useNowTick(1000);
  useEffect(() => {
    if (!open || result !== "near_miss") { setCounter(30); startRef.current = 0; return; }
    if (!startRef.current) startRef.current = Date.now();
  }, [open, result]);
  useEffect(() => {
    if (!open || result !== "near_miss" || !startRef.current) return;
    const elapsed = Math.floor((tickNow - startRef.current) / 1000);
    setCounter(Math.max(0, 30 - elapsed));
  }, [tickNow, open, result]);

  if (!result || !side) return null;
  const c = COPY[result];
  const pnlKRW = Math.floor(size * 1300 * (pnlPct / 100));

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] bg-background/85 backdrop-blur-sm flex items-center justify-center p-5"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9 }}
            onClick={(e) => e.stopPropagation()}
            className="relative glass-strong neon-border rounded-3xl p-6 max-w-sm w-full text-center"
          >
            <button onClick={onClose} className="absolute top-3 right-3 w-8 h-8 rounded-full glass flex items-center justify-center" aria-label="닫기">
              <X className="w-4 h-4" />
            </button>
            <motion.div
              initial={{ scale: 0 }} animate={{ scale: 1, rotate: result === "win" ? [0, -10, 10, 0] : 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="text-6xl mb-3"
            >
              {c.emoji}
            </motion.div>
            <h3 className="font-imperial text-2xl mb-1">{c.title(side)}</h3>
            <p className="text-[11px] text-muted-foreground mb-3">{c.sub}</p>
            <div className={`text-3xl font-display font-black tabular-nums my-3 ${c.tone}`}>
              {pnlPct >= 0 ? "+" : ""}{pnlPct.toFixed(3)}%
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              {size} USDT · {formatKRW(pnlKRW)} · 진입 ${entryPrice.toFixed(2)}
            </p>

            {result === "near_miss" && onRecovery && counter > 0 && (
              <motion.button
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                onClick={onRecovery}
                className="press w-full min-h-[52px] rounded-xl bg-gradient-to-r from-amber-500 to-gold text-black font-display font-black mb-2 flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Recovery Bonus 발동 · {counter}s
              </motion.button>
            )}

            <button
              onClick={onClose}
              className="press w-full min-h-[52px] rounded-xl bg-gradient-primary text-primary-foreground font-display font-black flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              다시 출진
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
