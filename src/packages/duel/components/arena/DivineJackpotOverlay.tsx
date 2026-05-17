/**
 * DivineJackpotOverlay — 풀스크린 Imperial Seal + Gold→HotPink particle storm.
 * Tier=divine 발생 시 마운트 → 3.2s 후 자동 dismiss.
 * canvas-confetti lazy import (기존 청크 재사용).
 */
import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Crown } from "lucide-react";

interface Props {
  open: boolean;
  winnerName: string;
  onDone: () => void;
}

export function DivineJackpotOverlay({ open, winnerName, onDone }: Props) {
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    let stopTime = Date.now() + 2400;
    (async () => {
      try {
        const mod = await import("canvas-confetti");
        if (cancelled) return;
        const fire = () => {
          if (cancelled || Date.now() > stopTime) return;
          mod.default({
            particleCount: 90,
            spread: 80,
            startVelocity: 55,
            origin: { y: 0.25, x: Math.random() },
            colors: ["#F5C518", "#F0B400", "#F472B6", "#EC4899", "#FFF7C2"],
            scalar: 1.05,
            ticks: 220,
          });
          window.setTimeout(fire, 220);
        };
        fire();
      } catch { /* ignore */ }
    })();
    const t = window.setTimeout(onDone, 3200);
    return () => { cancelled = true; window.clearTimeout(t); };
  }, [open, onDone]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="divine-overlay"
          className="fixed inset-0 z-[95] flex items-center justify-center pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          aria-hidden
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(60% 50% at 50% 45%, hsl(38 92% 50% / 0.55), transparent 70%), radial-gradient(80% 70% at 50% 55%, hsl(330 90% 55% / 0.45), transparent 75%), hsl(10 40% 4% / 0.55)",
              backdropFilter: "blur(6px)",
            }}
          />

          {/* Imperial Seal */}
          <motion.div
            initial={{ scale: 0.5, rotate: -20, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            exit={{ scale: 0.85, opacity: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 14 }}
            className="relative z-10 flex flex-col items-center"
            style={{ willChange: "transform, opacity" }}
          >
            <div
              className="relative w-44 h-44 md:w-56 md:h-56 rounded-full flex items-center justify-center"
              style={{
                background:
                  "conic-gradient(from 90deg, #F5C518, #F472B6, #F5C518, #FFD86B, #EC4899, #F5C518)",
                boxShadow:
                  "0 0 60px hsl(38 92% 60% / 0.75), 0 0 120px hsl(330 90% 60% / 0.55), inset 0 0 24px hsl(45 95% 70% / 0.5)",
                animation: "divine-spin 6s linear infinite",
              }}
            >
              <div
                className="absolute inset-2 rounded-full bg-[#0A0503] flex items-center justify-center"
                style={{ boxShadow: "inset 0 0 22px hsl(38 92% 60% / 0.45)" }}
              >
                <Crown className="w-20 h-20 md:w-28 md:h-28 text-amber-300" strokeWidth={1.2}
                       style={{ filter: "drop-shadow(0 0 18px hsl(38 92% 65% / 0.8))" }} />
              </div>
            </div>
            <div className="mt-5 text-center px-6">
              <div className="text-[10px] tracking-[0.4em] font-black uppercase text-pink-300/95"
                   style={{ textShadow: "0 0 12px hsl(330 90% 60% / 0.7)" }}>
                DIVINE · JACKPOT
              </div>
              <div className="font-imperial text-2xl md:text-3xl text-amber-100 mt-1 leading-tight"
                   style={{ textShadow: "0 0 18px hsl(38 92% 65% / 0.85)" }}>
                신성한 대관식입니다
              </div>
              <div className="font-imperial text-base md:text-lg text-amber-200/90 mt-1">
                {winnerName} 폐하 승전
              </div>
            </div>
          </motion.div>

          <style>{`@keyframes divine-spin { 0%{transform:rotate(0)} 100%{transform:rotate(360deg)} }`}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default DivineJackpotOverlay;
