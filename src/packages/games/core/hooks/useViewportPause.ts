import { useEffect, useRef, useState } from "react";
import { GAME_VIEWPORT_PAUSE_THRESHOLD } from "../constants";

/**
 * IntersectionObserver-based pause gate.
 * Returns `paused=true` whenever the element is <5% visible OR tab is hidden.
 * Zero-cost when SSR / no IntersectionObserver.
 */
export function useViewportPause<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !ref.current) return;
    const el = ref.current;

    const onVis = () => {
      if (document.hidden) setPaused(true);
    };
    document.addEventListener("visibilitychange", onVis);

    if (!("IntersectionObserver" in window)) {
      return () => document.removeEventListener("visibilitychange", onVis);
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (document.hidden) return;
        setPaused(entry.intersectionRatio < GAME_VIEWPORT_PAUSE_THRESHOLD);
      },
      { threshold: [0, GAME_VIEWPORT_PAUSE_THRESHOLD, 0.25, 1] },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return { ref, paused };
}
