// IMPERIAL-SINGULARITY v3.5: 5-tier volatility gauge for RealBetSlip header.
import { TIER_LABEL_KO, VolatilityTier } from "@/lib/flywheel";

const ORDER: VolatilityTier[] = ["calm", "warm", "hot", "surge", "extreme"];
const COLORS: Record<VolatilityTier, string> = {
  calm:    "from-emerald-500/40 to-emerald-300/30",
  warm:    "from-amber-400/40 to-amber-200/30",
  hot:     "from-orange-500/50 to-amber-400/30",
  surge:   "from-rose-500/60 to-orange-400/30",
  extreme: "from-fuchsia-600/70 to-rose-500/40",
};

export function VolatilityGauge({ tier }: { tier: VolatilityTier }) {
  const activeIdx = ORDER.indexOf(tier);
  return (
    <div className="rounded-xl border border-amber-400/20 bg-gradient-to-br from-amber-950/40 to-amber-900/10 backdrop-blur-xl p-3 space-y-2">
      <div className="flex justify-between items-baseline">
        <span className="text-[10px] uppercase tracking-widest text-amber-200/80">시장 변동성</span>
        <span className="text-xs font-display font-bold text-amber-100">{TIER_LABEL_KO[tier]}</span>
      </div>
      <div className="flex gap-1">
        {ORDER.map((t, i) => (
          <div
            key={t}
            className={[
              "h-1.5 flex-1 rounded-full transition-all duration-500 bg-gradient-to-r",
              i <= activeIdx ? COLORS[t] : "from-muted/30 to-muted/20",
              i === activeIdx ? "shadow-[0_0_8px_-1px_hsl(38_92%_55%/0.55)]" : "",
            ].join(" ")}
          />
        ))}
      </div>
    </div>
  );
}

export default VolatilityGauge;
