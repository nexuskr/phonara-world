import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { TrendingUp, Sparkles, Crown } from "lucide-react";
import { formatKRW } from "@/lib/store";

type Pkg = "easy" | "easy150" | "empire";

const RATE: Record<Pkg, number> = {
  easy: 0.015,      // 1.5%/day
  easy150: 0.017,   // 1.7%/day
  empire: 0.025,    // 2.5%/day
};

const STREAK_BONUS_DAYS = 1; // every 7 days +1 extra day's bonus
const EMPIRE_DAY_MULT = 1.5; // Empire Day +50% applied to ~2 days/30
const EMPIRE_DAYS_PER_30 = 2;

function compute(amount: number, pkg: Pkg) {
  const daily = Math.floor(amount * RATE[pkg]);
  const weekly = daily * 7 + (pkg === "empire" ? daily : 0);
  // 30-day: 30 days base + 4 streak bonuses (every 7 days) + empire-day bonus on empire
  const streakBonus = Math.floor(daily * (Math.floor(30 / 7) * STREAK_BONUS_DAYS));
  const empireBonus =
    pkg === "empire" ? Math.floor(daily * EMPIRE_DAYS_PER_30 * (EMPIRE_DAY_MULT - 1)) : 0;
  const thirty = daily * 30 + streakBonus + empireBonus;
  const roi = amount > 0 ? (thirty / amount) * 100 : 0;
  return { daily, weekly, thirty, roi, empireBonus };
}

const STEPS = [100_000, 300_000, 500_000, 1_000_000, 3_000_000, 5_000_000, 10_000_000];

export default function EarningsSimulator() {
  const { t } = useTranslation("guide");
  const [amount, setAmount] = useState(1_000_000);
  const [pkg, setPkg] = useState<Pkg>("empire");

  const r = useMemo(() => compute(amount, pkg), [amount, pkg]);

  return (
    <div className="glass-strong rounded-3xl p-5 mb-4 neon-border relative overflow-hidden">
      <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-gradient-gold blur-3xl opacity-30 pointer-events-none" />
      <div className="relative">
        <h3 className="font-imperial font-black text-lg text-gradient-gold flex items-center gap-2 break-keep">
          <TrendingUp className="w-5 h-5 text-gold" /> {t("simulator.title")}
        </h3>
        <p className="text-[11px] text-muted-foreground mt-1 break-keep">
          {t("simulator.subtitle")}
        </p>

        {/* Amount slider */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-muted-foreground">{t("simulator.amountLabel")}</span>
            <span className="font-display font-black text-base text-money-strong tabular-nums">
              {formatKRW(amount)}
            </span>
          </div>
          <input
            type="range"
            min={STEPS[0]}
            max={STEPS[STEPS.length - 1]}
            step={100_000}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="w-full accent-gold min-h-[44px]"
            aria-label={t("simulator.amountLabel")}
          />
          <div className="grid grid-cols-7 gap-1 mt-1.5">
            {STEPS.map((s) => (
              <button
                key={s}
                onClick={() => setAmount(s)}
                className={`text-[9px] py-1 rounded-md transition tabular-nums ${
                  amount === s ? "bg-gradient-imperial text-primary-foreground font-black" : "glass text-muted-foreground"
                }`}
                aria-label={`${formatKRW(s)}`}
              >
                {s >= 1_000_000 ? `${s / 1_000_000}M` : `${s / 10_000}만`}
              </button>
            ))}
          </div>
        </div>

        {/* Package picker */}
        <div className="mt-4">
          <div className="text-xs text-muted-foreground mb-1.5">{t("simulator.packageLabel")}</div>
          <div className="grid grid-cols-3 gap-1.5">
            {(["easy", "easy150", "empire"] as Pkg[]).map((p) => (
              <button
                key={p}
                onClick={() => setPkg(p)}
                className={`min-h-[56px] px-2 py-2 rounded-xl text-[10px] font-bold break-keep transition ${
                  pkg === p
                    ? p === "empire"
                      ? "bg-gradient-gold text-gold-foreground glow-gold"
                      : "bg-gradient-primary text-primary-foreground glow-primary"
                    : "glass text-muted-foreground"
                }`}
              >
                {p === "empire" && <Crown className="w-3 h-3 mx-auto mb-0.5" />}
                {t(`simulator.${p}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Result */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Stat label={t("simulator.daily")} value={`+${formatKRW(r.daily)}`} />
          <Stat label={t("simulator.weekly")} value={`+${formatKRW(r.weekly)}`} />
          <Stat
            label={t("simulator.thirtyDay")}
            value={`+${formatKRW(r.thirty)}`}
            big
          />
          <Stat label={t("simulator.roi")} value={`${r.roi.toFixed(1)}%`} big highlight />
        </div>

        {pkg === "empire" && r.empireBonus > 0 && (
          <div className="mt-2 text-[10px] text-gold flex items-center gap-1 break-keep">
            <Sparkles className="w-3 h-3" /> {t("simulator.empireDayBonus")} · +{formatKRW(r.empireBonus)}
          </div>
        )}

        <Link
          to={`/packages?pkg=${pkg}`}
          className="press mt-4 w-full min-h-[56px] rounded-xl bg-gradient-imperial text-primary-foreground font-display font-black flex items-center justify-center gap-2 glow-imperial"
        >
          <Sparkles className="w-4 h-4" /> {t("simulator.ctaPay")}
        </Link>

        <p className="mt-2 text-[10px] text-muted-foreground text-center break-keep">
          {t("simulator.disclaimer")}
        </p>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  big = false,
  highlight = false,
}: {
  label: string;
  value: string;
  big?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className={`glass rounded-xl p-3 ${big ? "" : ""}`}>
      <div className="text-[10px] text-muted-foreground break-keep">{label}</div>
      <div
        className={`font-display font-black tabular-nums mt-0.5 ${
          big ? "text-base" : "text-sm"
        } ${highlight ? "text-gradient-gold" : "text-money-strong"}`}
      >
        {value}
      </div>
    </div>
  );
}
