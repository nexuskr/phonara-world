import { useTranslation } from "react-i18next";
import { Wallet, AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatKRW } from "@/lib/store";

interface Props {
  cap: number;
  used: number;
  remaining: number;
  pct: number;
  loading?: boolean;
  className?: string;
  /** compact: single-line variant for cards. */
  compact?: boolean;
}

/**
 * DailyCapMeter — visualises daily earnings cap usage.
 * Tokens only: primary / accent / destructive via design system.
 */
export default function DailyCapMeter({ cap, used, remaining, pct, loading, className, compact }: Props) {
  const { t } = useTranslation();
  const exhausted = remaining <= 0 && cap > 0;
  const warn = !exhausted && pct >= 80;

  const tone = exhausted ? "destructive" : warn ? "accent" : "primary";
  const Icon = exhausted ? AlertTriangle : pct < 50 ? CheckCircle2 : Wallet;

  if (compact) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-xl border border-border/60 bg-card/40 px-3 py-2 text-[11px]",
          className,
        )}
        role="status"
        aria-label={t("wallet:dailyCap")}
      >
        <Icon className={cn("h-3.5 w-3.5 shrink-0", `text-${tone}`)} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">{t("wallet:dailyCap")}</span>
            <span className="font-display font-bold tabular-nums">
              {loading ? "—" : `${formatKRW(remaining)} / ${formatKRW(cap)}`}
            </span>
          </div>
          <div className="mt-1 h-1 rounded-full overflow-hidden bg-muted/40">
            <div
              className={cn(
                "h-full transition-all",
                exhausted ? "bg-destructive" : warn ? "bg-accent" : "bg-primary",
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-2xl border border-border/60 bg-card/50 backdrop-blur-sm p-3 space-y-2",
        exhausted && "border-destructive/40",
        className,
      )}
      role="status"
      aria-label={t("wallet:dailyCap")}
    >
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          <Icon className={cn("h-3.5 w-3.5", `text-${tone}`)} />
          <span className="text-muted-foreground">{t("wallet:dailyCap")}</span>
        </div>
        <span className="font-display font-bold tabular-nums">
          {loading ? "—" : `${formatKRW(used)} / ${formatKRW(cap)}`}
        </span>
      </div>
      <div className="h-2 rounded-full overflow-hidden bg-muted/40">
        <div
          className={cn(
            "h-full transition-all duration-500",
            exhausted ? "bg-destructive" : warn ? "bg-accent" : "bg-gradient-to-r from-primary to-accent",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-[11px]">
        <span className={cn("text-muted-foreground", exhausted && "text-destructive font-bold")}>
          {exhausted ? t("wallet:dailyCapReached") : t("wallet:dailyCapRemaining")}
        </span>
        <span className={cn("tabular-nums font-bold", `text-${tone}`)}>
          {loading ? "—" : formatKRW(remaining)}
        </span>
      </div>
    </div>
  );
}
