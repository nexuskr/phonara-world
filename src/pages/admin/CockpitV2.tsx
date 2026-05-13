import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdminPending } from "@/hooks/use-admin-pending";
import { useRequireAdmin } from "@/hooks/use-require-auth";
import { LoadingList } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import TodayKpiCards from "@/components/admin/TodayKpiCards";
import {
  ArrowDownToLine, ArrowUpFromLine, AlertTriangle, HeartHandshake,
  ShieldAlert, ChevronRight, Flame, Activity, Snowflake, RefreshCw, Crown,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

type ActionTone = "destructive" | "gold" | "primary" | "secondary";

function ActionTile({
  icon: Icon, label, count, hint, to, tone = "primary", sla, threshold,
}: {
  icon: any; label: string; count: number; hint?: string; to: string;
  tone?: ActionTone; sla?: string; threshold?: number;
}) {
  const hot = count > 0;
  const exceeds = threshold != null && count >= threshold;
  const toneClass: Record<ActionTone, string> = {
    destructive: "border-destructive/50 bg-destructive/5 text-destructive",
    gold:        "border-gold/50 bg-gold/5 text-gold",
    primary:     "border-primary/40 bg-primary/5 text-primary",
    secondary:   "border-secondary/40 bg-secondary/5 text-secondary",
  };
  const cls = exceeds
    ? "border-destructive bg-destructive/10 text-destructive animate-pulse"
    : hot
      ? toneClass[tone]
      : "border-border/40 bg-card/40 text-muted-foreground";
  return (
    <Link
      to={to}
      className={`group glass-strong rounded-2xl p-4 border transition hover:scale-[1.01] ${cls}`}
    >
      <div className="flex items-center justify-between mb-3">
        <Icon className="w-5 h-5" />
        <ChevronRight className="w-4 h-4 opacity-50 group-hover:translate-x-0.5 transition-transform" />
      </div>
      <div className="text-[10px] tracking-[0.2em] font-black uppercase">{label}</div>
      <div className="font-display font-black text-3xl tabular-nums mt-1">
        {count.toLocaleString()}
      </div>
      <div className="flex items-center justify-between mt-1">
        <div className="text-[10px] text-muted-foreground">{hint ?? ""}</div>
        {(sla || threshold != null) && (
          <div className="text-[10px] font-bold tabular-nums opacity-80">
            {exceeds ? "임계초과" : sla ? `SLA ${sla}` : `≥${threshold}`}
          </div>
        )}
      </div>
    </Link>
  );
}

type RiskWd = {
  id: string;
  user_id: string;
  amount: number;
  created_at: string;
  status: string;
  risk_score?: number | null;
};

type Anom = {
  id: string;
  rule: string;
  severity: string;
  user_id: string | null;
  created_at: string;
  payload?: any;
};

function severityBadge(sev: string) {
  const m: Record<string, string> = {
    critical: "bg-destructive/15 text-destructive border-destructive/40",
    high:     "bg-destructive/10 text-destructive border-destructive/30",
    warn:     "bg-gold/10 text-gold border-gold/40",
    warning:  "bg-gold/10 text-gold border-gold/40",
    info:     "bg-muted/30 text-muted-foreground border-border/40",
  };
  return m[sev?.toLowerCase()] ?? m.info;
}

function ago(iso: string) {
  try { return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: ko }); }
  catch { return ""; }
}

export default function AdminCockpitV2() {
  const user = useRequireAdmin();
  const pending = useAdminPending(!!user?.isAdmin);

  const [risks, setRisks] = useState<RiskWd[]>([]);
  const [anoms, setAnoms] = useState<Anom[]>([]);
  const [freezes, setFreezes] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);
  const [thresholds, setThresholds] = useState<Record<string, number>>({
    deposits_hot: 5, withdrawals_hot: 3, aml_hot: 1, refund_hot: 2, anomaly_hot: 5,
  });
  const [sla, setSla] = useState<any>(null);
  const [slaTargets, setSlaTargets] = useState<Record<string, number>>({
    withdrawal_minutes: 30, deposit_minutes: 15, aml_minutes: 60,
  });

  useEffect(() => {
    if (!user?.isAdmin) return;
    (async () => {
      const [t, s] = await Promise.all([
        (supabase as any).rpc("admin_settings_get", { _key: "cockpit.thresholds" }),
        (supabase as any).rpc("admin_settings_get", { _key: "cockpit.sla" }),
      ]);
      if (t.data && typeof t.data === "object") {
        setThresholds((prev) => ({ ...prev, ...(t.data as Record<string, number>) }));
      }
      if (s.data && typeof s.data === "object") {
        setSlaTargets((prev) => ({ ...prev, ...(s.data as Record<string, number>) }));
      }
    })();
  }, [user?.isAdmin]);

  async function load() {
    const [wd, an, fz, slaRes] = await Promise.all([
      supabase
        .from("withdrawal_requests")
        .select("id, user_id, amount, created_at, status")
        .eq("status", "pending")
        .order("amount", { ascending: false })
        .limit(8),
      (supabase as any)
        .from("anomaly_events")
        .select("id, rule, severity, user_id, created_at, payload")
        .is("acknowledged_at", null)
        .order("created_at", { ascending: false })
        .limit(8)
        .then((r: any) => r, () => ({ data: [] })),
      (supabase as any)
        .from("account_freezes")
        .select("id", { count: "exact", head: true })
        .is("released_at", null)
        .then((r: any) => r, () => ({ count: 0 })),
      (supabase as any).rpc("get_queue_sla_stats").then((r: any) => r, () => ({ data: null })),
    ]);
    setRisks((wd.data ?? []) as RiskWd[]);
    setAnoms(((an as any).data ?? []) as Anom[]);
    setFreezes((fz as any).count ?? 0);
    setSla((slaRes as any).data ?? null);
    setLoading(false);
    setRefreshedAt(new Date());
  }

  useEffect(() => {
    if (!user?.isAdmin) return;
    load();
    const id = setInterval(load, 45_000);
    return () => clearInterval(id);
  }, [user?.isAdmin]);

  const totalActions = useMemo(
    () =>
      (pending.deposits_pending ?? 0) +
      (pending.withdrawals_pending ?? 0) +
      (pending.aml_pending ?? 0) +
      (pending.refund_pending ?? 0) +
      (pending.anomalies_unack ?? 0),
    [pending],
  );

  if (!user) return null;
  if (!user.isAdmin) {
    return <EmptyState icon={<Crown className="w-6 h-6" />} title="권한 없음" description="관리자 전용" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display font-black text-2xl sm:text-3xl flex items-center gap-2">
            <Crown className="w-6 h-6 text-gold" /> Mission Control
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            액션 우선 콕핏 · 45초마다 자동 갱신
            {refreshedAt && <span className="ml-2">· {formatDistanceToNow(refreshedAt, { addSuffix: true, locale: ko })}</span>}
            <span className="ml-2">· 처리 대기 <b className="text-foreground tabular-nums">{totalActions}</b>건</span>
          </p>
        </div>
        <button
          onClick={load}
          className="glass-strong rounded-xl px-3 py-2 text-xs font-bold border border-border/60 hover:border-primary/60 transition flex items-center gap-2"
        >
          <RefreshCw className="w-3.5 h-3.5" /> 새로고침
        </button>
      </div>

      {/* Action Tiles */}
      <section>
        <h2 className="text-[10px] tracking-[0.3em] font-black text-muted-foreground uppercase mb-2">
          처리 대기 액션
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <ActionTile
            icon={ArrowUpFromLine}
            label="충전 검수"
            count={pending.deposits_pending ?? 0}
            hint="영수증 / 코인 입금"
            to="/admin/treasury/deposits"
            tone="gold"
            threshold={thresholds.deposits_hot}
          />
          <ActionTile
            icon={ArrowDownToLine}
            label="출금 지급"
            count={pending.withdrawals_pending ?? 0}
            hint="잔액 / KYC / SLA"
            to="/admin/treasury/withdrawals"
            tone="destructive"
            threshold={thresholds.withdrawals_hot}
            sla={pending.withdrawals_pending && pending.withdrawals_pending > 10 ? "위험" : "30분"}
          />
          <ActionTile
            icon={ShieldAlert}
            label="AML 큐"
            count={pending.aml_pending ?? 0}
            hint="고위험 트랜잭션"
            to="/admin/compliance/aml"
            tone="destructive"
            threshold={thresholds.aml_hot}
          />
          <ActionTile
            icon={HeartHandshake}
            label="환불 / 손실보호"
            count={pending.refund_pending ?? 0}
            hint="Trust v2 큐"
            to="/admin/compliance/trust"
            tone="primary"
            threshold={thresholds.refund_hot}
          />
          <ActionTile
            icon={AlertTriangle}
            label="이상감지"
            count={pending.anomalies_unack ?? 0}
            hint="미확인 이벤트"
            to="/admin/ops/errors"
            tone="destructive"
            threshold={thresholds.anomaly_hot}
          />
        </div>
      </section>

      {/* Today Treasury */}
      <section>
        <TodayKpiCards />
      </section>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Top Risk Withdrawals */}
        <section className="glass-strong rounded-2xl p-4 border border-border/50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ArrowDownToLine className="w-4 h-4 text-destructive" />
              <h3 className="font-display font-black text-sm">고위험 대기 출금 TOP</h3>
            </div>
            <Link to="/admin/treasury/withdrawals" className="text-[10px] tracking-[0.25em] font-black text-primary uppercase">
              전체 보기 →
            </Link>
          </div>
          {loading ? (
            <LoadingList rows={4} />
          ) : risks.length === 0 ? (
            <EmptyState icon={<ArrowDownToLine className="w-5 h-5" />} title="대기 출금 없음" description="현재 처리할 출금 요청이 없습니다." />
          ) : (
            <div className="space-y-2">
              {risks.map((r) => (
                <Link
                  key={r.id}
                  to={`/admin/treasury/withdrawals?id=${r.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border/40 bg-card/40 px-3 py-2 hover:border-destructive/40 transition"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-bold tabular-nums">
                      ₩{Number(r.amount).toLocaleString()}
                    </div>
                    <div className="text-[10px] text-muted-foreground truncate">
                      {r.user_id.slice(0, 8)} · {ago(r.created_at)}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Live Anomalies */}
        <section className="glass-strong rounded-2xl p-4 border border-border/50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-gold" />
              <h3 className="font-display font-black text-sm">실시간 이상 이벤트</h3>
              {freezes > 0 && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-gold border border-gold/40 bg-gold/10 rounded-full px-2 py-0.5">
                  <Snowflake className="w-3 h-3" /> 동결 {freezes}
                </span>
              )}
            </div>
            <Link to="/admin/ops/errors" className="text-[10px] tracking-[0.25em] font-black text-primary uppercase">
              전체 →
            </Link>
          </div>
          {loading ? (
            <LoadingList rows={4} />
          ) : anoms.length === 0 ? (
            <EmptyState icon={<Flame className="w-5 h-5" />} title="이상 없음" description="최근 미확인 이상 이벤트가 없습니다." />
          ) : (
            <div className="space-y-2">
              {anoms.map((a) => (
                <div
                  key={a.id}
                  className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 ${severityBadge(a.severity)}`}
                >
                  <div className="min-w-0">
                    <div className="text-xs font-black truncate">{a.rule}</div>
                    <div className="text-[10px] opacity-80 truncate">
                      {(a.user_id ?? "system").slice(0, 8)} · {ago(a.created_at)}
                    </div>
                  </div>
                  <span className="text-[10px] tracking-[0.2em] font-black uppercase shrink-0">
                    {a.severity}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
