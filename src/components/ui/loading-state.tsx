import * as React from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * LoadingState — unified loading placeholders for lists, cards, and pages.
 * All variants use design tokens (no hard-coded colors).
 */

export interface LoadingListProps extends React.HTMLAttributes<HTMLDivElement> {
  rows?: number;
  rowHeight?: "sm" | "md" | "lg";
}

const rowHeightMap = { sm: "h-12", md: "h-16", lg: "h-20" } as const;

export const LoadingList: React.FC<LoadingListProps> = ({
  rows = 4,
  rowHeight = "md",
  className,
  ...props
}) => (
  <div
    role="status"
    aria-busy="true"
    aria-label="로딩 중"
    className={cn("space-y-2", className)}
    {...props}
  >
    {Array.from({ length: rows }).map((_, i) => (
      <Skeleton
        key={i}
        className={cn(
          rowHeightMap[rowHeight],
          "w-full rounded-xl bg-muted/40 border border-border/40",
        )}
        style={{ animationDelay: `${i * 80}ms` }}
      />
    ))}
  </div>
);

export const LoadingCard: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...props
}) => (
  <div
    role="status"
    aria-busy="true"
    className={cn("space-y-3 rounded-2xl border border-border/40 bg-card/40 p-6", className)}
    {...props}
  >
    <Skeleton className="h-4 w-1/3 rounded-md bg-muted/50" />
    <Skeleton className="h-8 w-2/3 rounded-md bg-muted/50" />
    <Skeleton className="h-3 w-full rounded-md bg-muted/40" />
    <Skeleton className="h-3 w-5/6 rounded-md bg-muted/40" />
  </div>
);

export const LoadingPage: React.FC<{ label?: string }> = ({ label = "불러오는 중…" }) => (
  <div
    role="status"
    aria-busy="true"
    className="flex min-h-[40vh] flex-col items-center justify-center gap-4"
  >
    <div className="relative h-12 w-12">
      <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
      <div className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
    <p className="text-xs text-muted-foreground tracking-wide">{label}</p>
  </div>
);

export const LoadingKpiGrid: React.FC<{ count?: number }> = ({ count = 4 }) => (
  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="rounded-2xl border border-border/40 bg-card/40 p-4 space-y-2">
        <Skeleton className="h-3 w-1/2 rounded-md bg-muted/50" />
        <Skeleton className="h-7 w-3/4 rounded-md bg-muted/60" />
        <Skeleton className="h-2 w-full rounded-md bg-muted/40" />
      </div>
    ))}
  </div>
);
