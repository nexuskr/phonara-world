import { formatKRW } from "@/lib/store";

/** Anchor pricing — 정가 strikethrough + 할인가 강조. */
export default function AnchorPrice({
  original,
  discounted,
  savedLabel,
}: {
  original: number;
  discounted: number;
  savedLabel?: string;
}) {
  const pct = Math.round(((original - discounted) / original) * 100);
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-xs text-muted-foreground line-through tabular-nums">
        {formatKRW(original)}
      </span>
      <span className="font-display font-black text-2xl text-money-strong tabular-nums">
        {formatKRW(discounted)}
      </span>
      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-secondary/20 text-secondary">
        -{pct}% {savedLabel ?? "첫결제"}
      </span>
    </div>
  );
}
