// WizardMaxWinOverlay — Pentagram sweep + rune storm on BaseMaxWinOverlay.
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import BaseMaxWinOverlay from "@/components/celebration/BaseMaxWinOverlay";

const RUNE_GLYPHS = ["ᚠ", "ᚢ", "ᚦ", "ᚨ", "ᚱ", "ᚲ", "ᚷ", "ᚹ", "ᚺ", "ᛁ"];

function PentagramRuneCinematic() {
  return (
    <>
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

      {/* Stage 3 — Rune storm */}
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
    </>
  );
}

interface Props {
  triggerAt?: number;
  durationMs?: number;
}

export default function WizardMaxWinOverlay({ triggerAt = 2000, durationMs = 3400 }: Props) {
  return (
    <BaseMaxWinOverlay
      triggerAt={triggerAt}
      durationMs={durationMs}
      ariaLabel="Wizard Max Win"
      soundKeys={{ primary: "legendary_win", voice: "voice_wizard_decree" }}
      titleText="WIZARD'S DECREE"
      titleDelayMs={900}
      icon={
        <Sparkles
          className="h-20 w-20 sm:h-28 sm:w-28 text-amber-300 mb-3"
          style={{
            filter:
              "drop-shadow(0 0 30px rgba(251,191,36,0.95)) drop-shadow(0 0 60px rgba(139,92,246,0.7))",
          }}
        />
      }
      cinematic={() => <PentagramRuneCinematic />}
      palette={{
        backdrop:
          "radial-gradient(circle at 50% 50%, rgba(139,92,246,0.45) 0%, rgba(34,211,238,0.18) 38%, rgba(0,0,0,0.85) 100%)",
        flareLeft: "linear-gradient(90deg, rgba(139,92,246,0.7) 0%, rgba(139,92,246,0) 100%)",
        flareRight: "linear-gradient(270deg, rgba(251,191,36,0.65) 0%, rgba(251,191,36,0) 100%)",
        confettiColors: ["#fbbf24", "#f59e0b", "#a78bfa", "#8b5cf6", "#22d3ee"],
        titleGradientClass: "bg-gradient-to-r from-amber-200 via-violet-200 to-cyan-200",
        titleGlow: "drop-shadow(0 0 24px rgba(251,191,36,0.85))",
        multiplierTextClass: "text-amber-100",
        multiplierTextShadow: "0 0 14px rgba(251,191,36,0.85)",
        subTextClass: "text-violet-100",
      }}
      confettiBursts={[
        { delay: 420, originY: 0.5, scalar: 1.5, spread: 130, startVelocity: 60 },
        { delay: 720, originY: 0.4, scalar: 1.2, spread: 130, startVelocity: 60 },
        { delay: 1200, originY: 0.25, scalar: 1.0, spread: 130, startVelocity: 60 },
        { delay: 1700, originY: 0.65, scalar: 1.0, spread: 130, startVelocity: 60 },
      ]}
    />
  );
}
