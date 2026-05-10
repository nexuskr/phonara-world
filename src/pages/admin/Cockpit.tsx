import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { useRequireAdmin } from "@/hooks/use-require-auth";
import { LoadingList } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { Link } from "react-router-dom";
import {
  Users, TrendingUp, ShieldCheck, AlertTriangle, Crown,
  ArrowDownToLine, Activity, Zap, Globe, Flame, Snowflake, RefreshCw,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

type Cockpit = {
  generated_at: string;
  users: { total: number; signups_24h: number; signups_7d: number; dau: number; mau: number };
  gmv: { total: number; d30: number; d24h: number };
  payouts: {
    paid_total: number; paid_30d: number;
    pending_count: number; pending_sum: number;
    completed_24h: number;
    sla: { sla_30min_rate_30d?: number; avg_minutes_30d?: number; count_30d?: number } | null;
  };
  risk: { unack_anomalies: number; freezes_active: number; insurance_balance: number };
  growth: { k_factor_30d: number; referrals_30d: number; new_users_30d: number };
  tier_dist: Record<string, number>;
};

function fmt(n: number | undefined | null): string {
  if (n == null) return "—";
  return Number(n).toLocaleString();
}
function fmtKRW(n: number | undefined | null): string {
  if (n == null) return "—";
  return `₩${Number(n).toLocaleString()}`;
}

function Kpi({
  label, value, sub, icon: Icon, accent = "primary",
}: {
  label: string; value: string; sub?: string;
  icon: any; accent?: "primary" | "secondary" | "gold" | "destructive";
}) {
  const tone: Record<string, string> = {
    primary: "text-primary border-primary/30 bg-primary/5",
    secondary: "text-secondary border-secondary/30 bg-secondary/5",
    gold: "text-gold border-gold/30 bg-gold/5",
    destructive: "text-destructive border-destructive/30 bg-destructive/5",
  };
  return (
    <div className={`glass-strong rounded-2xl p-4 border ${tone[accent]}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] tracking-[0.2em] font-black text-muted-foreground uppercase">{label}</span>
        <Icon className={`w-4 h-4 ${tone[accent].split(" ")[0]}`} />
      </div>
      <div className={`font-display font-black text-2xl tabular-nums ${tone[accent].split(" ")[0]}`}>{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}

export default function AdminCockpit() {
  const user = useRequireAdmin();
  const [data, setData] = useState<Cockpit | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    setRefreshing(true);
    try {
      const { data: d, error } = await (supabase as any).rpc("admin_cockpit_metrics");
      if (!error && d) setData(d as Cockpit);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    if (!user?.isAdmin) return;
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, [user?.isAdmin]);

  if (!user) return null;
  if (!user.isAdmin) {
    return (
      <Layout>
        <div className="container py-12">
          <EmptyState icon={ShieldCheck} title="권한 없음" description="관리자 전용 화면입니다." />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="font-display font-black text-2xl sm:text-3xl flex items-center gap-2">
              <Crown className="w-7 h-7 text-gold" /> CEO Cockpit
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              실시간 플랫폼 건강 한눈에 보기 · 60초마다 자동 갱신
              {data?.generated_at && (
                <span className="ml-2">
                  · 최근 {formatDistanceToNow(new Date(data.generated_at), { addSuffix: true, locale: ko })}
                </span>
              )}
            </p>
          </div>
          <button
            onClick={load}
            disabled={refreshing}
            className="glass-strong rounded-xl px-3 py-2 text-xs font-bold border border-border/60 hover:border-primary/60 transition flex items-center gap-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            새로고침
          </button>
        </div>

        {loading || !data ? (
          <LoadingList rows={3} />
        ) : (
          <>
            {/* Row 1 — Users */}
            <section>
              <h2 className="text-[10px] tracking-[0.3em] font-black text-muted-foreground uppercase mb-2">사용자</h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <Kpi icon={Users} label="총 회원" value={fmt(data.users.total)} accent="primary" />
                <Kpi icon={Users} label="MAU 30d" value={fmt(data.users.mau)} sub="고유 활동자" accent="primary" />
                <Kpi icon={Activity} label="DAU 24h" value={fmt(data.users.dau)} accent="secondary" />
                <Kpi icon={TrendingUp} label="신규 24h" value={fmt(data.users.signups_24h)} sub={`7d ${fmt(data.users.signups_7d)}`} accent="secondary" />
                <Kpi icon={Zap} label="K-factor 30d" value={data.growth.k_factor_30d.toFixed(2)} sub={`${fmt(data.growth.referrals_30d)} ref / ${fmt(data.growth.new_users_30d)} new`} accent="gold" />
              </div>
            </section>

            {/* Row 2 — GMV / Payouts */}
            <section>
              <h2 className="text-[10px] tracking-[0.3em] font-black text-muted-foreground uppercase mb-2">매출 / 정산</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Kpi icon={TrendingUp} label="GMV 누적" value={fmtKRW(data.gmv.total)} accent="gold" />
                <Kpi icon={TrendingUp} label="GMV 30d" value={fmtKRW(data.gmv.d30)} sub={`24h ${fmtKRW(data.gmv.d24h)}`} accent="gold" />
                <Kpi icon={ArrowDownToLine} label="누적 출금" value={fmtKRW(data.payouts.paid_total)} sub={`30d ${fmtKRW(data.payouts.paid_30d)}`} accent="secondary" />
                <Kpi
                  icon={ArrowDownToLine}
                  label="대기 출금"
                  value={fmt(data.payouts.pending_count)}
                  sub={fmtKRW(data.payouts.pending_sum)}
                  accent={data.payouts.pending_count > 20 ? "destructive" : "primary"}
                />
              </div>
            </section>

            {/* Row 3 — SLA + Risk */}
            <section>
              <h2 className="text-[10px] tracking-[0.3em] font-black text-muted-foreground uppercase mb-2">SLA / 리스크</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Kpi
                  icon={ShieldCheck}
                  label="출금 30분 SLA"
                  value={data.payouts.sla?.sla_30min_rate_30d != null
                    ? `${Number(data.payouts.sla.sla_30min_rate_30d).toFixed(1)}%`
                    : "—"}
                  sub={data.payouts.sla?.avg_minutes_30d != null
                    ? `평균 ${Number(data.payouts.sla.avg_minutes_30d).toFixed(1)}분 · ${fmt(data.payouts.sla?.count_30d)}건`
                    : undefined}
                  accent="secondary"
                />
                <Kpi
                  icon={AlertTriangle}
                  label="미확인 이상감지"
                  value={fmt(data.risk.unack_anomalies)}
                  accent={data.risk.unack_anomalies > 0 ? "destructive" : "primary"}
                />
                <Kpi
                  icon={Snowflake}
                  label="활성 동결"
                  value={fmt(data.risk.freezes_active)}
                  accent={data.risk.freezes_active > 0 ? "gold" : "primary"}
                />
                <Kpi icon={Flame} label="보험기금" value={fmtKRW(data.risk.insurance_balance)} accent="gold" />
              </div>
            </section>

            {/* Row 4 — Tier Distribution */}
            <section>
              <h2 className="text-[10px] tracking-[0.3em] font-black text-muted-foreground uppercase mb-2">티어 분포</h2>
              <div className="glass-strong rounded-2xl p-4 border border-border/50">
                {Object.keys(data.tier_dist).length === 0 ? (
                  <div className="text-xs text-muted-foreground">데이터 없음</div>
                ) : (
                  <div className="space-y-2">
                    {(() => {
                      const total = Object.values(data.tier_dist).reduce((a, b) => a + b, 0) || 1;
                      const order = ["legend", "diamond", "platinum", "gold", "silver", "bronze"];
                      const entries = Object.entries(data.tier_dist).sort(
                        (a, b) => (order.indexOf(a[0]) === -1 ? 99 : order.indexOf(a[0])) -
                                  (order.indexOf(b[0]) === -1 ? 99 : order.indexOf(b[0]))
                      );
                      return entries.map(([tier, count]) => {
                        const pct = (count / total) * 100;
                        return (
                          <div key={tier} className="flex items-center gap-3">
                            <div className="w-20 text-xs font-bold capitalize">{tier}</div>
                            <div className="flex-1 h-2 rounded-full bg-muted/30 overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-primary to-secondary"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <div className="text-xs tabular-nums w-24 text-right text-muted-foreground">
                              {fmt(count)} <span className="text-[10px]">({pct.toFixed(1)}%)</span>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                )}
              </div>
            </section>

            {/* Quick links */}
            <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { to: "/admin", label: "전체 어드민", icon: Crown },
                { to: "/trust", label: "Trust 리포트", icon: ShieldCheck },
                { to: "/status", label: "Status", icon: Activity },
                { to: "/", label: "랜딩 보기", icon: Globe },
              ].map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  className="glass-strong rounded-2xl px-4 py-3 border border-border/50 hover:border-primary/60 transition flex items-center gap-2 text-sm font-bold"
                >
                  <l.icon className="w-4 h-4 text-primary" />
                  {l.label}
                </Link>
              ))}
            </section>
          </>
        )}
      </div>
    </Layout>
  );
}
