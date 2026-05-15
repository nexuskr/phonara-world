// BaseMaxWinOverlay — Signature Slot 공용 MAX WIN cinematic 셸.
// 4개 슬롯(Cosmic / Neon / Wizard / Dragon / Pirate)에서 100% 동일한 책임:
//  - WinCelebrationManager.subscribe + multiplier ≥ triggerAt 게이트
//  - prefers-reduced-motion + 모바일(<=640px) confetti factor 0.55
//  - SlotSoundManager Facade 호출 (primary + optional voice line)
//  - backdrop fade, 좌/우 edge flare, (옵션) 하단 shockwave, 자동 dismiss
//  - 타이틀 슬램(아이콘 + 그라디언트 텍스트 + multiplier + win 금액)
// 슬롯 고유 cinematic(Pentagram, Matrix rain, Lava ember, Cannon...) 은 cinematic render-prop 으로 주입.
// SSR safe / cleanup 0 누수 / GPU composite-only.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import {
  WinCelebrationManager,
  type CelebrationData,
} from "@/lib/celebration/WinCelebrationManager";
import { soundManager } from "@/lib/sounds/SlotSoundManager";

export interface BurstSpec {
  delay: number;
  originY: number;
  scalar?: number;
  spread?: number;
  startVelocity?: number;
  gravity?: number;
}

export interface BaseMaxWinPalette {
  /** Backdrop CSS background (예: radial-gradient...). */
  backdrop: string;
  /** 좌측 flare CSS background (linear-gradient 90deg ...). */
  flareLeft: string;
  /** 우측 flare CSS background (linear-gradient 270deg ...). */
  flareRight: string;
  /** 옵션 — 하단 shockwave 그라디언트. 미지정 시 렌더 안 함. */
  shockwave?: string;
  /** confetti 색상 배열. */
  confettiColors: string[];
  /** 타이틀 텍스트 그라디언트 (tailwind bg-clip-text). */
  titleGradientClass: string;
  /** 타이틀 drop-shadow filter. */
  titleGlow: string;
  /** 멀티플라이어 라인 텍스트 클래스. 기본 amber/cyan 톤. */
  multiplierTextClass?: string;
  multiplierTextShadow?: string;
  /** 윈 금액 라인 텍스트 클래스. */
  subTextClass: string;
}

export interface BaseMaxWinOverlayProps {
  triggerAt?: number;
  durationMs?: number;
  ariaLabel: string;
  soundKeys: { primary: string; voice?: string };
  palette: BaseMaxWinPalette;
  /** 헤더 아이콘 (이미 색상/필터 적용된 ReactNode). */
  icon: ReactNode;
  titleText: string;
  /** 슬롯별 cinematic 레이어 (Pentagram, Matrix rain, Skull storm 등). */
  cinematic?: (data: CelebrationData) => ReactNode;
  /** Confetti 버스트 타임라인. 미지정 시 3-burst 디폴트. */
  confettiBursts?: BurstSpec[];
  /** 타이틀 슬램 시작 딜레이 (ms). cinematic 이후에 슬램 띄우려면 사용. */
  titleDelayMs?: number;
}

const DEFAULT_BURSTS: BurstSpec[] = [
  { delay: 0, originY: 0.5, scalar: 1.4 },
  { delay: 420, originY: 0.35, scalar: 1.3 },
  { delay: 900, originY: 0.6, scalar: 1.3 },
];

export default function BaseMaxWinOverlay({
  triggerAt = 1000,
  durationMs = 3200,
  ariaLabel,
  soundKeys,
  palette,
  icon,
  titleText,
  cinematic,
  confettiBursts = DEFAULT_BURSTS,
  titleDelayMs = 0,
}: BaseMaxWinOverlayProps) {
  const [data, setData] = useState<CelebrationData | null>(null);
  const lastFiredAt = useRef(0);
  const dismissTimer = useRef<number | null>(null);
  const burstTimers = useRef<number[]>([]);

  // Subscribe — 동일 셀러브레이션 중복 트리거 방지
  useEffect(() => {
    const unsub = WinCelebrationManager.subscribe((s) => {
      if (!s) {
        setData(null);
        return;
      }
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
      burstTimers.current.forEach((id) => window.clearTimeout(id));
      burstTimers.current = [];
    };
  }, [triggerAt]);

  // Side effects — sound + confetti + auto dismiss
  useEffect(() => {
    if (!data) return;
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    // Facade — 누락 키는 facade 내부 fallback이 처리
    try {
      soundManager.play(soundKeys.primary, 1.0);
    } catch {
      /* */
    }
    if (soundKeys.voice) {
      try {
        soundManager.play(soundKeys.voice, 0.95);
      } catch {
        /* */
      }
    }

    if (!reduced) {
      const isMobile =
        typeof window !== "undefined" &&
        window.matchMedia?.("(max-width: 640px)").matches;
      const factor = isMobile ? 0.55 : 1;
      for (const b of confettiBursts) {
        const id = window.setTimeout(() => {
          confetti({
            particleCount: Math.floor(220 * factor),
            spread: b.spread ?? 120,
            startVelocity: b.startVelocity ?? 65,
            ticks: 280,
            origin: { x: 0.5, y: b.originY },
            colors: palette.confettiColors,
            scalar: b.scalar ?? 1.3,
            gravity: b.gravity ?? 0.85,
            disableForReducedMotion: true,
          });
        }, b.delay);
        burstTimers.current.push(id);
      }
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
      burstTimers.current.forEach((id) => window.clearTimeout(id));
      burstTimers.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          aria-label={ariaLabel}
          style={{ willChange: "opacity" }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0"
            style={{ background: palette.backdrop, transform: "translate3d(0,0,0)" }}
          />

          {/* 슬롯별 cinematic — Pentagram / Matrix rain / Ember storm 등 */}
          {cinematic?.(data)}

          {/* Edge flares */}
          <motion.div
            className="absolute left-0 top-0 h-full w-1/4"
            style={{
              background: palette.flareLeft,
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
              background: palette.flareRight,
              filter: "blur(28px)",
              willChange: "opacity, transform",
            }}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: [0, 1, 0.7, 1], x: 0 }}
            transition={{ duration: 2.2, times: [0, 0.2, 0.6, 1] }}
          />

          {/* Shockwave (옵션) — 하단에서 위로 쓸어오는 그라디언트 */}
          {palette.shockwave && (
            <motion.div
              className="absolute left-0 right-0 bottom-0 h-1/2"
              style={{
                background: palette.shockwave,
                willChange: "transform, opacity",
              }}
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: [0, 1, 0.7, 1] }}
              transition={{ duration: 1.6, ease: "easeOut" }}
            />
          )}

          {/* Title slam */}
          <motion.div
            className="relative z-10 flex flex-col items-center text-center px-6"
            initial={{ scale: 0.4, opacity: 0, y: 30 }}
            animate={{ scale: [0.4, 1.18, 1], opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: "backOut", delay: titleDelayMs / 1000 }}
            style={{ willChange: "transform, opacity" }}
          >
            {icon}
            <div
              className={`text-4xl sm:text-6xl md:text-7xl font-black tracking-tight bg-clip-text text-transparent ${palette.titleGradientClass}`}
              style={{ filter: palette.titleGlow }}
            >
              {titleText}
            </div>
            <div
              className={`mt-1 text-2xl sm:text-4xl font-extrabold tracking-wider ${palette.multiplierTextClass ?? "text-amber-100"}`}
              style={{ textShadow: palette.multiplierTextShadow ?? "0 0 14px rgba(251,191,36,0.85)" }}
            >
              MAX WIN ×{Math.round(data.multiplier).toLocaleString()}
            </div>
            <div className={`mt-3 text-lg sm:text-2xl font-semibold ${palette.subTextClass}`}>
              +{data.totalWin.toLocaleString()} {data.unitLabel}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
