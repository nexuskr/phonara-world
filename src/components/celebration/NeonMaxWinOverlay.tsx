// NeonMaxWinOverlay — 8888× 도달 시 Matrix rain + Neon explosion + Hacker label.
// WinCelebrationManager 위에 추가 레이어. SSR safe / reduced-motion / 자동 dismiss.
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { Zap } from "lucide-react";
import {
  WinCelebrationManager,
  type CelebrationData,
} from "@/lib/celebration/WinCelebrationManager";
import { soundManager } from "@/lib/sounds/SlotSoundManager";

interface Props {
  triggerAt?: number;
  durationMs?: number;
}

const MATRIX_CHARS = "アカサタナハマヤラワ0123456789@#$%";

export default function NeonMaxWinOverlay({ triggerAt = 8888, durationMs = 3200 }: Props) {
  const [data, setData] = useState<CelebrationData | null>(null);
  const lastFiredAt = useRef(0);
  const dismissTimer = useRef<number | null>(null);
  const matrixCanvas = useRef<HTMLCanvasElement>(null);

  // Subscribe to celebration manager
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

  // Side effects
  useEffect(() => {
    if (!data) return;
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    // 1) Hacker / legendary cue (Facade)
    try { soundManager.play("legendary_win", 1.0); } catch { /* */ }

    // 2) Neon explosion (반복 burst)
    if (!reduced) {
      const isMobile = typeof window !== "undefined" && window.matchMedia?.("(max-width: 640px)").matches;
      const factor = isMobile ? 0.5 : 1;
      const colors = ["#ff00ff", "#00f0ff", "#39ff14", "#f472b6", "#22d3ee"];
      const burst = (delay: number, originY: number) => {
        window.setTimeout(() => {
          confetti({
            particleCount: Math.floor(240 * factor),
            spread: 120, startVelocity: 65, ticks: 280,
            origin: { x: 0.5, y: originY },
            colors, scalar: 1.4, gravity: 0.85,
            disableForReducedMotion: true,
          });
        }, delay);
      };
      burst(0, 0.5);
      burst(400, 0.3);
      burst(900, 0.62);
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

  // Matrix rain on dedicated canvas (재사용 가능, 리듀스드 모션 시 정적)
  useEffect(() => {
    if (!data) return;
    const canvas = matrixCanvas.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const dpr = 1;
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      canvas.width = Math.floor(r.width) * dpr;
      canvas.height = Math.floor(r.height) * dpr;
    };
    resize();

    const fontSize = 16;
    const cols = Math.floor(canvas.width / fontSize);
    const ys: number[] = Array.from({ length: cols }, () => Math.random() * canvas.height);
    let raf = 0;
    let stopped = false;

    const tick = () => {
      if (stopped) return;
      ctx.fillStyle = "rgba(0,0,0,0.18)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = `${fontSize}px monospace`;
      ctx.fillStyle = "rgba(57,255,20,0.85)";
      for (let i = 0; i < cols; i++) {
        const ch = MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)];
        ctx.fillText(ch, i * fontSize, ys[i]);
        ys[i] += fontSize;
        if (ys[i] > canvas.height && Math.random() > 0.975) ys[i] = 0;
      }
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);

    return () => {
      stopped = true;
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [data]);

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
          aria-label="Neon Max Win"
          style={{ willChange: "opacity" }}
        >
          {/* Matrix rain canvas — full screen */}
          <canvas
            ref={matrixCanvas}
            aria-hidden
            className="absolute inset-0 w-full h-full"
            style={{ transform: "translate3d(0,0,0)", willChange: "transform" }}
          />
          {/* Cyberpunk gradient backdrop */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at 50% 50%, rgba(255,0,255,0.40) 0%, rgba(0,240,255,0.18) 40%, rgba(0,0,0,0.82) 100%)",
            }}
          />
          {/* Edge flares */}
          <motion.div
            className="absolute left-0 top-0 h-full w-1/4"
            style={{
              background: "linear-gradient(90deg, rgba(255,0,255,0.7) 0%, rgba(255,0,255,0) 100%)",
              filter: "blur(28px)", willChange: "opacity, transform",
            }}
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: [0, 1, 0.7, 1], x: 0 }}
            transition={{ duration: 2.2, times: [0, 0.2, 0.6, 1] }}
          />
          <motion.div
            className="absolute right-0 top-0 h-full w-1/4"
            style={{
              background: "linear-gradient(270deg, rgba(0,240,255,0.7) 0%, rgba(0,240,255,0) 100%)",
              filter: "blur(28px)", willChange: "opacity, transform",
            }}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: [0, 1, 0.7, 1], x: 0 }}
            transition={{ duration: 2.2, times: [0, 0.2, 0.6, 1] }}
          />
          {/* Hacker title */}
          <motion.div
            className="relative z-10 flex flex-col items-center text-center px-6"
            initial={{ scale: 0.4, opacity: 0, y: 30 }}
            animate={{ scale: [0.4, 1.18, 1], opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: "backOut" }}
            style={{ willChange: "transform, opacity" }}
          >
            <Zap
              className="h-20 w-20 sm:h-28 sm:w-28 text-lime-300 mb-3"
              style={{
                filter:
                  "drop-shadow(0 0 30px rgba(57,255,20,0.95)) drop-shadow(0 0 60px rgba(255,0,255,0.7))",
              }}
            />
            <div
              className="text-5xl sm:text-7xl font-black tracking-tight bg-gradient-to-r from-fuchsia-300 via-lime-300 to-cyan-300 bg-clip-text text-transparent"
              style={{ filter: "drop-shadow(0 0 24px rgba(255,0,255,0.9))" }}
            >
              SYSTEM HACKED
            </div>
            <div className="mt-1 text-2xl sm:text-4xl font-extrabold text-cyan-100 tracking-wider"
              style={{ textShadow: "0 0 14px rgba(0,240,255,0.85)" }}
            >
              MAX WIN ×{Math.round(data.multiplier).toLocaleString()}
            </div>
            <div className="mt-3 text-lg sm:text-2xl font-semibold text-lime-200">
              +{data.totalWin.toLocaleString()} {data.unitLabel}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
