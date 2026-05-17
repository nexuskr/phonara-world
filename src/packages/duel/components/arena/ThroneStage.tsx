/**
 * ThroneStage v2 — 시네마틱 옥좌. nearMissIntensity 에 따라 glow/sweep 동적 가속.
 */
import { ReactNode } from "react";

export function ThroneStage({
  children,
  nearMissIntensity = 0,
}: {
  children: ReactNode;
  nearMissIntensity?: number;
}) {
  const i = Math.max(0, Math.min(1, nearMissIntensity));
  const outerAlpha = 0.18 + i * 0.37;
  const sweepSec = (6 - i * 4.2).toFixed(2);
  const pinkScale = 1 + i * 0.08;

  return (
    <div
      className="relative isolate overflow-hidden rounded-3xl border border-amber-400/30 bg-[#0A0503]"
      style={{
        boxShadow: `0 0 ${36 + i * 60}px hsl(38 92% 56% / ${0.18 + i * 0.42}), 0 0 ${70 + i * 80}px hsl(330 90% 60% / ${0.10 + i * 0.35})`,
        transition: "box-shadow 220ms ease-out",
      }}
    >
      {/* Outer radial glow — dynamic */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(60% 50% at 50% 0%, hsl(38 92% 56% / ${outerAlpha}), transparent 65%), radial-gradient(80% 60% at 50% 100%, hsl(330 90% 60% / ${0.22 + i * 0.25}), transparent 70%)`,
          transform: `scale(${pinkScale})`,
          transition: "background 220ms ease-out, transform 220ms ease-out",
        }}
      />

      {/* Inner sweep highlight — speed scales with intensity */}
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

      {/* Throne floor reflection */}
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

      <div className="relative z-10">{children}</div>

      <style>{`@keyframes throne-sweep { 0%{background-position:-120% 0} 100%{background-position:220% 0} }`}</style>
    </div>
  );
}

export default ThroneStage;
