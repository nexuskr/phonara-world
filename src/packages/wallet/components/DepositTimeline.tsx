/**
 * DepositTimeline — 신청됨 · 확인중 · 반영완료 (단일 출처).
 * 50-70대용 wording. technical wording 금지.
 */
import { Check } from "lucide-react";
import { g } from "@pkg/core/i18n/glossary";
import { cn } from "@/lib/utils";

export type TimelineStage = 1 | 2 | 3;

export function statusToStage(status: string): TimelineStage {
  if (status === "filled") return 3;
  if (status === "matching" || status === "manual_review" || status === "awaiting_payment") return 2;
  return 1;
}

export default function DepositTimeline({ stage, compact = false }: { stage: TimelineStage; compact?: boolean }) {
  const labels = [g("depositTimelineStep1"), g("depositTimelineStep2"), g("depositTimelineStep3")];
  return (
    <ol className={cn("flex items-center gap-1 w-full", compact ? "text-[10px]" : "text-xs")}>
      {labels.map((label, i) => {
        const n = (i + 1) as TimelineStage;
        const done = n < stage;
        const active = n === stage;
        return (
          <li key={label} className="flex-1 flex items-center gap-1.5 min-w-0">
            <span
              className={cn(
                "shrink-0 rounded-full grid place-items-center font-black",
                compact ? "w-4 h-4" : "w-5 h-5",
                done && "bg-amber-400 text-neutral-900",
                active && "bg-amber-400 text-neutral-900 animate-pulse",
                !done && !active && "bg-muted text-muted-foreground",
              )}
            >
              {done ? <Check className={compact ? "w-2.5 h-2.5" : "w-3 h-3"} /> : <span>{n}</span>}
            </span>
            <span className={cn("font-bold truncate", active ? "text-amber-300" : "text-muted-foreground")}>
              {label}
            </span>
            {i < 2 && (
              <span className={cn("h-px flex-1", n < stage ? "bg-amber-400/60" : "bg-border")} />
            )}
          </li>
        );
      })}
    </ol>
  );
}
