/**
 * ThroneStage — 시네마틱 옥좌 배경 (transform/opacity only).
 */
import { ReactNode } from "react";

export function ThroneStage({ children }: { children: ReactNode }) {
  return (
    <div className="relative isolate overflow-hidden rounded-3xl border border-amber-400/30 bg-[#0A0503]"
         style={{ boxShadow: "0 0 36px hsl(38 92% 56% / 0.18), 0 0 70px hsl(330 90% 60% / 0.10)" }}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 0%, hsl(38 92% 56% / 0.32), transparent 65%), radial-gradient(80% 60% at 50% 100%, hsl(330 90% 60% / 0.22), transparent 70%)",
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
    </div>
  );
}

export default ThroneStage;
