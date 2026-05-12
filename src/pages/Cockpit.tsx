import { useEffect, useMemo, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Crown, Flame, Shield, Activity, Zap, ArrowDownToLine,
  ArrowUpToLine, Users, Bot, AlertTriangle, RefreshCw, Target, Swords,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRequireAdmin } from "@/hooks/use-require-auth";
import { LoadingList } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";

type Snapshot = {
  generated_at: string;
  revenue: { d30: number; today: number; d24h: number; target_30d: number; progress_pct: number };
  flows: {
    deposits_today_count: number; deposits_today_sum: number;
    withdrawals_today_count: number; withdrawals_today_sum: number;
    withdrawals_pending_count: number; withdrawals_pending_sum: number;
  };
  baron: { active: number; promoted_24h: number; promoted_7d: number };
  crown_war: {
    id?: string; status?: string; started_at?: string; ends_at?: string;
    participants?: number;
    top3?: Array<{ rnk: number; nick: string; score: number; level: number }>;
  };
  booster: { active_users: number; holding_rate_pct: number };
  bot_ratio: { real_dau: number; real_total: number; bot_active_24h: number; bot_total: number; real_share_pct: number };
  funnel: {
    signups_30d: number; practiced_30d: number; crowned_30d: number; baron_30d: number;
    practice_rate_pct: number; crown_rate_pct: number; baron_rate_pct: number;
  };
  risk: { unack_anomalies: number; freezes_active: number };
};

const fmt = (n: number) => new Intl.NumberFormat("ko-KR").format(Math.round(n || 0));

function useCountdown(target?: string) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!target) return null;
  const ms = new Date(target).getTime() - now;
  if (ms <= 0) return "정산 중";
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function Card({ children, className = "", glow }: { children: React.ReactNode; className?: string; glow?: "primary" | "gold" | "destructive" | "secondary" }) {
  const ring: Record<string, string> = {
    primary: "border-primary/40 shadow-[0_0_24px_-8px_hsl(var(--primary)/0.5)]",
    gold: "border-gold/40 shadow-[0_0_24px_-8px_hsl(var(--gold)/0.6)]",
    destructive: "border-destructive/40 shadow-[0_0_24px_-8px_hsl(var(--destructive)/0.5)]",
    secondary: "border-secondary/40",
  };
  return (
    <div className={`glass-strong rounded-2xl border ${glow ? ring[glow] : "border-white/10"} ${className}`}>
      {children}
    </div>
  );
}

function Gauge({ pct }: { pct: number }) {
  const clamp = Math.max(0, Math.min(100, pct));
  return (
    <div className="relative w-full h-3 rounded-full bg-white/5 overflow-hidden">
      <motion.div
        className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary via-gold to-primary"
        initial={{ width: 0 }}
        animate={{ width: `${clamp}%` }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_49.5%,hsl(var(--gold))_49.5%,hsl(var(--gold))_50.5%,transparent_50.5%)] opacity-60" />
    </div>
  );
}

export default function Cockpit() {
  const user = useRequireAdmin();
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSnap = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    const { data, error } = await supabase.rpc("get_cockpit_snapshot");
    if (error) { setErr(error.message); setLoading(false); setRefreshing(false); return; }
    setSnap(data as unknown as Snapshot);
    setErr(null);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchSnap();
    const t = setInterval(() => fetchSnap(true), 5000);
    return () => clearInterval(t);
  }, [user, fetchSnap]);

  // Realtime nudges on critical tables
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel("cockpit-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "anomaly_events" }, () => fetchSnap(true))
      .on("postgres_changes", { event: "*", schema: "public", table: "withdrawal_requests" }, () => fetchSnap(true))
      .on("postgres_changes", { event: "*", schema: "public", table: "package_purchases" }, () => fetchSnap(true))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, fetchSnap]);

  const cwCountdown = useCountdown(snap?.crown_war?.ends_at);

  if (!user) return null;
  if (loading) return (
    <div className="min-h-screen bg-background p-4">
      <LoadingList rows={6} />
    </div>
  );

  if (err || !snap) return (
    <div className="min-h-screen bg-background p-4">
      <EmptyState title="Cockpit 로드 실패" description={err || "데이터를 불러올 수 없습니다."} />
    </div>
  );

  const r = snap.revenue;
  const f = snap.flows;
  const b = snap.baron;
  const cw = snap.crown_war || {};
  const bo = snap.booster;
  const br = snap.bot_ratio;
  const fu = snap.funnel;
  const ri = snap.risk;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>Empire Cockpit · Phonara</title>
        <meta name="theme-color" content="#0a0a0f" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </Helmet>

      {/* Header */}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-background/80 border-b border-white/10">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-gold" />
            <div>
              <div className="font-display font-black text-sm tracking-[0.2em] text-gold">EMPIRE COCKPIT</div>
              <div className="text-[10px] text-muted-foreground">제국 전체 현황 · 5초 라이브</div>
            </div>
          </div>
          <button
            onClick={() => fetchSnap()}
            className="p-2 rounded-lg bg-white/5 border border-white/10 active:scale-95 transition"
            aria-label="새로고침"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </header>

      <main className="p-3 space-y-3 pb-24 max-w-md mx-auto">
        {/* Revenue Gauge — hero */}
        <Card glow="gold" className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-gold" />
              <span className="text-[10px] tracking-[0.25em] font-black text-muted-foreground uppercase">30d 누적</span>
            </div>
            <span className="text-[10px] font-bold text-gold tabular-nums">{r.progress_pct}%</span>
          </div>
          <div className="font-display font-black text-3xl tabular-nums text-gold">
            {fmt(r.d30)}
          </div>
          <div className="text-[10px] text-muted-foreground mt-1">
            목표 {fmt(r.target_30d)} · 오늘 +{fmt(r.today)} · 24h +{fmt(r.d24h)}
          </div>
          <div className="mt-3"><Gauge pct={r.progress_pct} /></div>
        </Card>

        {/* Flows */}
        <div className="grid grid-cols-2 gap-3">
          <Card glow="primary" className="p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <ArrowDownToLine className="w-3.5 h-3.5 text-primary" />
              <span className="text-[9px] tracking-[0.2em] font-black text-muted-foreground uppercase">오늘 입금</span>
            </div>
            <div className="font-display font-black text-xl tabular-nums text-primary">{fmt(f.deposits_today_sum)}</div>
            <div className="text-[10px] text-muted-foreground">{f.deposits_today_count}건</div>
          </Card>
          <Card glow={f.withdrawals_pending_count > 0 ? "destructive" : "secondary"} className="p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <ArrowUpToLine className="w-3.5 h-3.5 text-secondary" />
              <span className="text-[9px] tracking-[0.2em] font-black text-muted-foreground uppercase">출금 대기</span>
            </div>
            <div className="font-display font-black text-xl tabular-nums text-secondary">{f.withdrawals_pending_count}</div>
            <div className="text-[10px] text-muted-foreground">{fmt(f.withdrawals_pending_sum)} 대기</div>
          </Card>
        </div>

        {/* Crown War */}
        {cw.id && (
          <Card glow={cw.status === "live" ? "destructive" : "primary"} className="p-4 relative overflow-hidden">
            {cw.status === "live" && (
              <motion.div
                className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-destructive"
                animate={{ scale: [1, 1.6, 1], opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 1.2, repeat: Infinity }}
              />
            )}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Swords className="w-4 h-4 text-destructive" />
                <span className="text-[10px] tracking-[0.25em] font-black uppercase text-destructive">CROWN WAR · {cw.status}</span>
              </div>
              <span className="text-[11px] font-mono font-black text-gold tabular-nums">{cwCountdown ?? "—"}</span>
            </div>
            <div className="text-xs text-muted-foreground mb-2">참여자 <span className="text-foreground font-bold">{cw.participants ?? 0}</span></div>
            <div className="space-y-1">
              {(cw.top3 ?? []).map((t) => (
                <div key={t.rnk} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className={`font-black ${t.rnk === 1 ? "text-gold" : t.rnk === 2 ? "text-secondary" : "text-primary"}`}>#{t.rnk}</span>
                    <span className="text-muted-foreground">{t.nick}</span>
                    <span className="text-[9px] text-muted-foreground">Lv.{t.level}</span>
                  </div>
                  <span className="font-display font-black tabular-nums">{fmt(t.score)}</span>
                </div>
              ))}
              {(cw.top3 ?? []).length === 0 && (
                <div className="text-[10px] text-muted-foreground">참가자 대기 중</div>
              )}
            </div>
          </Card>
        )}

        {/* Baron + Booster */}
        <div className="grid grid-cols-2 gap-3">
          <Card glow="gold" className="p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Crown className="w-3.5 h-3.5 text-gold" />
              <span className="text-[9px] tracking-[0.2em] font-black text-muted-foreground uppercase">BARON+</span>
            </div>
            <div className="font-display font-black text-xl tabular-nums text-gold">{fmt(b.active)}</div>
            <div className="text-[10px] text-muted-foreground">+{b.promoted_24h} (24h) · +{b.promoted_7d} (7d)</div>
          </Card>
          <Card glow="primary" className="p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Zap className="w-3.5 h-3.5 text-primary" />
              <span className="text-[9px] tracking-[0.2em] font-black text-muted-foreground uppercase">부스터 활성</span>
            </div>
            <div className="font-display font-black text-xl tabular-nums text-primary">{fmt(bo.active_users)}</div>
            <div className="text-[10px] text-muted-foreground">보유율 {bo.holding_rate_pct}%</div>
          </Card>
        </div>

        {/* Bot vs Real */}
        <Card glow="secondary" className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-secondary" />
              <span className="text-[10px] tracking-[0.25em] font-black text-muted-foreground uppercase">REAL vs BOT (24h)</span>
            </div>
            <span className="text-[10px] font-bold text-secondary tabular-nums">REAL {br.real_share_pct}%</span>
          </div>
          <div className="flex h-2 rounded-full overflow-hidden bg-white/5">
            <div className="bg-gradient-to-r from-primary to-secondary" style={{ width: `${br.real_share_pct}%` }} />
            <div className="bg-white/10" style={{ width: `${100 - br.real_share_pct}%` }} />
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2 text-[10px]">
            <div className="flex items-center gap-1.5"><Users className="w-3 h-3 text-primary" /> Real DAU <span className="font-black text-foreground tabular-nums">{fmt(br.real_dau)}</span> / {fmt(br.real_total)}</div>
            <div className="flex items-center gap-1.5"><Bot className="w-3 h-3 text-secondary" /> Bot 24h <span className="font-black text-foreground tabular-nums">{fmt(br.bot_active_24h)}</span> / {fmt(br.bot_total)}</div>
          </div>
        </Card>

        {/* Funnel */}
        <Card glow="primary" className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Flame className="w-4 h-4 text-primary" />
            <span className="text-[10px] tracking-[0.25em] font-black text-muted-foreground uppercase">FUNNEL · 30d</span>
          </div>
          <FunnelStep label="가입" value={fu.signups_30d} pct={100} tone="primary" />
          <FunnelStep label="Practice" value={fu.practiced_30d} pct={fu.practice_rate_pct} tone="primary" />
          <FunnelStep label="Crown" value={fu.crowned_30d} pct={fu.crown_rate_pct} tone="gold" />
          <FunnelStep label="Baron" value={fu.baron_30d} pct={fu.baron_rate_pct} tone="gold" last />
        </Card>

        {/* Risk */}
        {(ri.unack_anomalies > 0 || ri.freezes_active > 0) && (
          <Card glow="destructive" className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-destructive" />
                <span className="text-[10px] tracking-[0.25em] font-black uppercase text-destructive">위험 신호</span>
              </div>
              <div className="text-[11px] tabular-nums">
                <span className="text-destructive font-black">{ri.unack_anomalies}</span> 미확인 ·{" "}
                <span className="text-secondary font-black">{ri.freezes_active}</span> 동결
              </div>
            </div>
          </Card>
        )}

        <div className="text-center text-[9px] text-muted-foreground/60 pt-2">
          generated · {new Date(snap.generated_at).toLocaleTimeString("ko-KR")}
        </div>
      </main>
    </div>
  );
}

function FunnelStep({ label, value, pct, tone, last }: { label: string; value: number; pct: number; tone: "primary" | "gold"; last?: boolean }) {
  const toneCls = tone === "gold" ? "from-gold/80 to-gold/30 text-gold" : "from-primary/80 to-primary/30 text-primary";
  return (
    <div className={last ? "" : "mb-2"}>
      <div className="flex items-center justify-between mb-1 text-[11px]">
        <span className="text-muted-foreground">{label}</span>
        <span className={`font-display font-black tabular-nums ${tone === "gold" ? "text-gold" : "text-primary"}`}>
          {fmt(value)} <span className="text-[9px] text-muted-foreground">({pct}%)</span>
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
        <motion.div
          className={`h-full bg-gradient-to-r ${toneCls}`}
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(2, Math.min(100, pct))}%` }}
          transition={{ duration: 0.6 }}
        />
      </div>
    </div>
  );
}
