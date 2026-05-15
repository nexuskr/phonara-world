import { useEffect, useRef, useState } from "react";

/**
 * Balance counter that animates between values via RAF.
 * - immediate=true to snap (e.g., on mode switch)
 */
export default function BalanceTicker({
  value,
  duration = 600,
  className = "",
  pulse,
}: {
  value: number;
  duration?: number;
  className?: string;
  /** "up" | "down" | null — triggers a brief flash */
  pulse?: "up" | "down" | null;
}) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef(0);

  useEffect(() => {
    const from = fromRef.current;
    const to = value;
    if (from === to) return;
    cancelAnimationFrame(rafRef.current ?? 0);
    startRef.current = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - startRef.current) / duration);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - p, 3);
      const v = from + (to - from) * eased;
      setDisplay(v);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
      else fromRef.current = to;
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current ?? 0);
  }, [value, duration]);

  return (
    <span
      className={`tabular-nums transition-colors duration-300 ${
        pulse === "up" ? "text-emerald-400" : pulse === "down" ? "text-red-400" : ""
      } ${className}`}
    >
      {Math.round(display).toLocaleString()}
    </span>
  );
}
