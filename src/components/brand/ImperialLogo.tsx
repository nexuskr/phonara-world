/**
 * ImperialLogo — Phonara.World 황실 브랜드 로고.
 * 인라인 SVG (외부 이미지 0) · 디자인 토큰 only.
 * Stake / Rollbit / Bybit 수준의 압도적 정체성을 위해
 *  - 8각 황실 별 + 왕관 + 다이아몬드 컷 P
 *  - Gold → Rose Pink linear gradient
 *  - Hover: 0.5° 회전 + multi-layer glow pulse (transform/opacity only)
 *  - prefers-reduced-motion 가드
 */
import { Link } from "react-router-dom";
import { memo, useEffect } from "react";

const KEYFRAME_ID = "imperial-mark-pulse-keyframes";
function ensureKeyframes() {
  if (typeof document === "undefined") return;
  if (document.getElementById(KEYFRAME_ID)) return;
  const s = document.createElement("style");
  s.id = KEYFRAME_ID;
  s.textContent =
    "@keyframes imperialMarkPulse{0%,100%{opacity:.25;transform:translate(-50%,-50%) var(--imp-tf,rotate(0)) scale(.7)}50%{opacity:1;transform:translate(-50%,-50%) var(--imp-tf,rotate(0)) scale(1)}}";
  document.head.appendChild(s);
}

interface Props {
  size?: "sm" | "md" | "lg";
  withWordmark?: boolean;
  withWorld?: boolean;
  to?: string;
  className?: string;
  ariaLabel?: string;
}

const MARK_SIZE = { sm: 28, md: 36, lg: 48 } as const;
const WORD_CLASS = {
  sm: "text-sm tracking-[0.22em]",
  md: "text-base tracking-[0.24em]",
  lg: "text-xl tracking-[0.26em]",
} as const;

function ImperialMark({ px }: { px: number }) {
  const gradId = `imperial-mark-grad-${px}`;
  const strokeId = `imperial-mark-stroke-${px}`;
  // 6 hover particles on a ring around the mark (transform/opacity only).
  const particles = [0, 60, 120, 180, 240, 300];
  return (
    <span
      className="relative inline-flex items-center justify-center shrink-0 [&_svg]:will-change-transform motion-reduce:[&_svg]:!transform-none"
      style={{ width: px, height: px, transform: "translateZ(0)" }}
      aria-hidden
    >
      {/* multi-layer halo: gold core + pink mid + rose outer ring */}
      <span
        className="absolute inset-0 rounded-2xl opacity-70 blur-[10px] transition-opacity duration-300 group-hover:opacity-100 will-change-[opacity]"
        style={{
          background:
            "radial-gradient(60% 60% at 50% 50%, hsl(var(--gold) / 0.55), transparent 70%), radial-gradient(80% 80% at 50% 60%, hsl(var(--pink) / 0.35), transparent 75%)",
        }}
      />
      <span
        className="absolute -inset-1 rounded-full opacity-0 group-hover:opacity-90 transition-opacity duration-300 blur-[6px] motion-reduce:!opacity-0"
        style={{
          background:
            "conic-gradient(from 0deg, hsl(330 90% 60% / 0.55), hsl(var(--gold) / 0.45), hsl(330 90% 60% / 0.55))",
        }}
      />
      {/* 6 particle dots — pure transform/opacity, GPU-friendly */}
      <span className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 motion-reduce:!opacity-0">
        {particles.map((deg, i) => (
          <span
            key={deg}
            className="absolute left-1/2 top-1/2 block w-1 h-1 rounded-full bg-[hsl(var(--gold))] shadow-[0_0_6px_hsl(var(--gold)/0.9)] will-change-transform"
            style={{
              transform: `translate(-50%, -50%) rotate(${deg}deg) translateY(-${px * 0.62}px) translateZ(0)`,
              animation: `imperialMarkPulse 1.6s ${(i * 0.12).toFixed(2)}s ease-in-out infinite`,
            }}
          />
        ))}
      </span>
      <svg
        viewBox="0 0 48 48"
        width={px}
        height={px}
        className="relative transition-transform duration-500 group-hover:rotate-[1.2deg] group-active:scale-[0.96] motion-reduce:transition-none"
        style={{ transform: "translateZ(0)" }}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="hsl(var(--gold))" />
            <stop offset="55%" stopColor="hsl(var(--gold))" />
            <stop offset="100%" stopColor="hsl(var(--pink))" />
          </linearGradient>
          <linearGradient id={strokeId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="hsl(var(--gold) / 0.9)" />
            <stop offset="100%" stopColor="hsl(var(--pink) / 0.9)" />
          </linearGradient>
        </defs>

        {/* 8-pointed imperial star backdrop */}
        <g transform="translate(24 24)">
          <path
            d="M0 -22 L4 -8 L18 -14 L8 -4 L22 0 L8 4 L18 14 L4 8 L0 22 L-4 8 L-18 14 L-8 4 L-22 0 L-8 -4 L-18 -14 L-4 -8 Z"
            fill={`url(#${gradId})`}
            opacity="0.95"
          />
          <circle r="14" fill="hsl(var(--background))" />
          <circle r="14" fill="none" stroke={`url(#${strokeId})`} strokeWidth="1.25" />
        </g>

        {/* Imperial Crown peaks */}
        <g transform="translate(24 14)" fill={`url(#${gradId})`}>
          <path d="M-8 0 L-4.5 -4 L-1.5 -1.5 L0 -5 L1.5 -1.5 L4.5 -4 L8 0 Z" />
          <circle cx="0" cy="-5.5" r="1.1" />
          <circle cx="-4.5" cy="-4" r="0.7" />
          <circle cx="4.5" cy="-4" r="0.7" />
        </g>

        {/* Diamond-cut serif P */}
        <g transform="translate(24 28)" fill={`url(#${gradId})`}>
          <path d="M-4.6 7.5 L-4.6 -7.5 L1.4 -7.5 Q5.8 -7.5 5.8 -3 Q5.8 1.5 1.4 1.5 L-1.2 1.5 L-1.2 7.5 Z M-1.2 -1.2 L1.0 -1.2 Q2.6 -1.2 2.6 -3 Q2.6 -4.8 1.0 -4.8 L-1.2 -4.8 Z" />
          {/* serif feet */}
          <rect x="-6" y="6.4" width="6" height="1.4" rx="0.4" />
          <rect x="-6" y="-8.8" width="3" height="1.3" rx="0.4" />
        </g>
      </svg>
    </span>
  );
}

function ImperialLogoBase({
  size = "md",
  withWordmark = true,
  withWorld = false,
  to = "/",
  className = "",
  ariaLabel = "PHONARA.WORLD 홈",
}: Props) {
  const px = MARK_SIZE[size];
  const word = WORD_CLASS[size];
  useEffect(() => { ensureKeyframes(); }, []);

  const inner = (
    <span className={`group inline-flex items-center gap-2.5 ${className}`}>
      <ImperialMark px={px} />
      {withWordmark && (
        <span
          className={`font-imperial font-black ${word} bg-clip-text text-transparent transition-[filter] duration-300 group-hover:[filter:drop-shadow(0_0_14px_hsl(var(--gold)/0.7))_drop-shadow(0_0_22px_hsl(330_90%_60%/0.45))] group-active:[filter:drop-shadow(0_0_18px_hsl(var(--gold)/0.85))]`}
          style={{
            backgroundImage:
              "linear-gradient(95deg, hsl(var(--gold)) 0%, hsl(var(--gold)) 50%, hsl(var(--pink)) 100%)",
          }}
        >
          PHONARA
          {withWorld && (
            <>
              <span className="mx-1 text-[hsl(var(--pink))]">◆</span>
              <span>WORLD</span>
            </>
          )}
        </span>
      )}
    </span>
  );

  if (!to) return inner;
  return (
    <Link to={to} aria-label={ariaLabel} className="inline-flex items-center">
      {inner}
    </Link>
  );
}

const ImperialLogo = memo(ImperialLogoBase);
export default ImperialLogo;
