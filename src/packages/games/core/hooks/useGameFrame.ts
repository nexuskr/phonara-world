import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "@/lib/haptics";

type FrameFn = (dt: number, t: number) => void;

/**
 * rAF loop with auto-pause + reduced-motion gate + tab-hidden gate.
 * dt is clamped to 50ms to prevent post-resume runaway.
 */
export function useGameFrame(fn: FrameFn, paused = false) {
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (paused || prefersReducedMotion()) return;

    let raf = 0;
    let last = performance.now();
    const loop = (t: number) => {
      const dt = Math.min(50, t - last);
      last = t;
      fnRef.current(dt, t);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [paused]);
}
