/**
 * ThroneStage v3 — 7-Layer Cinematic Throne.
 *  1. outer halo  2. mid corona  3. inner sweep  4. floor parallax
 *  5. pink near-miss aura  6. divine ray  7. crown particle ring
 * 모든 레이어 transform/opacity only · 60fps.
 */
import { ReactNode } from "react";
import type { RewardTier } from "../../types";

interface Props {
  children: ReactNode;
  nearMissIntensity?: number;
  rewardTier?: RewardTier | null;
  divineActive?: boolean;
}

export function ThroneStage({
  children, nearMissIntensity = 0, rewardTier = null, divineActive = false,
}: Props) {
  const i = Math.max(0, Math.min(1, nearMissIntensity));
  const isHot = rewardTier === "crown" || rewardTier === "empyrean" || rewardTier === "divine";
  const outerAlpha = 0.18 + i * 0.37 + (isHot ? 0.12 : 0);
  const sweepSec = (6 - i * 4.2 - (isHot ? 1.4 : 0)).toFixed(2);
  const pinkScale = 1 + i * 0.08 + (divineActive ? 0.06 : 0);

  return (
    <div
      className="relative isolate overflow-hidden rounded-3xl border border-amber-400/30 bg-[#0A0503]"
      style={{
        boxShadow: `0 0 ${36 + i * 60 + (divineActive ? 40 : 0)}px hsl(38 92% 56% / ${0.18 + i * 0.42 + (divineActive ? 0.2 : 0)}), 0 0 ${70 + i * 80}px hsl(330 90% 60% / ${0.10 + i * 0.35 + (divineActive ? 0.22 : 0)})`,
        transition: "box-shadow 220ms ease-out",
      }}
    >
      {/* 1+2. Outer halo + corona */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(60% 50% at 50% 0%, hsl(38 92% 56% / ${outerAlpha}), transparent 65%), radial-gradient(80% 60% at 50% 100%, hsl(330 90% 60% / ${0.22 + i * 0.25 + (divineActive ? 0.18 : 0)}), transparent 70%)`,
          transform: `scale(${pinkScale})`,
          transition: "background 220ms ease-out, transform 220ms ease-out",
          willChange: "transform, opacity",
        }}
      />

      {/* 3. Inner sweep highlight */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            "linear-gradient(115deg, transparent 30%, hsl(38 92% 60% / 0.18) 50%, transparent 70%)",
          backgroundSize: "220% 100%",
          animation: `throne-sweep ${sweepSec}s linear infinite`,
        }}
      />

      {/* 4. Throne floor parallax */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2"
        style={{
          background:
            "linear-gradient(0deg, hsl(38 92% 56% / 0.10), transparent), repeating-linear-gradient(180deg, transparent 0 7px, hsl(38 92% 56% / 0.06) 7px 8px)",
          maskImage: "linear-gradient(180deg, transparent, black 70%)",
          WebkitMaskImage: "linear-gradient(180deg, transparent, black 70%)",
        }}
      />

      {/* 5. Pink near-miss aura (intensity-driven) */}
      {i > 0.15 && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background: `radial-gradient(120% 80% at 50% 50%, transparent 50%, hsl(330 90% 55% / ${0.08 + i * 0.32}) 100%)`,
            transition: "background 200ms ease-out",
            willChange: "opacity",
          }}
        />
      )}

      {/* 6. Divine ray (only when divine tier active) */}
      {divineActive && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 mix-blend-screen"
          style={{
            background:
              "conic-gradient(from 90deg at 50% 50%, transparent 0deg, hsl(38 92% 65% / 0.32) 12deg, transparent 28deg, transparent 90deg, hsl(45 95% 70% / 0.28) 102deg, transparent 118deg, transparent 180deg, hsl(330 90% 65% / 0.28) 192deg, transparent 208deg, transparent 270deg, hsl(38 92% 65% / 0.3) 282deg, transparent 298deg)",
            animation: "divine-ray 9s linear infinite",
            willChange: "transform",
          }}
        />
      )}

      {/* 7. Crown particle ring (hot tiers) */}
      {(isHot || divineActive) && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
        >
          <div
            className="w-[160%] aspect-square rounded-full"
            style={{
              border: "1px solid hsl(38 92% 60% / 0.3)",
              boxShadow:
                "inset 0 0 60px hsl(38 92% 55% / 0.25), 0 0 60px hsl(330 90% 60% / 0.18)",
              animation: "crown-ring 14s linear infinite",
              willChange: "transform",
            }}
          />
        </div>
      )}

      <div className="relative z-10">{children}</div>

      <style>{`
        @keyframes throne-sweep { 0%{background-position:-120% 0} 100%{background-position:220% 0} }
        @keyframes divine-ray { 0%{transform:rotate(0)} 100%{transform:rotate(360deg)} }
        @keyframes crown-ring { 0%{transform:rotate(0)} 100%{transform:rotate(-360deg)} }
      `}</style>
    </div>
  );
}

export default ThroneStage;
