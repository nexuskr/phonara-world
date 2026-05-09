import { useTranslation } from "react-i18next";
import { CheckCircle2, AlertTriangle, Ban, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatKRW } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { ClaimOutcome } from "@/lib/claim-result";

export interface ClaimResultModalProps {
  open: boolean;
  onClose: () => void;
  outcome: ClaimOutcome;
  expected: number;
  actual: number;
  capRemaining: number;
  pnlPct?: number | null;
  onShare?: () => void;
  /** Whether share has already happened (or is unavailable). */
  shared?: boolean;
  botKindLabel?: string;
}

const TONE: Record<ClaimOutcome, { icon: typeof CheckCircle2; class: string; bg: string; }> = {
  success:     { icon: CheckCircle2,  class: "text-primary",      bg: "bg-primary/10" },
  partial:     { icon: AlertTriangle, class: "text-accent",       bg: "bg-accent/10" },
  cap_reached: { icon: Ban,           class: "text-destructive",  bg: "bg-destructive/10" },
};

export default function ClaimResultModal({
  open, onClose, outcome, expected, actual, capRemaining, pnlPct,
  onShare, shared, botKindLabel,
}: ClaimResultModalProps) {
  const { t } = useTranslation("aibot");
  const { t: tc } = useTranslation();
  const tone = TONE[outcome];
  const Icon = tone.icon;
  const statusKey = outcome === "success" ? "result.statusSuccess"
    : outcome === "partial" ? "result.statusPartial"
    : "result.statusCap";

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm border-border/60 bg-card/95 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <span className={cn("h-9 w-9 rounded-2xl flex items-center justify-center", tone.bg)}>
              <Icon className={cn("h-5 w-5", tone.class)} />
            </span>
            <div className="flex flex-col">
              <span>{t("result.title")}</span>
              {botKindLabel && <span className="text-[11px] font-normal text-muted-foreground">{botKindLabel}</span>}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <div className={cn("rounded-xl border border-border/60 px-3 py-2 text-xs flex items-center justify-between", tone.bg)}>
            <span className={cn("font-bold", tone.class)}>{t(statusKey)}</span>
            {pnlPct != null && (
              <span className="font-display tabular-nums text-foreground">
                {(pnlPct >= 0 ? "+" : "") + pnlPct.toFixed(2)}%
              </span>
            )}
          </div>

          <dl className="space-y-2 text-xs">
            <Row label={t("result.expected")} value={formatKRW(expected)} muted />
            <Row
              label={t("result.actual")}
              value={formatKRW(actual)}
              valueClass={cn("text-base font-display font-black", actual > 0 ? "text-gradient-gold" : "text-muted-foreground")}
            />
            <Row
              label={t("result.capRemaining")}
              value={formatKRW(capRemaining)}
              valueClass={capRemaining <= 0 ? "text-destructive font-bold" : ""}
            />
          </dl>

          {outcome !== "success" && (
            <p className="rounded-lg bg-muted/30 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
              {outcome === "cap_reached"
                ? t("result.zeroNote")
                : t("partialClaimDesc", { actual: formatKRW(actual), expected: formatKRW(expected) })}
            </p>
          )}
        </div>

        <DialogFooter className="gap-2">
          {onShare && actual > 0 && !shared && (
            <Button variant="secondary" size="sm" onClick={onShare} className="gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              {t("result.share")}
            </Button>
          )}
          <Button size="sm" onClick={onClose}>{t("result.close")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value, valueClass, muted }: { label: string; value: string; valueClass?: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <dt className={cn("text-muted-foreground", muted && "text-muted-foreground/70")}>{label}</dt>
      <dd className={cn("tabular-nums font-bold", valueClass)}>{value}</dd>
    </div>
  );
}
