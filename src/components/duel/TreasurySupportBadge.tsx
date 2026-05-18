// IMPERIAL-SINGULARITY v3.5: rotating Warm King messages (5 types, i18n-ready).
import { pickWarmKingMessage, WARM_KING_MESSAGES, type VolatilityTier } from "@/lib/flywheel";

export function TreasurySupportBadge({ tier }: { tier: VolatilityTier }) {
  const key = pickWarmKingMessage(tier);
  const msg = WARM_KING_MESSAGES[key].ko;
  return (
    <div
      role="status"
      className="rounded-xl border border-amber-400/30 bg-gradient-to-br from-amber-500/15 via-amber-400/5 to-transparent backdrop-blur-xl px-3 py-2 text-[11px] text-amber-100 flex items-center gap-2 shadow-[0_4px_18px_-8px_hsl(38_92%_55%/0.6)]"
    >
      <span className="text-base leading-none">👑</span>
      <span className="font-display">{msg}</span>
    </div>
  );
}

export default TreasurySupportBadge;
