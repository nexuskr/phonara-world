/**
 * ProvablyFairBadge — "황제의 공정한 승전보".
 * Bet Slip / History 헤더에 사용. /fairness 로 이동.
 */
import { Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { IMPERIAL_BET_COPY } from "./imperialCopy";

interface Props {
  size?: "sm" | "md";
  className?: string;
}

export default function ProvablyFairBadge({ size = "sm", className = "" }: Props) {
  const dims =
    size === "md"
      ? "px-3 py-1.5 text-[11px]"
      : "px-2 py-1 text-[10px]";
  return (
    <Link
      to="/fairness"
      aria-label={IMPERIAL_BET_COPY.fairnessBadge}
      className={`inline-flex items-center gap-1 rounded-full border border-emerald-400/40 bg-gradient-to-r from-emerald-500/15 to-amber-400/15 text-emerald-200 font-black tracking-wide press hover:border-emerald-300/70 transition ${dims} ${className}`}
    >
      <ShieldCheck className="w-3 h-3" />
      {size === "md" ? IMPERIAL_BET_COPY.fairnessBadge : IMPERIAL_BET_COPY.fairnessShort}
    </Link>
  );
}
