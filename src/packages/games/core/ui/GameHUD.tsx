import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * P1-03 GameHUD — overlay row for balance / multiplier / status pill.
 * Pure presentational, design-token only.
 */
export interface GameHUDProps {
  left?: ReactNode;
  center?: ReactNode;
  right?: ReactNode;
  className?: string;
}

export function GameHUD({ left, center, right, className }: GameHUDProps) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-0 top-0 z-10",
        "flex items-center justify-between gap-3 p-3 md:p-4",
        "bg-gradient-to-b from-background/70 to-transparent",
        className,
      )}
    >
      <div className="pointer-events-auto min-w-0 truncate text-sm font-medium text-foreground/90">
        {left}
      </div>
      <div className="pointer-events-auto text-gradient-gold text-base font-extrabold tracking-tight md:text-lg">
        {center}
      </div>
      <div className="pointer-events-auto min-w-0 truncate text-right text-sm font-medium text-foreground/90">
        {right}
      </div>
    </div>
  );
}
