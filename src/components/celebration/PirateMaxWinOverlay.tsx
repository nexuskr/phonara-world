// PirateMaxWinOverlay — Cannon flash + Skull/Coin storm + Treasure eruption on BaseMaxWinOverlay.
import { motion } from "framer-motion";
import { Skull } from "lucide-react";
import BaseMaxWinOverlay from "@/components/celebration/BaseMaxWinOverlay";

const STORM_GLYPHS = ["💀", "🪙", "💀", "⚔️", "🪙", "💎"];

function PirateCinematic() {
  return (
    <>
      {/* 좌우 cannon flash — 0ms / 380ms */}
      {[
        { side: "left" as const, delay: 0 },
        { side: "right" as const, delay: 0.38 },
        { side: "left" as const, delay: 0.78 },
      ].map((c, i) => (
        <motion.div
          key={i}
          className="absolute top-1/2 -translate-y-1/2"
          style={{
            [c.side]: "-6%",
            width: "42%",
            height: "30%",
            background:
              c.side === "left"
                ? "radial-gradient(ellipse at left center, rgba(234,179,8,0.85) 0%, rgba(185,28,28,0.45) 35%, rgba(0,0,0,0) 70%)"
                : "radial-gradient(ellipse at right center, rgba(234,179,8,0.85) 0%, rgba(185,28,28,0.45) 35%, rgba(0,0,0,0) 70%)",
            filter: "blur(6px)",
            willChange: "transform, opacity",
          } as React.CSSProperties}
          initial={{ opacity: 0, scale: 0.4 }}
          animate={{ opacity: [0, 1, 0], scale: [0.4, 1.4, 1.6] }}
          transition={{ duration: 0.7, delay: c.delay, ease: "easeOut" }}
          aria-hidden
        />
      ))}

      {/* Skull / Coin storm — 30개 부유 (위→아래) */}
      <div className="absolute inset-0 overflow-hidden" aria-hidden>
        {Array.from({ length: 30 }).map((_, i) => {
          const left = (i * 11 + 5) % 100;
          const delay = 0.45 + (i % 10) * 0.06;
          const dur = 2.0 + (i % 5) * 0.22;
          const glyph = STORM_GLYPHS[i % STORM_GLYPHS.length];
          const tint =
            glyph === "🪙" || glyph === "💎"
              ? "rgba(234,179,8,0.95)"
              : "rgba(254,226,226,0.95)";
          return (
            <motion.span
              key={i}
              className="absolute text-2xl sm:text-3xl select-none"
              style={{
                left: `${left}%`,
                top: "-10%",
                color: tint,
                textShadow: `0 0 12px ${tint}`,
                willChange: "transform, opacity",
              }}
              initial={{ y: 0, opacity: 0, rotate: 0 }}
              animate={{ y: "120vh", opacity: [0, 1, 1, 0], rotate: 540 }}
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

export default function PirateMaxWinOverlay({ triggerAt = 1500, durationMs = 3300 }: Props) {
  return (
    <BaseMaxWinOverlay
      triggerAt={triggerAt}
      durationMs={durationMs}
      ariaLabel="Pirate's Curse Max Win"
      soundKeys={{ primary: "legendary_win", voice: "voice_pirate_curse" }}
      titleText="PIRATE'S CURSE"
      titleDelayMs={600}
      icon={
        <Skull
          className="h-20 w-20 sm:h-28 sm:w-28 text-amber-300 mb-3"
          style={{
            filter:
              "drop-shadow(0 0 30px rgba(234,179,8,0.95)) drop-shadow(0 0 60px rgba(185,28,28,0.7))",
          }}
        />
      }
      cinematic={() => <PirateCinematic />}
      palette={{
        backdrop:
          "radial-gradient(circle at 50% 65%, rgba(185,28,28,0.45) 0%, rgba(234,179,8,0.18) 38%, rgba(0,0,0,0.88) 100%)",
        flareLeft: "linear-gradient(90deg, rgba(185,28,28,0.7) 0%, rgba(185,28,28,0) 100%)",
        flareRight: "linear-gradient(270deg, rgba(234,179,8,0.7) 0%, rgba(234,179,8,0) 100%)",
        shockwave:
          "linear-gradient(0deg, rgba(124,45,18,0.85) 0%, rgba(185,28,28,0.45) 40%, rgba(0,0,0,0) 100%)",
        confettiColors: ["#b91c1c", "#eab308", "#7c2d12", "#fde047", "#dc2626", "#f5f5dc"],
        titleGradientClass: "bg-gradient-to-b from-amber-200 via-amber-300 to-red-400",
        titleGlow: "drop-shadow(0 0 24px rgba(234,179,8,0.9))",
        multiplierTextClass: "text-amber-100",
        multiplierTextShadow: "0 0 14px rgba(234,179,8,0.85)",
        subTextClass: "text-amber-200",
      }}
      confettiBursts={[
        { delay: 0, originY: 0.92, scalar: 1.5, spread: 140, startVelocity: 75, gravity: 1.0 },
        { delay: 380, originY: 0.92, scalar: 1.4, spread: 140, startVelocity: 75, gravity: 1.0 },
        { delay: 820, originY: 0.5, scalar: 1.2, spread: 130, startVelocity: 65 },
      ]}
    />
  );
}
