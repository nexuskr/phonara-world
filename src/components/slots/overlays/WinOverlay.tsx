import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import BalanceTicker from "../BalanceTicker";

export type WinTier = "big" | "mega" | "epic";

export function classifyWin(mult: number): WinTier | null {
  if (mult >= 200) return "epic";
  if (mult >= 50) return "mega";
  if (mult >= 10) return "big";
  return null;
}

const TIER_LABEL: Record<WinTier, string> = {
  big: "BIG WIN",
  mega: "MEGA WIN",
  epic: "EPIC WIN",
};

const TIER_COLOR: Record<WinTier, string> = {
  big: "from-amber-400 to-orange-500",
  mega: "from-amber-300 via-yellow-400 to-orange-600",
  epic: "from-pink-400 via-amber-300 to-orange-500",
};

export default function WinOverlay({
  show,
  tier,
  amount,
  unitLabel,
  onClose,
}: {
  show: boolean;
  tier: WinTier;
  amount: number;
  unitLabel: string;
  onClose: () => void;
}) {
  const [animValue, setAnimValue] = useState(0);
  useEffect(() => {
    if (!show) return;
    setAnimValue(0);
    const id = setTimeout(() => setAnimValue(amount), 60);
    const auto = setTimeout(onClose, tier === "epic" ? 4500 : tier === "mega" ? 3500 : 2500);
    return () => {
      clearTimeout(id);
      clearTimeout(auto);
    };
  }, [show, amount, tier, onClose]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="absolute inset-0 z-30 flex items-center justify-center pointer-events-auto cursor-pointer"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          {tier === "epic" && (
            <div className="absolute inset-0 overflow-hidden">
              {Array.from({ length: 24 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 rounded-full bg-amber-300"
                  initial={{
                    x: "50%",
                    y: "50%",
                    opacity: 1,
                    scale: 0,
                  }}
                  animate={{
                    x: `${50 + (Math.random() - 0.5) * 120}%`,
                    y: `${50 + (Math.random() - 0.5) * 120}%`,
                    opacity: 0,
                    scale: [0, 1.4, 0.6],
                  }}
                  transition={{ duration: 1.6, delay: Math.random() * 0.4, repeat: Infinity }}
                />
              ))}
            </div>
          )}
          <motion.div
            initial={{ scale: 0.5, rotate: -8, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            exit={{ scale: 1.4, opacity: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 14 }}
            className={`relative px-8 py-6 rounded-3xl bg-gradient-to-br ${TIER_COLOR[tier]} shadow-[0_0_60px_rgba(255,200,80,0.7)] text-center`}
          >
            <div className="font-imperial text-xs text-black/70 tracking-[0.4em]">
              {TIER_LABEL[tier]}
            </div>
            <div className="font-mono text-5xl sm:text-6xl font-black text-black mt-2">
              <BalanceTicker
                value={animValue}
                duration={tier === "epic" ? 2200 : tier === "mega" ? 1600 : 1100}
              />
            </div>
            <div className="text-sm font-bold text-black/80 mt-1 tracking-wider">
              {unitLabel}
            </div>
            <div className="text-[10px] text-black/60 mt-3 tracking-widest">
              탭하여 닫기
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
