import { type ReactNode } from "react";
import { useViewportPause } from "../hooks/useViewportPause";
import { cn } from "@/lib/utils";

/**
 * P1-01 GameShell — root container.
 *
 * - IntersectionObserver auto-pause (<5% visible)
 * - Tab-hidden pause
 * - Imperial card surface + corner shine
 * - Exposes `data-paused` for child rAF loops to read
 */
export interface GameShellProps {
  children: ReactNode;
  className?: string;
  /** Optional ambient glow tier. */
  tier?: "low" | "mid" | "high";
}

export function GameShell({ children, className, tier = "mid" }: GameShellProps) {
  const { ref, paused } = useViewportPause<HTMLDivElement>();
  return (
    <div
      ref={ref}
      data-paused={paused ? "1" : "0"}
      data-tier={tier}
      className={cn(
        "imperial-card imperial-corner-shine relative overflow-hidden",
        "rounded-2xl border border-border/60 backdrop-blur-xl",
        tier === "high" && "glow-gold",
        tier === "mid" && "shadow-[0_8px_32px_hsl(var(--primary)/0.18)]",
        "transition-shadow duration-300",
        className,
      )}
    >
      {children}
    </div>
  );
}
