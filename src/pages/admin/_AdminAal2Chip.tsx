import { useMfaLevel } from "@/hooks/use-mfa-level";
import { ShieldCheck, ShieldAlert, KeyRound } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

/**
 * Compact AAL2 status chip for the admin header.
 * Green = AAL2 active, Amber = AAL1 (TOTP enrolled), Red = no factor.
 */
export default function AdminAal2Chip() {
  const { loading, isAal2, hasFactor } = useMfaLevel();
  if (loading) return null;

  if (isAal2) {
    return (
      <span
        className="hidden sm:inline-flex items-center gap-1.5 h-9 px-2.5 rounded-lg border border-accent/40 bg-accent/10 text-accent text-[10px] font-black tracking-[0.18em]"
        title="AAL2 active"
      >
        <ShieldCheck className="w-3.5 h-3.5" />
        AAL2
      </span>
    );
  }

  if (hasFactor) {
    return (
      <span
        className="hidden sm:inline-flex items-center gap-1.5 h-9 px-2.5 rounded-lg border border-gold/50 bg-gold/10 text-gold text-[10px] font-black tracking-[0.18em]"
        title="Step-up required for sensitive tabs"
      >
        <KeyRound className="w-3.5 h-3.5" />
        AAL1
      </span>
    );
  }

  return (
    <Link
      to="/security/totp"
      className={cn(
        "inline-flex items-center gap-1.5 h-9 px-2.5 rounded-lg border text-[10px] font-black tracking-[0.18em]",
        "border-destructive/60 bg-destructive/10 text-destructive hover:bg-destructive/20",
      )}
      title="TOTP not registered — required for sensitive admin tabs"
    >
      <ShieldAlert className="w-3.5 h-3.5" />
      NO TOTP
    </Link>
  );
}
