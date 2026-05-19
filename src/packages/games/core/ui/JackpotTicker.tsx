import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface JackpotTickerProps {
  /** Server-pushed value. Caller wires `useGameChannel` and pipes value here. */
  value: number;
  label?: string;
  className?: string;
}

/**
 * P1-08 JackpotTicker — pulse-on-change counter.
 *
 * Pure presentational: realtime wiring lives in the caller (must use
 * `useGameChannel` from `@pkg/realtime`). Keeps this primitive tree-shake-friendly
 * and free of channel coupling.
 */
export function JackpotTicker({ value, label = "JACKPOT", className }: JackpotTickerProps) {
  const [pulse, setPulse] = useState(false);
  const prev = useRef(value);
  useEffect(() => {
    if (prev.current === value) return;
    prev.current = value;
    setPulse(true);
    const t = window.setTimeout(() => setPulse(false), 600);
    return () => window.clearTimeout(t);
  }, [value]);
  return (
    <div
      className={cn(
        "imperial-card relative inline-flex items-center gap-2 rounded-full",
        "border border-primary/40 px-3 py-1.5",
        pulse && "pulse-halo",
        className,
      )}
    >
      <span className="text-[10px] font-bold tracking-widest text-muted-foreground">
        {label}
      </span>
      <span className="text-gradient-gold font-mono text-sm font-extrabold tabular-nums">
        {value.toLocaleString("ko-KR")}
      </span>
    </div>
  );
}
