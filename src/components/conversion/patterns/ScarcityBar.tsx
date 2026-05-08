import { Users } from "lucide-react";

/** 좌석 진행 바 — "오늘 23/100". */
export default function ScarcityBar({
  used,
  total,
  label = "오늘 좌석",
}: {
  used: number;
  total: number;
  label?: string;
}) {
  const pct = Math.min(100, (used / total) * 100);
  const danger = pct >= 80;

  return (
    <div className="glass rounded-xl p-3">
      <div className="flex items-center justify-between text-[10px] mb-1.5">
        <span className="flex items-center gap-1 text-muted-foreground">
          <Users className="w-3 h-3" /> {label}
        </span>
        <span
          className={`font-bold ${danger ? "text-destructive animate-pulse" : "text-gold"}`}
        >
          {used} / {total}
        </span>
      </div>
      <div className="h-1.5 bg-muted/40 rounded-full overflow-hidden">
        <div
          className={`h-full ${
            danger ? "bg-gradient-to-r from-destructive to-gold" : "bg-gradient-gold"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
