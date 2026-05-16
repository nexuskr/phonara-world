// WinCelebrationOverlay — fullscreen pure-presentation. Pub/sub via WinCelebrationManager.
// Tier별: color, particle, font, glow, voice/extras. Mobile-friendly + reduced-motion safe.
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { Sparkles, Crown } from "lucide-react";
import {
  WinCelebrationManager,
  type CelebrationData,
} from "@/lib/celebration/WinCelebrationManager";
import { TIER_LABEL, type WinTier } from "@/lib/sounds/soundConfig";
import { setVisibleInterval } from "@/lib/util/visible-interval";

const TIER_GRADIENT: Record<WinTier, string> = {
  big: "from-amber-300 via-orange-400 to-amber-500",
  mega: "from-yellow-300 via-amber-400 to-orange-600",
  epic: "from-pink-400 via-amber-300 to-orange-500",
  legendary: "from-fuchsia-400 via-amber-200 to-yellow-400",
};

const TIER_GLOW: Record<WinTier, string> = {
  big: "drop-shadow(0 0 24px rgba(251,191,36,0.55))",
  mega: "drop-shadow(0 0 36px rgba(251,146,60,0.7))",
  epic: "drop-shadow(0 0 48px rgba(244,114,182,0.7))",
  legendary: "drop-shadow(0 0 60px rgba(232,121,249,0.85)) drop-shadow(0 0 90px rgba(250,204,21,0.6))",
};

const TIER_FONT_SIZE: Record<WinTier, string> = {
  big: "text-4xl sm:text-6xl",
  mega: "text-5xl sm:text-7xl",
  epic: "text-6xl sm:text-8xl",
  legendary: "text-7xl sm:text-9xl",
};

const PARTICLE_COLORS: Record<string, string[]> = {
  default:   ["#fde047", "#f59e0b", "#fb923c", "#fbbf24"],
  cosmic:    ["#a78bfa", "#22d3ee", "#f0abfc", "#fde047", "#67e8f9"],
  neon:      ["#22d3ee", "#f0abfc", "#a3e635", "#f472b6"],
  pirate:    ["#fbbf24", "#92400e", "#fde68a", "#dc2626"],
  pharaoh:   ["#fde047", "#eab308", "#ca8a04", "#fef3c7"],
  viking:    ["#94a3b8", "#3b82f6", "#fde047", "#cbd5e1"],
  aztec:     ["#84cc16", "#f97316", "#fde047", "#16a34a"],
  sakura:    ["#fbcfe8", "#f9a8d4", "#fde047", "#ffffff"],
  dragon:    ["#dc2626", "#fbbf24", "#fb923c", "#7f1d1d"],
  wizard:    ["#a78bfa", "#67e8f9", "#fde047", "#c084fc"],
  olympus:   ["#fde047", "#fbbf24", "#fb923c", "#ffffff"],
};

function fireConfetti(tier: WinTier, themeKey?: string, prefersReduced = false) {
  if (prefersReduced) return;
  const colors = PARTICLE_COLORS[themeKey ?? "default"] ?? PARTICLE_COLORS.default;
  const counts = { big: 80, mega: 160, epic: 260, legendary: 380 } as const;
  const total = counts[tier];

  // Burst from both sides
  const fire = (origin: { x: number; y: number }, particleCount: number, spread: number) => {
    confetti({
      particleCount, spread, startVelocity: 50, ticks: 220,
      origin, colors, scalar: tier === "legendary" ? 1.4 : 1.1,
      gravity: 0.9, drift: (Math.random() - 0.5) * 0.4,
      disableForReducedMotion: true,
    });
  };

  fire({ x: 0.2, y: 0.7 }, Math.floor(total * 0.35), 70);
  fire({ x: 0.8, y: 0.7 }, Math.floor(total * 0.35), 70);
  fire({ x: 0.5, y: 0.4 }, Math.floor(total * 0.4), 110);

  if (tier === "epic" || tier === "legendary") {
    // Coin cascade — repeated bursts
    let bursts = tier === "legendary" ? 8 : 5;
    const interval = setVisibleInterval(() => {
      if (--bursts <= 0) { interval(); return; }
      confetti({
        particleCount: 60, angle: 90, spread: 100,
        origin: { x: Math.random() * 0.8 + 0.1, y: 0 },
        colors, gravity: 1.2, scalar: 1.2, ticks: 200,
        disableForReducedMotion: true,
      });
    }, 220 , { meta: { owner: "WinCelebrationOverlay", category: "cosmetic" } });
  }
}

function useReducedMotion() {
  const [r, setR] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setR(mq.matches);
    const fn = (e: MediaQueryListEvent) => setR(e.matches);
    mq.addEventListener?.("change", fn);
    return () => mq.removeEventListener?.("change", fn);
  }, []);
  return r;
}

export default function WinCelebrationOverlay() {
  const [state, setState] = useState<CelebrationData | null>(WinCelebrationManager.getCurrent());
  useEffect(() => WinCelebrationManager.subscribe(setState), []);
  const reduced = useReducedMotion();
  const lastIdRef = useRef<number>(0);

  // Confetti burst on each new celebration
  useEffect(() => {
    if (!state) return;
    if (state.startedAt === lastIdRef.current) return;
    lastIdRef.current = state.startedAt;
    fireConfetti(state.tier, state.themeKey, reduced);
  }, [state, reduced]);

  // Animated count-up
  const display = useCountUp(state?.totalWin ?? 0, state ? Math.min(2000, state.durationMs - 400) : 600);

  return (
    <AnimatePresence>
      {state && (
        <motion.div
          key={state.startedAt}
          className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-auto cursor-pointer overflow-hidden"
          onClick={() => WinCelebrationManager.endCurrent()}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          aria-live="assertive"
          aria-label={`${TIER_LABEL[state.tier]} ${state.totalWin}`}
        >
          {/* Backdrop flash */}
          <motion.div
            className="absolute inset-0 bg-black/65"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.85, 0.65] }}
            transition={{ duration: 0.6 }}
          />
          {/* Radial glow */}
          <motion.div
            className="absolute inset-0"
            style={{
              background:
                state.tier === "legendary"
                  ? "radial-gradient(circle at 50% 45%, rgba(250,204,21,0.45), rgba(232,121,249,0.25) 40%, transparent 70%)"
                  : state.tier === "epic"
                  ? "radial-gradient(circle at 50% 45%, rgba(244,114,182,0.4), transparent 65%)"
                  : state.tier === "mega"
                  ? "radial-gradient(circle at 50% 45%, rgba(251,146,60,0.35), transparent 60%)"
                  : "radial-gradient(circle at 50% 45%, rgba(251,191,36,0.3), transparent 55%)",
            }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          />

          {/* Cosmic-only edge flares */}
          {state.themeKey === "cosmic" && state.tier === "legendary" && !reduced && (
            <>
              <motion.div
                className="absolute -left-32 top-0 h-full w-64"
                style={{ background: "linear-gradient(90deg, rgba(167,139,250,0.6), transparent)" }}
                initial={{ x: -200, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.7 }}
              />
              <motion.div
                className="absolute -right-32 top-0 h-full w-64"
                style={{ background: "linear-gradient(-90deg, rgba(34,211,238,0.6), transparent)" }}
                initial={{ x: 200, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.7 }}
              />
            </>
          )}

          {/* Center stack */}
          <motion.div
            className="relative z-10 flex flex-col items-center gap-3 sm:gap-5 px-6 text-center select-none"
            initial={{ scale: 0.6, opacity: 0, y: 20 }}
            animate={{ scale: [0.6, 1.15, 1], opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Tier badge */}
            <motion.div
              className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur border border-white/20"
              animate={!reduced ? { y: [0, -4, 0] } : undefined}
              transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
            >
              {state.tier === "legendary" ? (
                <Crown className="w-4 h-4 text-amber-300" />
              ) : (
                <Sparkles className="w-4 h-4 text-amber-300" />
              )}
              <span className="text-xs sm:text-sm tracking-[0.3em] text-white/90 font-semibold">
                {state.multiplier.toFixed(2)}× MULTIPLIER
              </span>
            </motion.div>

            {/* Tier label */}
            <h1
              className={`font-imperial font-black tracking-wider bg-gradient-to-br ${TIER_GRADIENT[state.tier]} bg-clip-text text-transparent ${TIER_FONT_SIZE[state.tier]}`}
              style={{ filter: TIER_GLOW[state.tier] }}
            >
              {TIER_LABEL[state.tier]}
            </h1>

            {/* Amount */}
            <motion.div
              className="flex items-baseline gap-2 mt-1"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.4 }}
            >
              <span className="text-3xl sm:text-5xl font-black tabular-nums text-white"
                style={{ textShadow: "0 4px 20px rgba(0,0,0,0.6)" }}>
                +{display.toLocaleString()}
              </span>
              <span className="text-base sm:text-xl font-semibold text-amber-200/90 tracking-widest">
                {state.unitLabel}
              </span>
            </motion.div>

            {/* Hint */}
            <motion.p
              className="text-[11px] sm:text-xs text-white/60 mt-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              transition={{ delay: 0.6 }}
            >
              화면을 눌러 닫기
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function useCountUp(target: number, durationMs: number) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (target <= 0) { setVal(0); return; }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / Math.max(60, durationMs));
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setVal(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);
  return val;
}
