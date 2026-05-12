import { Flame } from "lucide-react";

/** Tiny inline badge that surfaces a viral score (0..1). Color-shifts at 0.5 / 0.78. */
export default function ViralScoreBadge({ score }: { score: number }) {
  const pct = Math.round(Math.max(0, Math.min(1, score)) * 100);
  const tone =
    score >= 0.78 ? "bg-primary/15 text-primary border-primary/40"
    : score >= 0.5 ? "bg-secondary/15 text-secondary border-secondary/40"
    : "bg-muted/40 text-muted-foreground border-border/50";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border ${tone}`}>
      <Flame className="w-3 h-3" />
      {pct}
    </span>
  );
}
