// WizardMaxWinOverlay — 2000× 도달 시 Pentagram sweep → gold burst → rune storm → "WIZARD'S DECREE".
// WinCelebrationManager 위에 추가 cinematic 레이어. SSR safe / reduced-motion / 자동 dismiss.
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { Sparkles } from "lucide-react";
import {
  WinCelebrationManager,
  type CelebrationData,
} from "@/lib/celebration/WinCelebrationManager";
import { soundManager } from "@/lib/sounds/SlotSoundManager";

interface Props {
  triggerAt?: number;
  durationMs?: number;
}

const RUNE_GLYPHS = ["ᚠ", "ᚢ", "ᚦ", "ᚨ", "ᚱ", "ᚲ", "ᚷ", "ᚹ", "ᚺ", "ᛁ"];

export default function WizardMaxWinOverlay({ triggerAt = 2000, durationMs = 3400 }: Props) {
  const [data, setData] = useState<CelebrationData | null>(null);
  const lastFiredAt = useRef(0);
  const dismissTimer = useRef<number | null>(null);

  // Subscribe
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

  // Side effects: sound + confetti bursts
  useEffect(() => {
    if (!data) return;
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    // Sound — Facade. voice line 키가 없으면 procedural fallback.
    try { soundManager.play("legendary_win", 1.0); } catch { /* */ }
    try { soundManager.play("voice_wizard_decree", 0.95); } catch { /* */ }

    if (!reduced) {
      const isMobile = typeof window !== "undefined" && window.matchMedia?.("(max-width: 640px)").matches;
      const factor = isMobile ? 0.55 : 1;
      const goldViolet = ["#fbbf24", "#f59e0b", "#a78bfa", "#8b5cf6", "#22d3ee"];
      const burst = (delay: number, originY: number, scalar: number) => {
        window.setTimeout(() => {
          confetti({
            particleCount: Math.floor(220 * factor),
            spread: 130, startVelocity: 60, ticks: 280,
            origin: { x: 0.5, y: originY },
            colors: goldViolet, scalar, gravity: 0.85,
            disableForReducedMotion: true,
          });
        }, delay);
      };
      // Stage 2: gold burst centered + violet shockwave (delayed)
      burst(420, 0.5, 1.5);
      burst(720, 0.4, 1.2);
      // Stage 3: rune storm — confetti shapes 흉내 (반복)
      burst(1200, 0.25, 1.0);
      burst(1700, 0.65, 1.0);
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
          aria-label="Wizard Max Win"
          style={{ willChange: "opacity" }}
        >
          {/* Mystic gradient backdrop */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at 50% 50%, rgba(139,92,246,0.45) 0%, rgba(34,211,238,0.18) 38%, rgba(0,0,0,0.85) 100%)",
            }}
          />

          {/* Stage 1 — Pentagram sweep (SVG) */}
          <motion.svg
            className="absolute inset-0 m-auto"
            width="min(72vmin,640px)"
            height="min(72vmin,640px)"
            viewBox="-100 -100 200 200"
            initial={{ rotate: -90, opacity: 0, scale: 0.6 }}
            animate={{ rotate: 270, opacity: [0, 1, 0.55], scale: [0.6, 1.05, 1] }}
            transition={{ duration: 1.6, ease: "easeOut" }}
            style={{ willChange: "transform, opacity" }}
            aria-hidden
          >
            <defs>
              <radialGradient id="pent-fill" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(251,191,36,0.35)" />
                <stop offset="60%" stopColor="rgba(139,92,246,0.18)" />
                <stop offset="100%" stopColor="rgba(0,0,0,0)" />
              </radialGradient>
            </defs>
            <circle cx="0" cy="0" r="92" fill="url(#pent-fill)" />
            <motion.circle
              cx="0" cy="0" r="92"
              fill="none" stroke="#fbbf24" strokeWidth="1.5"
              strokeDasharray="600"
              initial={{ strokeDashoffset: 600 }}
              animate={{ strokeDashoffset: 0 }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              style={{ filter: "drop-shadow(0 0 8px rgba(251,191,36,0.9))" }}
            />
            <motion.polygon
              points={(() => {
                const pts: string[] = [];
                for (let i = 0; i < 5; i++) {
                  const a = (i * 4 * Math.PI) / 5 - Math.PI / 2;
                  pts.push(`${Math.cos(a) * 84},${Math.sin(a) * 84}`);
                }
                return pts.join(" ");
              })()}
              fill="none" stroke="#a78bfa" strokeWidth="1.6"
              strokeDasharray="800"
              initial={{ strokeDashoffset: 800 }}
              animate={{ strokeDashoffset: 0 }}
              transition={{ duration: 1.4, ease: "easeOut", delay: 0.15 }}
              style={{ filter: "drop-shadow(0 0 10px rgba(167,139,250,0.95))" }}
            />
          </motion.svg>

          {/* Edge flares */}
          <motion.div
            className="absolute left-0 top-0 h-full w-1/4"
            style={{
              background: "linear-gradient(90deg, rgba(139,92,246,0.7) 0%, rgba(139,92,246,0) 100%)",
              filter: "blur(28px)", willChange: "opacity, transform",
            }}
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: [0, 1, 0.7, 1], x: 0 }}
            transition={{ duration: 2.4, times: [0, 0.2, 0.6, 1] }}
          />
          <motion.div
            className="absolute right-0 top-0 h-full w-1/4"
            style={{
              background: "linear-gradient(270deg, rgba(251,191,36,0.65) 0%, rgba(251,191,36,0) 100%)",
              filter: "blur(28px)", willChange: "opacity, transform",
            }}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: [0, 1, 0.7, 1], x: 0 }}
            transition={{ duration: 2.4, times: [0, 0.2, 0.6, 1] }}
          />

          {/* Stage 3 — Magic Rune Storm (DOM 30개, GPU transform only) */}
          <div className="absolute inset-0 overflow-hidden" aria-hidden>
            {Array.from({ length: 30 }).map((_, i) => {
              const left = (i * 13 + 7) % 100;
              const delay = 0.6 + (i % 10) * 0.05;
              const dur = 2.2 + (i % 5) * 0.2;
              const glyph = RUNE_GLYPHS[i % RUNE_GLYPHS.length];
              const color = i % 3 === 0 ? "#fbbf24" : i % 3 === 1 ? "#a78bfa" : "#22d3ee";
              return (
                <motion.span
                  key={i}
                  className="absolute text-2xl sm:text-3xl font-bold select-none"
                  style={{
                    left: `${left}%`,
                    top: "-8%",
                    color,
                    textShadow: `0 0 12px ${color}`,
                    willChange: "transform, opacity",
                  }}
                  initial={{ y: 0, opacity: 0, rotate: 0 }}
                  animate={{ y: "120vh", opacity: [0, 1, 1, 0], rotate: 360 }}
                  transition={{ duration: dur, delay, ease: "easeIn" }}
                >
                  {glyph}
                </motion.span>
              );
            })}
          </div>

          {/* Stage 4 — Title slam */}
          <motion.div
            className="relative z-10 flex flex-col items-center text-center px-6"
            initial={{ scale: 0.4, opacity: 0, y: 30 }}
            animate={{ scale: [0.4, 1.18, 1], opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: "backOut", delay: 0.9 }}
            style={{ willChange: "transform, opacity" }}
          >
            <Sparkles
              className="h-20 w-20 sm:h-28 sm:w-28 text-amber-300 mb-3"
              style={{
                filter:
                  "drop-shadow(0 0 30px rgba(251,191,36,0.95)) drop-shadow(0 0 60px rgba(139,92,246,0.7))",
              }}
            />
            <div
              className="text-4xl sm:text-6xl font-black tracking-tight bg-gradient-to-r from-amber-200 via-violet-200 to-cyan-200 bg-clip-text text-transparent"
              style={{ filter: "drop-shadow(0 0 24px rgba(251,191,36,0.85))" }}
            >
              WIZARD'S DECREE
            </div>
            <div className="mt-1 text-2xl sm:text-4xl font-extrabold text-amber-100 tracking-wider"
              style={{ textShadow: "0 0 14px rgba(251,191,36,0.85)" }}
            >
              MAX WIN ×{Math.round(data.multiplier).toLocaleString()}
            </div>
            <div className="mt-3 text-lg sm:text-2xl font-semibold text-violet-100">
              +{data.totalWin.toLocaleString()} {data.unitLabel}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
