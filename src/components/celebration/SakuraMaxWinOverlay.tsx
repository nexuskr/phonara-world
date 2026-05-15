// SakuraMaxWinOverlay — 벚꽃의 축복 cinematic on BaseMaxWinOverlay.
// Low volatility 슬롯에 맞춘 짧고 우아한 셀러브레이션 (3.4s, voice line 생략, 파스텔 톤).
import { motion } from "framer-motion";
import BaseMaxWinOverlay from "@/components/celebration/BaseMaxWinOverlay";
import type { CelebrationData } from "@/lib/celebration/WinCelebrationManager";

interface Props {
  triggerAt?: number;
  durationMs?: number;
}

// 인라인 5-petal sakura SVG — gold stroke + soft pink fill.
function SakuraIcon() {
  return (
    <svg
      viewBox="0 0 64 64"
      className="h-20 w-20 sm:h-28 sm:w-28 mb-3"
      style={{ filter: "drop-shadow(0 0 22px rgba(251, 207, 232, 0.95))" }}
      aria-hidden
    >
      <g transform="translate(32 32)">
        {[0, 1, 2, 3, 4].map((i) => (
          <ellipse
            key={i}
            cx="0"
            cy="-16"
            rx="8"
            ry="14"
            fill="#fbcfe8"
            stroke="#fde68a"
            strokeWidth="1.2"
            transform={`rotate(${i * 72})`}
            opacity="0.95"
          />
        ))}
        <circle r="5" fill="#fde68a" />
      </g>
    </svg>
  );
}

// Petal storm — 80개 transform-only divs. CSS keyframes 없이 framer-motion으로 GPU 합성.
function PetalStorm() {
  // 사전 시드 (성능 안정)
  const petals = Array.from({ length: 80 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 1.6,
    duration: 3.2 + Math.random() * 1.4,
    drift: (Math.random() - 0.5) * 140,
    size: 8 + Math.random() * 8,
    hue: ["#fbcfe8", "#fda4af", "#fff1f5"][i % 3],
    rot: Math.random() * 360,
  }));
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {petals.map((p) => (
        <motion.div
          key={p.id}
          initial={{ y: -40, x: 0, opacity: 0, rotate: p.rot }}
          animate={{
            y: "110vh",
            x: p.drift,
            opacity: [0, 0.95, 0.95, 0],
            rotate: p.rot + 220,
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            ease: "easeIn",
          }}
          style={{
            position: "absolute",
            left: `${p.left}%`,
            top: 0,
            width: p.size,
            height: p.size * 1.4,
            background: p.hue,
            borderRadius: "60% 40% 60% 40%",
            boxShadow: "0 0 6px rgba(253, 230, 138, 0.35)",
            willChange: "transform, opacity",
          }}
        />
      ))}
    </div>
  );
}

// Floating lanterns — 3개, 따뜻한 오렌지 glow, 천천히 위로.
function FloatingLanterns() {
  const lanterns = [
    { left: 18, delay: 0.2, dur: 3.0 },
    { left: 50, delay: 0.0, dur: 3.2 },
    { left: 82, delay: 0.45, dur: 2.8 },
  ];
  return (
    <div className="absolute inset-0 pointer-events-none">
      {lanterns.map((l, i) => (
        <motion.div
          key={i}
          initial={{ y: "100vh", opacity: 0 }}
          animate={{ y: "-20vh", opacity: [0, 1, 1, 0] }}
          transition={{ duration: l.dur, delay: l.delay, ease: "easeOut" }}
          style={{
            position: "absolute",
            left: `${l.left}%`,
            bottom: 0,
            width: 56,
            height: 72,
            transform: "translateX(-50%)",
            willChange: "transform, opacity",
          }}
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              borderRadius: "40% 40% 50% 50% / 55% 55% 45% 45%",
              background:
                "radial-gradient(circle at 50% 45%, #fde68a 0%, #f59e0b 55%, #b45309 100%)",
              boxShadow:
                "0 0 28px rgba(251, 191, 36, 0.85), 0 0 60px rgba(251, 191, 36, 0.45)",
            }}
          />
        </motion.div>
      ))}
    </div>
  );
}

// Golden burst — 1회, 중앙에서 scale 0→3 fade.
function GoldenBurst() {
  return (
    <motion.div
      className="absolute inset-0 pointer-events-none flex items-center justify-center"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: [0, 2.4, 3], opacity: [0, 0.85, 0] }}
      transition={{ duration: 1.2, ease: "easeOut" }}
    >
      <div
        style={{
          width: 240,
          height: 240,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(253,230,138,0.85) 0%, rgba(251,207,232,0.45) 45%, rgba(251,207,232,0) 75%)",
          willChange: "transform, opacity",
        }}
      />
    </motion.div>
  );
}

export default function SakuraMaxWinOverlay({
  triggerAt = 500,
  durationMs = 3400,
}: Props) {
  return (
    <BaseMaxWinOverlay
      triggerAt={triggerAt}
      durationMs={durationMs}
      ariaLabel="Cherry Sakura Max Win"
      soundKeys={{ primary: "legendary_win" }} // voice line 생략 — 우아하게
      titleText="벚꽃의 축복"
      titleDelayMs={250}
      icon={<SakuraIcon />}
      palette={{
        backdrop:
          "radial-gradient(circle at 50% 45%, rgba(251,207,232,0.45) 0%, rgba(253,230,138,0.18) 40%, rgba(76,29,55,0.78) 100%)",
        flareLeft:
          "linear-gradient(90deg, rgba(249,168,212,0.7) 0%, rgba(249,168,212,0) 100%)",
        flareRight:
          "linear-gradient(270deg, rgba(253,230,138,0.65) 0%, rgba(253,230,138,0) 100%)",
        confettiColors: ["#fbcfe8", "#fde68a", "#a7f3d0", "#fff1f5", "#fda4af"],
        titleGradientClass:
          "bg-gradient-to-b from-rose-100 via-amber-100 to-emerald-100",
        titleGlow: "drop-shadow(0 0 22px rgba(251, 207, 232, 0.95))",
        multiplierTextClass: "text-rose-50",
        multiplierTextShadow: "0 0 14px rgba(253, 230, 138, 0.85)",
        subTextClass: "text-amber-100",
      }}
      // Low volatility — 부드럽게 3-burst, scalar 1.1
      confettiBursts={[
        { delay: 0, originY: 0.55, scalar: 1.1, spread: 100, startVelocity: 50 },
        { delay: 500, originY: 0.4, scalar: 1.1, spread: 100, startVelocity: 50 },
        { delay: 1000, originY: 0.6, scalar: 1.1, spread: 100, startVelocity: 50 },
      ]}
      cinematic={(_data: CelebrationData) => (
        <>
          <PetalStorm />
          <FloatingLanterns />
          <GoldenBurst />
        </>
      )}
    />
  );
}
