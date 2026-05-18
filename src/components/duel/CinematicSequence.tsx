/**
 * CinematicSequence — 3-stage visual drama keyed off `near_miss_intensity`
 * (0..1) returned by `imperial_compute_display_signals`. Strictly visual:
 * does NOT alter actual outcome (Display Signals Isolation Proof).
 *
 * Respects `prefers-reduced-motion` — collapses to static halo.
 */
import { useEffect, useMemo, useState } from "react";

export type CinematicProps = {
  /** 0..1 — higher = more dramatic */
  intensity: number;
  /** 1 | 2 | 3 — derived stage */
  level?: 1 | 2 | 3;
  /** Optional verdict to drive final flare */
  verdict?: "won" | "lost" | null;
};

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    const fn = () => setReduced(m.matches);
    fn();
    m.addEventListener?.("change", fn);
    return () => m.removeEventListener?.("change", fn);
  }, []);
  return reduced;
}

export function CinematicSequence({ intensity, level, verdict }: CinematicProps) {
  const reduced = useReducedMotion();
  const stage = level ?? (intensity >= 0.85 ? 3 : intensity >= 0.55 ? 2 : 1);

  const ring = useMemo(() => {
    if (stage === 3) return "shadow-[0_0_64px_8px_hsl(45_95%_60%/0.55)]";
    if (stage === 2) return "shadow-[0_0_36px_4px_hsl(38_92%_55%/0.4)]";
    return "shadow-[0_0_20px_0px_hsl(38_92%_55%/0.22)]";
  }, [stage]);

  const verdictTone =
    verdict === "won"
      ? "from-amber-300 via-amber-200 to-yellow-100"
      : verdict === "lost"
      ? "from-rose-400/80 via-rose-300/60 to-rose-200/40"
      : "from-amber-400/40 via-amber-300/30 to-amber-200/20";

  return (
    <div
      className={[
        "relative w-full aspect-[2/1] rounded-2xl overflow-hidden border border-border/50 bg-card/60 backdrop-blur-xl",
        ring,
        reduced ? "" : stage === 3 ? "animate-pulse" : "",
      ].join(" ")}
      role="img"
      aria-label={`결투 연출 단계 ${stage}, 강도 ${(intensity * 100).toFixed(0)}%`}
    >
      <div
        className={`absolute inset-0 bg-gradient-to-br ${verdictTone} opacity-70`}
        style={{ transform: reduced ? undefined : `scale(${1 + intensity * 0.04})`, transition: "transform 600ms ease-out" }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="font-display font-black text-3xl md:text-5xl tracking-tight text-amber-950 drop-shadow-[0_2px_8px_hsl(38_92%_15%/0.55)]">
          {verdict === "won" ? "👑 VICTORY" : verdict === "lost" ? "⚔️ DEFEAT" : stage === 3 ? "⚡ CLIMAX" : stage === 2 ? "🔥 TENSE" : "🕊️ CALM"}
        </div>
      </div>
      <div className="absolute bottom-2 right-3 text-[10px] font-mono text-amber-950/70">
        intensity {intensity.toFixed(3)}
      </div>
    </div>
  );
}

export default CinematicSequence;
