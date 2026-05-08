import { Crown, Zap, Sparkles, Star } from "lucide-react";
import type { Tier } from "@/lib/store";

/** 티어 배지 — 닉네임 옆 항상 노출. VIP 이상은 금테 + 왕관. */
export default function TierBadge({
  tier,
  size = "sm",
  withCrown = true,
}: {
  tier: Tier;
  size?: "xs" | "sm" | "md" | "lg";
  withCrown?: boolean;
}) {
  const conf = TIER_CONF[tier];
  const sizes = {
    xs: "text-[9px] px-1.5 py-0.5",
    sm: "text-[10px] px-2 py-0.5",
    md: "text-xs px-2.5 py-1",
    lg: "text-sm px-3 py-1.5",
  } as const;

  return (
    <span
      className={`relative inline-flex items-center gap-1 rounded-full font-display font-black tracking-wide ${sizes[size]} ${conf.cls}`}
    >
      {withCrown && conf.icon && <conf.icon className="w-3 h-3" />}
      {conf.label}
      {conf.glow && (
        <span className={`absolute -inset-0.5 rounded-full ${conf.glow} -z-10`} />
      )}
    </span>
  );
}

const TIER_CONF: Record<
  Tier,
  { label: string; cls: string; icon?: typeof Crown; glow?: string }
> = {
  NORMAL: {
    label: "NORMAL",
    cls: "bg-muted/60 text-muted-foreground",
  },
  VIP: {
    label: "VIP",
    cls: "bg-primary/20 text-primary border border-primary/40",
    icon: Zap,
  },
  GOD: {
    label: "GOD",
    cls: "bg-accent/25 text-accent border border-accent/50 shadow-lg shadow-accent/30",
    icon: Sparkles,
    glow: "bg-accent/20 blur-md animate-pulse",
  },
  EMPIRE: {
    label: "EMPIRE",
    cls: "bg-gradient-gold text-gold-foreground border border-gold animate-pulse",
    icon: Crown,
    glow: "bg-gold/40 blur-lg animate-ring-pulse",
  },
};

/** 닉네임 + 배지 묶음 — 어디서든 재사용. */
export function NickWithBadge({
  nickname,
  tier,
  size = "sm",
}: {
  nickname: string;
  tier: Tier;
  size?: "xs" | "sm" | "md" | "lg";
}) {
  const isElite = tier === "GOD" || tier === "EMPIRE";
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={`font-bold ${
          tier === "EMPIRE"
            ? "text-gradient-gold"
            : isElite
            ? "text-gradient-imperial"
            : ""
        }`}
      >
        {nickname}
      </span>
      <TierBadge tier={tier} size={size} />
      {tier === "EMPIRE" && <Star className="w-3 h-3 text-gold animate-pulse" />}
    </span>
  );
}
