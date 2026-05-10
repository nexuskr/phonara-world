import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { Clock, ShieldCheck, ArrowRight } from "lucide-react";

type Sla = {
  count_30d: number;
  avg_minutes_30d: number;
  sla_30min_rate_30d: number;
  sla_30min_rate_7d: number;
  count_7d: number;
} | null;

/**
 * Conversion-grade public proof: shows the live 30-day withdrawal SLA pulled
 * from `public_withdrawal_sla()`. Linked to /trust for full transparency.
 */
export default function LivePayoutSlaBadge() {
  const { t, i18n } = useTranslation("landing");
  const lng = i18n.language?.startsWith("en") ? "en" : "ko";
  const [sla, setSla] = useState<Sla>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await (supabase as any).rpc("public_withdrawal_sla");
        if (alive && data) setSla(data as Sla);
      } catch {}
      if (alive) setLoaded(true);
    })();
    return () => { alive = false; };
  }, []);

  // Hide entirely until loaded so the page doesn't flash placeholder zeros.
  if (!loaded || !sla || (sla.count_30d ?? 0) === 0) return null;

  const rate = Number(sla.sla_30min_rate_30d ?? 0);
  const avg = Number(sla.avg_minutes_30d ?? 0);
  const count = Number(sla.count_30d ?? 0);
  const rateStr = `${rate.toFixed(rate >= 99 ? 2 : 1)}%`;
  const isExcellent = rate >= 99;

  const labels = lng === "en"
    ? {
        title: "Live 30-min payout SLA",
        sub: `${count.toLocaleString()} payouts settled in 30d · avg ${avg.toFixed(1)} min`,
        cta: "View full trust report",
      }
    : {
        title: "30분 출금 SLA 달성률",
        sub: `최근 30일 ${count.toLocaleString()}건 처리 · 평균 ${avg.toFixed(1)}분`,
        cta: "전체 신뢰 리포트 보기",
      };

  return (
    <Link
      to="/trust"
      className="block mt-4 group"
      onMouseEnter={() => import("@/lib/trustPrefetch").then((m) => m.prefetchTrust(30))}
    >
      <div
        className={`glass-strong rounded-2xl px-4 py-3 border ${
          isExcellent ? "border-secondary/40" : "border-gold/40"
        } flex items-center gap-3 hover:border-primary/60 transition`}
      >
        <div className={`p-2 rounded-xl ${isExcellent ? "bg-secondary/15 text-secondary" : "bg-gold/15 text-gold"}`}>
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] tracking-[0.2em] font-black text-muted-foreground uppercase">
              {labels.title}
            </span>
            <span
              className={`font-display font-black text-lg tabular-nums ${
                isExcellent ? "text-secondary" : "text-gold"
              }`}
            >
              {rateStr}
            </span>
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1 break-keep">
            <Clock className="w-3 h-3" /> {labels.sub}
          </div>
        </div>
        <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition shrink-0" />
      </div>
    </Link>
  );
}
