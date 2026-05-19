import { useEffect, useRef } from "react";
import { useGameFrame } from "../hooks/useGameFrame";
import { cn } from "@/lib/utils";

export interface SpinReelProps {
  symbols: readonly string[];
  /** Active index — reel will GPU-translate to land here. */
  targetIndex: number;
  spinning: boolean;
  /** Visible window height in cells. */
  windowSize?: number;
  className?: string;
}

/**
 * P1-04 SpinReel — GPU translateY virtual reel.
 * Uses pure CSS transform on a single track DIV — repaint-free on transform.
 * Auto-snaps to target with imperial-glow ease.
 */
export function SpinReel({
  symbols,
  targetIndex,
  spinning,
  windowSize = 3,
  className,
}: SpinReelProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(0);
  const cellRef = useRef(64);

  useEffect(() => {
    const el = trackRef.current?.parentElement;
    if (!el) return;
    cellRef.current = el.clientHeight / windowSize;
  }, [windowSize]);

  useGameFrame((dt) => {
    if (!trackRef.current) return;
    const cell = cellRef.current;
    const target = targetIndex * cell;
    if (spinning) {
      offsetRef.current += (cell * 18 * dt) / 1000;
    } else {
      offsetRef.current += (target - offsetRef.current) * Math.min(1, dt / 120);
    }
    const total = symbols.length * cell;
    const y = -(offsetRef.current % total);
    trackRef.current.style.transform = `translate3d(0, ${y}px, 0)`;
  }, !spinning && Math.abs(offsetRef.current - targetIndex * cellRef.current) < 0.5);

  return (
    <div
      className={cn(
        "imperial-card relative overflow-hidden rounded-xl",
        "border border-border/60",
        className,
      )}
      style={{ height: `${windowSize * 64}px` }}
    >
      <div ref={trackRef} className="absolute inset-x-0 top-0 will-change-transform">
        {[...symbols, ...symbols, ...symbols].map((s, i) => (
          <div
            key={i}
            className="flex items-center justify-center text-3xl"
            style={{ height: 64 }}
          >
            {s}
          </div>
        ))}
      </div>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/70 via-transparent to-background/70" />
    </div>
  );
}
