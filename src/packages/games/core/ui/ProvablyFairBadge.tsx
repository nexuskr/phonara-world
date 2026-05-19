import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export interface ProvablyFairBadgeProps {
  /** Server commit hash (sha256 of seed). */
  commitHash?: string | null;
  /** Revealed seed (after round). */
  revealSeed?: string | null;
  /** Nonce / round index. */
  nonce?: number | null;
  className?: string;
  /** Optional client-side verify callback (Phase 2 wires `pf_verify`). */
  onVerify?: () => Promise<boolean> | boolean;
}

/**
 * P1-07 ProvablyFairBadge — chip + verify dialog.
 * Phase 2 will wire `pf_commit` / `pf_reveal` / `pf_verify` RPCs.
 */
export function ProvablyFairBadge({
  commitHash,
  revealSeed,
  nonce,
  className,
  onVerify,
}: ProvablyFairBadgeProps) {
  const [status, setStatus] = useState<"idle" | "ok" | "fail">("idle");
  const handle = async () => {
    if (!onVerify) return;
    const ok = await onVerify();
    setStatus(ok ? "ok" : "fail");
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border border-border/60",
            "bg-card/60 px-2.5 py-1 text-xs font-semibold backdrop-blur",
            "hover:border-primary/60 transition-colors",
            "text-gradient-gold",
            className,
          )}
          aria-label="Provably Fair 검증"
        >
          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
          PF v2
        </button>
      </DialogTrigger>
      <DialogContent className="imperial-card max-w-md">
        <DialogHeader>
          <DialogTitle className="text-gradient-gold">Provably Fair v2</DialogTitle>
        </DialogHeader>
        <dl className="space-y-2 text-xs">
          <Row k="Commit" v={commitHash ?? "—"} />
          <Row k="Reveal" v={revealSeed ?? "(라운드 진행 중)"} />
          <Row k="Nonce" v={String(nonce ?? "—")} />
          <Row
            k="검증"
            v={status === "idle" ? "검증 대기" : status === "ok" ? "✓ 일치" : "✗ 불일치"}
          />
        </dl>
        {onVerify && (
          <button
            type="button"
            onClick={handle}
            className="mt-3 inline-flex h-9 items-center justify-center rounded-md gradient-gold px-4 text-sm font-semibold text-background"
          >
            지금 검증
          </button>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="break-all text-right font-mono text-foreground/90">{v}</dd>
    </div>
  );
}
