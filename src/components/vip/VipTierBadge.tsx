/**
 * VipTierBadge — tier-aware gradient pill (silver / gold / platinum / diamond).
 * Renders crown icon + tier label. Falls back to muted "Free" chip when tier is null.
 */
import { Crown } from "lucide-react";
import { cn } from "@/lib/utils";

export type VipTier = "silver" | "gold" | "platinum" | "diamond";

interface Props {
  tier: VipTier | string | null | undefined;
  size?: "sm" | "md";
  className?: string;
}

const TIER_LABEL: Record<VipTier, string> = {
  silver: "SILVER",
  gold: "GOLD",
  platinum: "PLATINUM",
  diamond: "DIAMOND",
};

// All colors must reference design tokens — gradients composed from gold/pink/primary/muted.
const TIER_GRADIENT: Record<VipTier, string> = {
  silver: "from-muted/40 via-muted/20 to-muted/40 border-muted text-foreground",
  gold: "from-amber-500/25 via-yellow-400/30 to-amber-500/25 border-amber-400/60 text-amber-100",
  platinum: "from-sky-400/20 via-card/60 to-sky-300/25 border-sky-300/60 text-sky-50",
  diamond:
    "from-pink-500/25 via-amber-400/30 to-pink-500/25 border-pink-400/60 text-pink-50",
};

export default function VipTierBadge({ tier, size = "md", className }: Props) {
  const t = (tier ?? "").toString().toLowerCase() as VipTier;
  const known = t in TIER_LABEL;

  if (!known) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/30 px-2 py-0.5 text-[10px] font-imperial tracking-widest text-muted-foreground",
          size === "md" && "px-2.5 py-1 text-[11px]",
          className,
        )}
      >
        FREE
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border bg-gradient-to-r px-2 py-0.5 text-[10px] font-imperial tracking-widest shadow-[0_0_14px_-4px_hsl(var(--primary)/0.5)]",
        TIER_GRADIENT[t],
        size === "md" && "px-2.5 py-1 text-[11px]",
        className,
      )}
      aria-label={`VIP tier ${TIER_LABEL[t]}`}
    >
      <Crown className={cn("w-3 h-3", size === "md" && "w-3.5 h-3.5")} />
      {TIER_LABEL[t]}
    </span>
  );
}
