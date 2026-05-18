import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, ArrowDownToLine, Package as PackageIcon, Coins } from "lucide-react";
import { LoadingKpiGrid } from "@/components/ui/loading-state";
import { setVisibleInterval } from "@/lib/util/visible-interval";

type Snap = {
  deposits_today: number;
  withdrawals_today: number;
  packages_today: number;
  net_today: number;
  pending_deposits: number;
  pending_withdrawals: number;
};

function formatKRW(n: number) {
  return "₩" + Math.round(n).toLocaleString("ko-KR");
}

export default function TodayKpiCards() {
  const [s, setS] = useState<Snap | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const iso = today.toISOString();
    const [dep, wd, pk, pdep, pwd] = await Promise.all([
      supabase.from("deposit_requests").select("amount", { head: false }).eq("status", "approved").gte("approved_at", iso),
      supabase.from("withdrawal_requests").select("amount", { head: false }).eq("status", "completed").gte("completed_at", iso),
      supabase.from("package_purchases").select("amount", { head: false }).eq("status", "approved").gte("approved_at", iso),
      supabase.from("deposit_requests").select("id", { head: true, count: "exact" }).eq("status", "pending"),
      supabase.from("withdrawal_requests").select("id", { head: true, count: "exact" }).eq("status", "pending"),
    ]);
    const sum = (rows: any) => Array.isArray(rows?.data) ? rows.data.reduce((a: number, r: any) => a + Number(r.amount || 0), 0) : 0;
    const deposits = sum(dep);
    const withdrawals = sum(wd);
    const packages = sum(pk);
    setS({
      deposits_today: deposits,
      withdrawals_today: withdrawals,
      packages_today: packages,
      net_today: deposits + packages - withdrawals,
      pending_deposits: pdep.count ?? 0,
      pending_withdrawals: pwd.count ?? 0,
    });
    setLoading(false);
  }

  useEffect(() => {
    void load();
    return setVisibleInterval(load, 30_000);
  }, []);

  if (loading || !s) {
    return <LoadingKpiGrid count={4} />;
  }

  const cards = [
    { icon: TrendingUp, label: "오늘 충전 승인", v: formatKRW(s.deposits_today), tone: "secondary" },
    { icon: PackageIcon, label: "오늘 패키지 매출", v: formatKRW(s.packages_today), tone: "primary" },
    { icon: ArrowDownToLine, label: "오늘 출금 지급", v: formatKRW(s.withdrawals_today), tone: "destructive" },
    { icon: Coins, label: "순 변동(충전+패키지-출금)", v: formatKRW(s.net_today), tone: s.net_today >= 0 ? "secondary" : "destructive" },
  ];

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div className="text-[10px] tracking-[0.25em] text-primary font-black uppercase">오늘 트레저리 스냅샷</div>
        <div className="text-[9px] text-muted-foreground">· 30초마다 자동 갱신</div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-3">
        {cards.map((c, i) => (
          <div key={i} className="glass-strong rounded-2xl p-3 border border-border/40">
            <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground mb-1.5">
              <c.icon className="w-3 h-3" />
              <span className="break-keep">{c.label}</span>
            </div>
            <div className={`font-display font-black text-base sm:text-lg tabular-nums ${
              c.tone === "destructive" ? "text-destructive"
              : c.tone === "secondary" ? "text-secondary"
              : "text-primary"
            }`}>{c.v}</div>
          </div>
        ))}
      </div>
      {(s.pending_deposits > 0 || s.pending_withdrawals > 0) && (
        <div className="rounded-xl border border-warning/40 bg-warning/10 px-3 py-2 text-[11px] flex items-center gap-3 mb-3">
          <span className="text-warning font-black">⏳ 검수 대기</span>
          <span>충전 <b className="tabular-nums">{s.pending_deposits}</b>건</span>
          <span>·</span>
          <span>출금 <b className="tabular-nums">{s.pending_withdrawals}</b>건</span>
        </div>
      )}
    </div>
  );
}
