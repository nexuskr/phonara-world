// DragonMaxWinOverlay — Lava eruption + ember storm on BaseMaxWinOverlay.
import { motion } from "framer-motion";
import { Flame } from "lucide-react";
import BaseMaxWinOverlay from "@/components/celebration/BaseMaxWinOverlay";

function EmberStorm() {
  return (
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
              width: 8,
              height: 8,
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
  );
}

interface Props {
  triggerAt?: number;
  durationMs?: number;
}

export default function DragonMaxWinOverlay({ triggerAt = 500, durationMs = 3200 }: Props) {
  return (
    <BaseMaxWinOverlay
      triggerAt={triggerAt}
      durationMs={durationMs}
      ariaLabel="Dragon Max Win"
      soundKeys={{ primary: "legendary_win", voice: "voice_dragon_roar" }}
      titleText="DRAGON ROAR"
      icon={
        <Flame
          className="h-20 w-20 sm:h-28 sm:w-28 text-amber-300 mb-3"
          style={{
            filter:
              "drop-shadow(0 0 30px rgba(251,191,36,0.95)) drop-shadow(0 0 60px rgba(239,68,68,0.7))",
          }}
        />
      }
      cinematic={() => <EmberStorm />}
      palette={{
        backdrop:
          "radial-gradient(circle at 50% 80%, rgba(249,115,22,0.50) 0%, rgba(239,68,68,0.22) 38%, rgba(0,0,0,0.85) 100%)",
        flareLeft: "linear-gradient(90deg, rgba(239,68,68,0.7) 0%, rgba(239,68,68,0) 100%)",
        flareRight: "linear-gradient(270deg, rgba(251,191,36,0.7) 0%, rgba(251,191,36,0) 100%)",
        shockwave:
          "linear-gradient(0deg, rgba(249,115,22,0.85) 0%, rgba(239,68,68,0.45) 40%, rgba(0,0,0,0) 100%)",
        confettiColors: ["#ef4444", "#f97316", "#fbbf24", "#fde047", "#dc2626"],
        titleGradientClass: "bg-gradient-to-b from-amber-200 via-orange-300 to-red-400",
        titleGlow: "drop-shadow(0 0 24px rgba(249,115,22,0.9))",
        multiplierTextClass: "text-amber-100",
        multiplierTextShadow: "0 0 14px rgba(251,191,36,0.85)",
        subTextClass: "text-orange-200",
      }}
      confettiBursts={[
        { delay: 0, originY: 0.95, scalar: 1.6, spread: 130, startVelocity: 70, gravity: 1.0 },
        { delay: 380, originY: 0.92, scalar: 1.4, spread: 130, startVelocity: 70, gravity: 1.0 },
        { delay: 820, originY: 0.5, scalar: 1.2, spread: 130, startVelocity: 70, gravity: 1.0 },
      ]}
    />
  );
}
