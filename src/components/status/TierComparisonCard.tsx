import { Link } from "react-router-dom";
import { TrendingUp, ChevronRight } from "lucide-react";
import { useDB, formatKRW } from "@/lib/store";
import TierBadge from "./TierBadge";

const TIER_AVG_DAILY: Record<string, number> = {
  NORMAL: 1_200,
  VIP: 14_000,
  GOD: 47_000,
  EMPIRE: 280_000,
};

/** "FREE 평균 ₩X / VIP ₩XX / 당신은 ₩X" 비교 카드. */
export default function TierComparisonCard() {
  const [db] = useDB();
  if (!db.user) return null;
  const u = db.user;
  const myDaily = u.todayEarnings;
  const myTier = u.tier;

  const tiers: Array<{ tier: keyof typeof TIER_AVG_DAILY; label: string }> = [
    { tier: "NORMAL", label: "FREE" },
    { tier: "VIP", label: "VIP" },
    { tier: "GOD", label: "GOD" },
    { tier: "EMPIRE", label: "EMPIRE" },
  ];

  const max = Math.max(...Object.values(TIER_AVG_DAILY));

  return (
    <Link to="/packages" className="block press">
      <div className="glass-strong rounded-2xl p-4 neon-border relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-gradient-gold blur-3xl opacity-30" />
        <div className="relative">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-gold" />
              <span className="font-display font-bold text-sm">등급별 평균 일수익</span>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>

          <div className="space-y-2">
            {tiers.map((t) => {
              const avg = TIER_AVG_DAILY[t.tier];
              const w = Math.max(8, (avg / max) * 100);
              const isMine = t.tier === myTier;
              return (
                <div key={t.tier} className="flex items-center gap-2">
                  <div className="w-16 shrink-0">
                    <TierBadge tier={t.tier} size="xs" />
                  </div>
                  <div className="flex-1 h-5 bg-muted/40 rounded-full overflow-hidden relative">
                    <div
                      className={`h-full ${
                        t.tier === "EMPIRE"
                          ? "bg-gradient-gold"
                          : t.tier === "GOD"
                          ? "bg-accent"
                          : t.tier === "VIP"
                          ? "bg-gradient-primary"
                          : "bg-muted-foreground/40"
                      }`}
                      style={{ width: `${w}%` }}
                    />
                    {isMine && (
                      <span className="absolute inset-0 flex items-center justify-center text-[9px] font-black text-foreground">
                        ← 내 등급
                      </span>
                    )}
                  </div>
                  <div className="w-20 text-right text-[10px] font-bold tabular-nums shrink-0">
                    {formatKRW(avg)}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-3 glass rounded-xl p-2.5 flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">오늘 내 적립</span>
            <span className="font-display font-black text-sm text-gradient-gold tabular-nums">
              {formatKRW(myDaily)}
            </span>
          </div>
          <div className="mt-2 text-center text-[10px] text-primary font-bold">
            업그레이드 → 즉시 N배 상승 →
          </div>
        </div>
      </div>
    </Link>
  );
}
