import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { FairnessVerifier } from "./FairnessVerifier";

export interface ProvablyFairBadgeProps {
  /** Server commit hash (sha256 of seed). */
  commitHash?: string | null;
  /** Revealed seed (after round). */
  revealSeed?: string | null;
  /** Nonce / round index. */
  nonce?: number | null;
  className?: string;
}

/**
 * Phase 2 — ProvablyFairBadge.
 * Click opens FairnessVerifier modal with prefilled seed/hash/nonce.
 * Pulsing dot while committed-but-not-revealed.
 */
export function ProvablyFairBadge({
  commitHash,
  revealSeed,
  nonce,
  className,
}: ProvablyFairBadgeProps) {
  const [open, setOpen] = useState(false);
  const committedNotRevealed = !!commitHash && !revealSeed;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
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
        {committedNotRevealed && (
          <span
            className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-primary motion-safe:animate-pulse"
            aria-hidden
          />
        )}
      </button>

      <FairnessVerifier
        open={open}
        onOpenChange={setOpen}
        defaultSeed={revealSeed ?? ""}
        defaultHash={commitHash ?? ""}
        defaultNonce={nonce ?? 0}
      />
    </>
  );
}
