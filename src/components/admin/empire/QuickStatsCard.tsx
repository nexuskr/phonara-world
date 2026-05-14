/**
 * Quick Stats — 입금/베팅량/전환율 요약.
 * 기존 RPC 재사용: admin_get_monthly_revenue_progress + admin_get_sim_real_conversion(7d).
 * 60s 폴링, count-up. 차트 없이 숫자 + 미니 sparkline(CSS bar) 만으로 가볍게.
 */
import { useEffect, useState } from "react";
import { ArrowUpRight, Coins, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCountUp } from "@/hooks/use-count-up";

type Row = {
  deposits_krw: number;
  bet_volume: number;
  conversion_pct: number;
};

const fmt = (n: number) => new Intl.NumberFormat("ko-KR").format(Math.round(n));

export function QuickStatsCard() {
  const [d, setD] = useState<Row | null>(null);

  useEffect(() => {
    let on = true;
    const load = async () => {
      const [rev, conv] = await Promise.all([
        supabase.rpc("admin_get_monthly_revenue_progress" as any),
        supabase.rpc("admin_get_sim_real_conversion" as any, { _days: 7 }),
      ]);
      if (!on) return;
      const total = (rev.data as any)?.total_krw ?? 0;
      const c = (conv.data as any) ?? {};
      setD({
        deposits_krw: total,
        bet_volume: c.real_volume ?? 0,
        conversion_pct: c.conversion_pct ?? 0,
      });
    };
    load();
    const id = setInterval(load, 60_000);
    return () => { on = false; clearInterval(id); };
  }, []);

  const dep = useCountUp(d?.deposits_krw ?? 0);
  const bet = useCountUp(d?.bet_volume ?? 0);
  const conv = useCountUp(d?.conversion_pct ?? 0);

  return (
    <div className="glass-strong rounded-2xl p-4 border border-border/40 h-full">
      <div className="text-[11px] uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
        <Activity className="h-3.5 w-3.5 text-primary" /> Quick Stats
      </div>
      <div className="mt-3 space-y-3">
        <Row icon={<Coins className="h-3.5 w-3.5" />} label="이번 달 입금" value={`₩ ${fmt(dep)}`} />
        <Row icon={<ArrowUpRight className="h-3.5 w-3.5" />} label="실거래 베팅 (7d)" value={fmt(bet)} />
        <Row
          icon={<ArrowUpRight className="h-3.5 w-3.5 rotate-180" />}
          label="SIM → Real 전환율"
          value={`${conv.toFixed(2)}%`}
          accent
        />
      </div>
    </div>
  );
}

function Row({
  icon, label, value, accent,
}: { icon: React.ReactNode; label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        {icon} {label}
      </div>
      <div
        className={`font-display font-black tabular-nums ${
          accent
            ? "bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent"
            : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}
