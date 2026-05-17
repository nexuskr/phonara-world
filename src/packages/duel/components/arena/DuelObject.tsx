/**
 * DuelObject — Wheel / Card / Dice 회전체. rolledDeg + tick 진행률로 회전.
 */
import type { DuelObjectKind } from "@pkg/duel";

export function DuelObject({
  kind,
  rolledDeg,
  progress,
  spinning,
}: {
  kind: DuelObjectKind;
  rolledDeg: number;
  progress: number; // 0..1
  spinning: boolean;
}) {
  const baseTurns = kind === "wheel" ? 5 : kind === "dice" ? 4 : 3;
  const deg = spinning ? baseTurns * 360 * progress + rolledDeg * progress : rolledDeg;

  return (
    <div className="relative w-44 h-44 md:w-56 md:h-56 grid place-items-center" style={{ perspective: 800 }}>
      {/* Outer halo */}
      <div
        aria-hidden
        className="absolute inset-0 rounded-full"
        style={{
          background: "conic-gradient(from 0deg, #F5C518, #F472B6, #A78BFA, #F5C518)",
          filter: "blur(14px)",
          opacity: 0.45 + progress * 0.35,
          willChange: "transform, opacity",
        }}
      />
      <div
        className="relative w-40 h-40 md:w-52 md:h-52 rounded-full grid place-items-center"
        style={{
          background:
            "radial-gradient(circle at 30% 25%, hsl(38 92% 70% / 0.45), hsl(38 92% 40% / 0.2) 50%, #0A0503 80%)",
          boxShadow: "inset 0 0 30px hsl(38 92% 50% / 0.4), 0 0 30px hsl(330 90% 60% / 0.4)",
          transform: `rotate(${deg}deg) translateZ(0)`,
          transition: spinning ? "transform 60ms linear" : "transform 600ms cubic-bezier(.22,1,.36,1)",
          willChange: "transform",
        }}
      >
        {kind === "wheel" && <Wheel />}
        {kind === "card" && <Card />}
        {kind === "dice" && <Dice />}
      </div>
      {/* Top pointer */}
      <div
        aria-hidden
        className="absolute top-1 left-1/2 -translate-x-1/2 w-3 h-5"
        style={{
          background: "linear-gradient(180deg,#FDE68A,#F472B6)",
          clipPath: "polygon(50% 100%, 0 0, 100% 0)",
          filter: "drop-shadow(0 0 6px hsl(38 92% 60% / 0.8))",
        }}
      />
    </div>
  );
}

function Wheel() {
  const segs = 8;
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      {Array.from({ length: segs }).map((_, i) => {
        const a0 = (i / segs) * Math.PI * 2 - Math.PI / 2;
        const a1 = ((i + 1) / segs) * Math.PI * 2 - Math.PI / 2;
        const x0 = 50 + 48 * Math.cos(a0), y0 = 50 + 48 * Math.sin(a0);
        const x1 = 50 + 48 * Math.cos(a1), y1 = 50 + 48 * Math.sin(a1);
        const fill = i % 2 === 0 ? "hsl(38 92% 55% / 0.55)" : "hsl(330 90% 60% / 0.45)";
        return <path key={i} d={`M50,50 L${x0},${y0} A48,48 0 0,1 ${x1},${y1} Z`} fill={fill} stroke="#0A0503" strokeWidth="0.6" />;
      })}
      <circle cx="50" cy="50" r="10" fill="#0A0503" stroke="#F5C518" strokeWidth="1.2" />
    </svg>
  );
}

function Card() {
  return (
    <div className="font-imperial text-6xl md:text-7xl text-amber-200" style={{ textShadow: "0 0 14px hsl(330 90% 60% / 0.7)" }}>
      ♛
    </div>
  );
}

function Dice() {
  return (
    <div className="font-imperial text-5xl md:text-6xl text-amber-100" style={{ textShadow: "0 0 14px hsl(38 92% 60% / 0.8)" }}>
      ⚂
    </div>
  );
}

export default DuelObject;
