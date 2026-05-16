// SugarFeverMaxWinOverlay — 3000×+ Trump-level sweet explosion.
// Built on BaseMaxWinOverlay (same screen-shake / slow-mo / sound facade
// pipeline as Olympus Legacy). Visual identity: warm pastel candy luxury.
// Crown award at maxMultiplier is delegated upstream (idempotent dedupe by
// spinId inside SlotSignatureWrapper → useEmpireCrown).
import { Candy } from "lucide-react";
import BaseMaxWinOverlay, {
  type MaxWinTriggeredPayload,
} from "@/components/celebration/BaseMaxWinOverlay";

interface Props {
  triggerAt?: number;
  durationMs?: number;
  onMaxWinTriggered?: (payload: MaxWinTriggeredPayload) => void;
  slotId?: string;
  themeKey?: string;
}

// Warm Sugar Luxury palette (pastel pink, warm gold, mint, strawberry red)
const SUGAR_PALETTE = {
  backdrop:
    "radial-gradient(circle at 50% 55%, rgba(255,182,206,0.46) 0%, rgba(255,128,140,0.24) 38%, rgba(28,14,24,0.88) 100%)",
  flareLeft:
    "linear-gradient(90deg, rgba(255,180,205,0.75) 0%, rgba(255,180,205,0) 100%)",
  flareRight:
    "linear-gradient(270deg, rgba(255,210,130,0.75) 0%, rgba(255,210,130,0) 100%)",
  // pastel candy confetti — pink, gold, mint, strawberry, marshmallow cream
  confettiColors: [
    "#ffb6ce", "#ffd282", "#aae8d2",
    "#ff808c", "#f5e1f5", "#ffc46a",
  ],
  titleGradientClass:
    "bg-gradient-to-b from-pink-100 via-amber-200 to-pink-400",
  titleGlow: "drop-shadow(0 0 26px rgba(255,182,206,0.95))",
  multiplierTextClass: "text-pink-50",
  multiplierTextShadow: "0 0 14px rgba(255,206,120,0.85)",
  subTextClass: "text-pink-200",
};

export default function SugarFeverMaxWinOverlay({
  triggerAt = 3000,
  durationMs = 3400,
  onMaxWinTriggered,
  slotId,
  themeKey,
}: Props) {
  return (
    <BaseMaxWinOverlay
      triggerAt={triggerAt}
      durationMs={durationMs}
      onMaxWinTriggered={onMaxWinTriggered}
      slotId={slotId}
      themeKey={themeKey}
      ariaLabel="Sugar Fever Max Win"
      // Sugar pack reuses olympus sound pack as placeholder (see soundConfig).
      soundKeys={{ primary: "legendary_win", voice: "zeus_decree" }}
      titleText="SUGAR FEVER"
      icon={
        <Candy
          className="h-20 w-20 sm:h-28 sm:w-28 text-pink-200 mb-3"
          style={{
            willChange: "transform, filter",
            filter:
              "drop-shadow(0 0 32px rgba(255,182,206,0.95)) drop-shadow(0 0 64px rgba(255,210,130,0.6))",
          }}
        />
      }
      palette={SUGAR_PALETTE}
      // 4-burst candy confetti — base layer throttles to ~120 on mobile.
      confettiBursts={[
        { delay: 0,    originY: 0.5,  scalar: 1.5, spread: 130, startVelocity: 65 },
        { delay: 380,  originY: 0.32, scalar: 1.4, spread: 130, startVelocity: 60 },
        { delay: 820,  originY: 0.6,  scalar: 1.4, spread: 130, startVelocity: 60 },
        { delay: 1280, originY: 0.45, scalar: 1.3, spread: 140, startVelocity: 55 },
      ]}
      cinematic={() => (
        // Giant lollipop + crown candy SVG with warm pink halo.
        // No JS animation loop — pure CSS keyframes, GPU composite only.
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 flex items-end justify-center overflow-hidden"
          style={{ willChange: "opacity, transform" }}
        >
          {/* warm pink/gold halo behind hero */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at 50% 80%, rgba(255,206,180,0.50) 0%, rgba(255,128,140,0.20) 35%, transparent 70%)",
              animation: "sugar-halo-pulse 1.6s ease-out forwards",
            }}
          />
          {/* lollipop + crown candy — SVG, fades in from below with gentle spin */}
          <svg
            viewBox="0 0 240 320"
            className="relative w-[64%] max-w-[500px] h-auto opacity-0"
            style={{
              animation: "sugar-hero-in 1.2s 0.35s cubic-bezier(.16,.84,.36,1) forwards",
              filter: "drop-shadow(0 0 40px rgba(255,182,206,0.55))",
            }}
          >
            <defs>
              {/* swirly lollipop disc — pink/gold/mint pinwheel */}
              <radialGradient id="lolliBody" cx="50%" cy="50%" r="50%">
                <stop offset="0%"   stopColor="#fff1f5" />
                <stop offset="55%"  stopColor="#ffb6ce" />
                <stop offset="100%" stopColor="#ff808c" />
              </radialGradient>
              <linearGradient id="lolliSwirl" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0%"   stopColor="rgba(255,210,130,0.95)" />
                <stop offset="50%"  stopColor="rgba(170,232,210,0.85)" />
                <stop offset="100%" stopColor="rgba(255,180,205,0.95)" />
              </linearGradient>
              <linearGradient id="crownGrad" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%"   stopColor="#fff1c8" />
                <stop offset="100%" stopColor="#ffc46a" />
              </linearGradient>
            </defs>

            {/* stick */}
            <rect x="116" y="160" width="8" height="150" rx="4"
                  fill="rgba(245,232,225,0.85)" />

            {/* lollipop disc */}
            <circle cx="120" cy="150" r="92" fill="url(#lolliBody)" />
            {/* swirl arms (4-arm pinwheel) */}
            <g style={{ transformOrigin: "120px 150px" }}>
              <path d="M120 150 Q160 110 200 130 Q170 160 120 150 Z" fill="url(#lolliSwirl)" opacity="0.85" />
              <path d="M120 150 Q160 190 130 230 Q100 200 120 150 Z" fill="url(#lolliSwirl)" opacity="0.85" />
              <path d="M120 150 Q80 190 40 170 Q70 140 120 150 Z"   fill="url(#lolliSwirl)" opacity="0.85" />
              <path d="M120 150 Q80 110 110 70  Q140 100 120 150 Z" fill="url(#lolliSwirl)" opacity="0.85" />
            </g>
            {/* glossy highlight */}
            <ellipse cx="92" cy="118" rx="22" ry="12" fill="rgba(255,255,255,0.55)" />

            {/* crown on top */}
            <g transform="translate(70, 30)">
              <path
                d="M0 50 L0 18 L20 36 L40 8 L60 36 L80 18 L80 50 Z"
                fill="url(#crownGrad)"
                stroke="rgba(180,120,40,0.55)"
                strokeWidth="1.5"
                style={{ filter: "drop-shadow(0 0 12px rgba(255,206,120,0.9))" }}
              />
              <circle cx="40" cy="14" r="4" fill="#ff808c" />
              <circle cx="8"  cy="28" r="3" fill="#aae8d2" />
              <circle cx="72" cy="28" r="3" fill="#ffb6ce" />
            </g>
          </svg>

          {/* scoped keyframes — no global pollution */}
          <style>{`
            @keyframes sugar-hero-in {
              0%   { opacity: 0; transform: translateY(28px) scale(0.95) rotate(-4deg); }
              60%  { opacity: 0.95; transform: translateY(-4px) scale(1.03) rotate(2deg); }
              100% { opacity: 0.95; transform: translateY(0) scale(1) rotate(0deg); }
            }
            @keyframes sugar-halo-pulse {
              0%   { opacity: 0; }
              60%  { opacity: 1; }
              100% { opacity: 0.85; }
            }
            @media (prefers-reduced-motion: reduce) {
              svg { animation: none !important; opacity: 0.92 !important; }
            }
          `}</style>
        </div>
      )}
    />
  );
}
