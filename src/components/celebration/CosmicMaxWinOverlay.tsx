// CosmicMaxWinOverlay — Cosmic Emperor cinematic on BaseMaxWinOverlay.
import { Crown } from "lucide-react";
import BaseMaxWinOverlay from "@/components/celebration/BaseMaxWinOverlay";

interface Props {
  triggerAt?: number;
  durationMs?: number;
}

export default function CosmicMaxWinOverlay({ triggerAt = 5000, durationMs = 3000 }: Props) {
  return (
    <BaseMaxWinOverlay
      triggerAt={triggerAt}
      durationMs={durationMs}
      ariaLabel="Cosmic Max Win"
      soundKeys={{ primary: "legendary_win" }}
      titleText="COSMIC EMPEROR"
      icon={
        <Crown
          className="h-20 w-20 sm:h-28 sm:w-28 text-yellow-300 mb-3"
          style={{
            filter:
              "drop-shadow(0 0 30px rgba(253,224,71,0.9)) drop-shadow(0 0 60px rgba(167,139,250,0.7))",
          }}
        />
      }
      palette={{
        backdrop:
          "radial-gradient(circle at 50% 50%, rgba(167,139,250,0.45) 0%, rgba(34,211,238,0.18) 40%, rgba(0,0,0,0.78) 100%)",
        flareLeft: "linear-gradient(90deg, rgba(167,139,250,0.7) 0%, rgba(167,139,250,0) 100%)",
        flareRight: "linear-gradient(270deg, rgba(34,211,238,0.7) 0%, rgba(34,211,238,0) 100%)",
        confettiColors: ["#a78bfa", "#22d3ee", "#f0abfc", "#fde047", "#67e8f9", "#c084fc"],
        titleGradientClass: "bg-gradient-to-b from-yellow-200 via-fuchsia-300 to-cyan-300",
        titleGlow: "drop-shadow(0 0 24px rgba(232,121,249,0.9))",
        multiplierTextClass: "text-cyan-100",
        multiplierTextShadow: "0 0 14px rgba(167,139,250,0.85)",
        subTextClass: "text-yellow-200",
      }}
      confettiBursts={[
        { delay: 0, originY: 0.5, scalar: 1.4, spread: 110, startVelocity: 60 },
        { delay: 450, originY: 0.35, scalar: 1.4, spread: 110, startVelocity: 60 },
        { delay: 900, originY: 0.6, scalar: 1.4, spread: 110, startVelocity: 60 },
      ]}
    />
  );
}
