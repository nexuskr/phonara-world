/**
 * FloatingFab — unified Warm King FAB primitive.
 *
 * Same gradient/ring/shadow/active-scale tokens as LobbyFab so every
 * floating call-to-action across the app looks like one family.
 * Use inside a <FloatingSlot/> from `@/components/ui/floating-dock`.
 */
import * as React from "react";
import { Link } from "react-router-dom";
import { haptics } from "@/lib/haptics";
import { cn } from "@/lib/utils";

type CommonProps = {
  icon?: React.ReactNode;
  label: string;
  ariaLabel?: string;
  pulse?: boolean;
  /** Variant — gold (Warm King) is default. */
  variant?: "gold" | "ember" | "ghost";
  className?: string;
};

const VARIANT_CLS: Record<NonNullable<CommonProps["variant"]>, string> = {
  gold:
    "bg-gradient-to-r from-amber-500 via-orange-500 to-pink-500 text-black ring-amber-300/60 shadow-amber-500/40",
  ember:
    "bg-gradient-to-r from-rose-500 via-pink-500 to-fuchsia-500 text-white ring-rose-300/60 shadow-rose-500/40",
  ghost:
    "bg-card/80 backdrop-blur text-foreground ring-border/60 shadow-black/40",
};

function FabInner({
  icon,
  label,
  pulse,
  variant = "gold",
  className,
}: CommonProps) {
  return (
    <span
      className={cn(
        "group flex items-center gap-2 rounded-full pl-2 pr-3.5 py-2 font-bold text-xs",
        "shadow-xl ring-1 active:scale-95 transition-transform duration-150",
        "select-none whitespace-nowrap",
        VARIANT_CLS[variant],
        className,
      )}
    >
      <span
        className={cn(
          "grid place-items-center w-7 h-7 rounded-full bg-black/30 text-base",
          pulse && "animate-pulse",
        )}
      >
        {icon ?? "👑"}
      </span>
      <span className="tracking-wide">{label}</span>
    </span>
  );
}

export function FloatingFabLink({
  to,
  onClick,
  ...rest
}: CommonProps & { to: string; onClick?: () => void }) {
  return (
    <Link
      to={to}
      aria-label={rest.ariaLabel ?? rest.label}
      onClick={() => {
        haptics.select();
        onClick?.();
      }}
    >
      <FabInner {...rest} />
    </Link>
  );
}

export function FloatingFabButton({
  onClick,
  ...rest
}: CommonProps & { onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={rest.ariaLabel ?? rest.label}
      onClick={() => {
        haptics.select();
        onClick();
      }}
    >
      <FabInner {...rest} />
    </button>
  );
}

export default FloatingFabLink;
