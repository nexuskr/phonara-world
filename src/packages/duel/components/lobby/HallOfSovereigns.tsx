/**
 * HallOfSovereigns — Left wing: 명예의 전당 Top 5.
 * Sprint 4 PR-3: Top1 mini aurora + duel-pulse-ring + haptic + duel-card-glass.
 * - transform + opacity only animations (compositor-only)
 * - reduced-motion / low-end fallback inherits from index.css media queries
 * - 0 framer-motion imports, 0 money-flow, 0 imperial_* RPC touch
 */
import { triggerHaptic } from "@/packages/native";
import type { KeyboardEvent } from "react";

const SOVEREIGNS = [
  { rank: 1, nick: "황제#7821", emoji: "👑", crowns: 482, color: "#F5C518" },
  { rank: 2, nick: "황제#3094", emoji: "🦅", crowns: 367, color: "#F472B6" },
  { rank: 3, nick: "황제#5527", emoji: "🐉", crowns: 318, color: "#A78BFA" },
  { rank: 4, nick: "황제#1148", emoji: "🦁", crowns: 274, color: "#FF8A3D" },
  { rank: 5, nick: "황제#9013", emoji: "🐺", crowns: 251, color: "#60A5FA" },
];

export function HallOfSovereigns() {
  const onActivate = (rank: number) => {
    triggerHaptic(rank === 1 ? "medium" : "light");
  };
  const onKey = (rank: number) => (e: KeyboardEvent<HTMLLIElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onActivate(rank);
    }
  };

  return (
    <aside
      className="duel-card-glass relative overflow-hidden p-4 border border-amber-500/25"
      style={{ contain: "paint" }}
    >
      <div className="text-[10px] tracking-[0.32em] font-black uppercase text-amber-400/85 mb-1">
        Hall of Sovereigns
      </div>
      <h3 className="font-imperial text-lg text-amber-100 mb-3 leading-tight">
        명예의 전당
      </h3>
      <ol className="space-y-2">
        {SOVEREIGNS.map((s) => {
          const isEmperor = s.rank === 1;
          return (
            <li
              key={s.rank}
              role="button"
              tabIndex={0}
              onClick={() => onActivate(s.rank)}
              onKeyDown={onKey(s.rank)}
              className={[
                "relative flex items-center gap-3 rounded-xl px-2.5 py-2 bg-black/30 border border-amber-500/15",
                "transition-transform duration-[140ms] ease-[cubic-bezier(.2,.8,.2,1)]",
                "hover:scale-[1.01] active:scale-[0.985] cursor-pointer outline-none",
                "focus-visible:ring-2 focus-visible:ring-amber-300/60",
                isEmperor ? "duel-pulse-ring overflow-hidden border-amber-400/40" : "",
              ].join(" ")}
              style={{ willChange: "transform" }}
            >
              {isEmperor && (
                <span
                  aria-hidden
                  className="imperial-aurora pointer-events-none absolute inset-0 rounded-xl opacity-30"
                />
              )}
              <div
                className="relative w-9 h-9 rounded-lg grid place-items-center text-lg shrink-0"
                style={{
                  background: `radial-gradient(circle at 30% 30%, ${s.color}, #0A0503)`,
                  boxShadow: `0 0 14px ${s.color}55, inset 0 0 8px ${s.color}33`,
                }}
              >
                {s.emoji}
              </div>
              <div className="relative min-w-0 flex-1">
                <div className="text-[12px] font-bold text-amber-100 truncate">
                  #{s.rank} · {s.nick}
                </div>
                <div className="text-[10px] text-amber-300/70 tabular-nums">
                  Crown {s.crowns}
                </div>
              </div>
              {isEmperor && (
                <span className="relative text-[9px] tracking-[0.2em] font-black text-pink-300 bg-pink-500/15 border border-pink-400/40 rounded-full px-2 py-0.5">
                  EMPEROR
                </span>
              )}
            </li>
          );
        })}
      </ol>
      <p className="mt-3 text-[10px] text-amber-300/60 leading-snug break-keep">
        폐하의 이름이 이 전당에 새겨지길 황실은 기다립니다.
      </p>
    </aside>
  );
}

export default HallOfSovereigns;
