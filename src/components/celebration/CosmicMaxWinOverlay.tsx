// CosmicMaxWinOverlay — multiplier ≥ MAX_TRIGGER 시 풀스크린 cinematic.
// WinCelebrationManager 위에 추가 레이어. WinCelebrationOverlay 와 공존(z-index 한 단계 위).
// SSR safe, prefers-reduced-motion, 자동 dismiss(3s), 메모리 누수 0.
import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { Crown } from "lucide-react";
import {
  WinCelebrationManager,
  type CelebrationData,
} from "@/lib/celebration/WinCelebrationManager";
import { soundManager } from "@/lib/sounds/SlotSoundManager";

interface Props {
  /** mult 이 이 값 이상이면 트리거 (기본 5000) */
  triggerAt?: number;
  /** 발동 후 자동 종료까지 ms (기본 3000) */
  durationMs?: number;
}

export default function CosmicMaxWinOverlay({ triggerAt = 5000, durationMs = 3000 }: Props) {
  const [data, setData] = useState<CelebrationData | null>(null);
  const lastFiredAt = useRef<number>(0);
  const dismissTimer = useRef<number | null>(null);

  useEffect(() => {
    const unsub = WinCelebrationManager.subscribe((s) => {
      if (!s) {
        setData(null);
        return;
      }
      // 동일 셀러브레이션 중복 트리거 방지
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

  // Side effects when active
  useEffect(() => {
    if (!data) return;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    // 1) Cosmic Emperor voice — facade를 통해서만
    try {
      soundManager.play("legendary_win", 1.0);
    } catch {
      /* facade fallback handles it */
    }

    // 2) Galaxy Explosion (다단 폭발) — reduced-motion 시 생략
    if (!reduced) {
      const isMobile =
        typeof window !== "undefined" && window.matchMedia?.("(max-width: 640px)").matches;
      const factor = isMobile ? 0.5 : 1;
      const colors = ["#a78bfa", "#22d3ee", "#f0abfc", "#fde047", "#67e8f9", "#c084fc"];
      const burst = (delay: number, originY: number) => {
        window.setTimeout(() => {
          confetti({
            particleCount: Math.floor(220 * factor),
            spread: 110,
            startVelocity: 60,
            ticks: 260,
            origin: { x: 0.5, y: originY },
            colors,
            scalar: 1.4,
            gravity: 0.85,
            disableForReducedMotion: true,
          });
        }, delay);
      };
      burst(0, 0.5);
      burst(450, 0.35);
      burst(900, 0.6);
    }

    // Auto dismiss
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
          aria-label="Cosmic Max Win"
          style={{ willChange: "opacity" }}
        >
          {/* Galaxy radial backdrop */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at 50% 50%, rgba(167,139,250,0.45) 0%, rgba(34,211,238,0.18) 40%, rgba(0,0,0,0.78) 100%)",
              transform: "translate3d(0,0,0)",
            }}
          />
          {/* Edge flares — left + right */}
          <motion.div
            className="absolute left-0 top-0 h-full w-1/4"
            style={{
              background:
                "linear-gradient(90deg, rgba(167,139,250,0.7) 0%, rgba(167,139,250,0) 100%)",
              filter: "blur(28px)",
              willChange: "opacity, transform",
            }}
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: [0, 1, 0.7, 1], x: 0 }}
            transition={{ duration: 2.2, times: [0, 0.2, 0.6, 1] }}
          />
          <motion.div
            className="absolute right-0 top-0 h-full w-1/4"
            style={{
              background:
                "linear-gradient(270deg, rgba(34,211,238,0.7) 0%, rgba(34,211,238,0) 100%)",
              filter: "blur(28px)",
              willChange: "opacity, transform",
            }}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: [0, 1, 0.7, 1], x: 0 }}
            transition={{ duration: 2.2, times: [0, 0.2, 0.6, 1] }}
          />
          {/* Crown burst */}
          <motion.div
            className="relative z-10 flex flex-col items-center text-center px-6"
            initial={{ scale: 0.4, opacity: 0, y: 30 }}
            animate={{ scale: [0.4, 1.18, 1], opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: "backOut" }}
            style={{ willChange: "transform, opacity" }}
          >
            <Crown
              className="h-20 w-20 sm:h-28 sm:w-28 text-yellow-300 mb-3"
              style={{
                filter:
                  "drop-shadow(0 0 30px rgba(253,224,71,0.9)) drop-shadow(0 0 60px rgba(167,139,250,0.7))",
              }}
            />
            <div
              className="text-5xl sm:text-7xl font-black tracking-tight bg-gradient-to-b from-yellow-200 via-fuchsia-300 to-cyan-300 bg-clip-text text-transparent"
              style={{
                filter: "drop-shadow(0 0 24px rgba(232,121,249,0.9))",
              }}
            >
              COSMIC EMPEROR
            </div>
            <div className="mt-1 text-2xl sm:text-4xl font-extrabold text-cyan-100 tracking-wider">
              MAX WIN ×{Math.round(data.multiplier).toLocaleString()}
            </div>
            <div className="mt-3 text-lg sm:text-2xl font-semibold text-yellow-200">
              +{data.totalWin.toLocaleString()} {data.unitLabel}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
