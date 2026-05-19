import { cn } from "@/lib/utils";

export interface RNGVisualizerProps {
  /** Recent round seeds (truncated). Most-recent first. */
  seeds: readonly string[];
  className?: string;
}

/**
 * P1-11 RNGVisualizer — micro entropy bead row.
 * Shows last N seed prefixes as colored beads; reinforces "fair, not rigged".
 */
export function RNGVisualizer({ seeds, className }: RNGVisualizerProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-1 overflow-hidden",
        "rounded-full border border-border/40 bg-card/40 px-2 py-1",
        className,
      )}
      aria-label="최근 라운드 엔트로피"
    >
      {seeds.slice(0, 24).map((s, i) => {
        const hue = (parseInt(s.slice(0, 6), 16) || 0) % 360;
        return (
          <span
            key={`${i}-${s.slice(0, 4)}`}
            className="h-2 w-2 rounded-full"
            style={{
              background: `hsl(${hue} 80% 55%)`,
              boxShadow: `0 0 6px hsl(${hue} 80% 55% / 0.6)`,
            }}
            title={s.slice(0, 8)}
          />
        );
      })}
      {seeds.length === 0 && (
        <span className="text-[10px] text-muted-foreground">대기 중</span>
      )}
    </div>
  );
}
