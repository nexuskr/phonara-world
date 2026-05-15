// DragonMaxWinOverlay — Max Win 도달 시 Dragon Roar + Lava Eruption + ember storm.
// WinCelebrationManager 위에 추가 cinematic 레이어. SSR safe / reduced-motion / 자동 dismiss.
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { Flame } from "lucide-react";
import {
  WinCelebrationManager,
  type CelebrationData,
} from "@/lib/celebration/WinCelebrationManager";
import { soundManager } from "@/lib/sounds/SlotSoundManager";

interface Props {
  triggerAt?: number;
  durationMs?: number;
}

export default function DragonMaxWinOverlay({ triggerAt = 500, durationMs = 3200 }: Props) {
  const [data, setData] = useState<CelebrationData | null>(null);
  const lastFiredAt = useRef(0);
  const dismissTimer = useRef<number | null>(null);

  useEffect(() => {
    const unsub = WinCelebrationManager.subscribe((s) => {
      if (!s) { setData(null); return; }
      if (s.startedAt === lastFiredAt.current) return;
      if (s.multiplier >= triggerAt * 0.999) {
        lastFiredAt.current = s.startedAt;
        setData(s);
      }
    });
    return () => {
      unsub();
      if (dismissTimer.current) {
        window.clearTimeout(dismissTimer.current);
        dismissTimer.current = null;
      }
    };
  }, [triggerAt]);

  useEffect(() => {
    if (!data) return;
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    try { soundManager.play("legendary_win", 1.0); } catch { /* */ }
    try { soundManager.play("voice_dragon_roar", 0.95); } catch { /* */ }

    if (!reduced) {
      const isMobile = typeof window !== "undefined" && window.matchMedia?.("(max-width: 640px)").matches;
      const factor = isMobile ? 0.55 : 1;
      const colors = ["#ef4444", "#f97316", "#fbbf24", "#fde047", "#dc2626"];
      const burst = (delay: number, originY: number, scalar: number) => {
        window.setTimeout(() => {
          confetti({
            particleCount: Math.floor(220 * factor),
            spread: 130, startVelocity: 70, ticks: 280,
            origin: { x: 0.5, y: originY },
            colors, scalar, gravity: 1.0,
            disableForReducedMotion: true,
          });
        }, delay);
      };
      // Lava eruption — 하단에서 위로 폭발
      burst(0, 0.95, 1.6);
      burst(380, 0.92, 1.4);
      burst(820, 0.5, 1.2);
    }

    dismissTimer.current = window.setTimeout(() => {
      setData(null);
      dismissTimer.current = null;
    }, durationMs);

    return () => {
      if (dismissTimer.current) {
        window.clearTimeout(dismissTimer.current);
        dismissTimer.current = null;
      }
    };
  }, [data, durationMs]);

  return (
    <AnimatePresence>
      {data && (
        <motion.div
          key={data.startedAt}
          className="fixed inset-0 z-[210] pointer-events-none flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          aria-live="polite"
          aria-label="Dragon Max Win"
          style={{ willChange: "opacity" }}
        >
          {/* Lava radial backdrop */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at 50% 80%, rgba(249,115,22,0.50) 0%, rgba(239,68,68,0.22) 38%, rgba(0,0,0,0.85) 100%)",
            }}
          />
          {/* Edge flares — red left + gold right */}
          <motion.div
            className="absolute left-0 top-0 h-full w-1/4"
            style={{
              background: "linear-gradient(90deg, rgba(239,68,68,0.7) 0%, rgba(239,68,68,0) 100%)",
              filter: "blur(28px)", willChange: "opacity, transform",
            }}
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: [0, 1, 0.7, 1], x: 0 }}
            transition={{ duration: 2.2, times: [0, 0.2, 0.6, 1] }}
          />
          <motion.div
            className="absolute right-0 top-0 h-full w-1/4"
            style={{
              background: "linear-gradient(270deg, rgba(251,191,36,0.7) 0%, rgba(251,191,36,0) 100%)",
              filter: "blur(28px)", willChange: "opacity, transform",
            }}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: [0, 1, 0.7, 1], x: 0 }}
            transition={{ duration: 2.2, times: [0, 0.2, 0.6, 1] }}
          />

          {/* Lava bottom shockwave */}
          <motion.div
            className="absolute left-0 right-0 bottom-0 h-1/2"
            style={{
              background:
                "linear-gradient(0deg, rgba(249,115,22,0.85) 0%, rgba(239,68,68,0.45) 40%, rgba(0,0,0,0) 100%)",
              willChange: "transform, opacity",
            }}
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: [0, 1, 0.7, 1] }}
            transition={{ duration: 1.6, ease: "easeOut" }}
          />

          {/* Ember storm — 18개 위로 부유 */}
          <div className="absolute inset-0 overflow-hidden" aria-hidden>
            {Array.from({ length: 18 }).map((_, i) => {
              const left = (i * 17 + 11) % 100;
              const delay = (i % 9) * 0.06;
              const dur = 1.8 + (i % 4) * 0.25;
              const color = i % 3 === 0 ? "#ef4444" : i % 3 === 1 ? "#f97316" : "#fbbf24";
              return (
                <motion.span
                  key={i}
                  className="absolute rounded-full"
                  style={{
                    left: `${left}%`,
                    bottom: "-4%",
                    width: 8, height: 8,
                    background: color,
                    boxShadow: `0 0 12px ${color}`,
                    willChange: "transform, opacity",
                  }}
                  initial={{ y: 0, opacity: 0 }}
                  animate={{ y: "-110vh", opacity: [0, 1, 1, 0] }}
                  transition={{ duration: dur, delay, ease: "easeOut" }}
                />
              );
            })}
          </div>

          {/* Title slam */}
          <motion.div
            className="relative z-10 flex flex-col items-center text-center px-6"
            initial={{ scale: 0.4, opacity: 0, y: 30 }}
            animate={{ scale: [0.4, 1.18, 1], opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: "backOut" }}
            style={{ willChange: "transform, opacity" }}
          >
            <Flame
              className="h-20 w-20 sm:h-28 sm:w-28 text-amber-300 mb-3"
              style={{
                filter:
                  "drop-shadow(0 0 30px rgba(251,191,36,0.95)) drop-shadow(0 0 60px rgba(239,68,68,0.7))",
              }}
            />
            <div
              className="text-5xl sm:text-7xl font-black tracking-tight bg-gradient-to-b from-amber-200 via-orange-300 to-red-400 bg-clip-text text-transparent"
              style={{ filter: "drop-shadow(0 0 24px rgba(249,115,22,0.9))" }}
            >
              DRAGON ROAR
            </div>
            <div className="mt-1 text-2xl sm:text-4xl font-extrabold text-amber-100 tracking-wider"
              style={{ textShadow: "0 0 14px rgba(251,191,36,0.85)" }}
            >
              MAX WIN ×{Math.round(data.multiplier).toLocaleString()}
            </div>
            <div className="mt-3 text-lg sm:text-2xl font-semibold text-orange-200">
              +{data.totalWin.toLocaleString()} {data.unitLabel}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
