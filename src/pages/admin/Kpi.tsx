// V17 /admin/kpi — Empire master KPI dashboard (MAU, CTR, ARPU, K-Factor, Viral).
// Admin-only. Pulls from feed_events, revenue_events, profiles. Auto-refresh 60s.
import { useEffect, useState } from "react";
import { Activity, MousePointerClick, Users, TrendingUp, Flame, RefreshCw, Crown } from "lucide-react";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useRequireAdmin } from "@/hooks/use-require-auth";
import { LoadingList } from "@/components/ui/loading-state";

type Kpi = {
  mau: number;
  dau: number;
  ctr24h: number;
  arpu7d: number;
  kFactor7d: number;
  viralAvg: number;
  revenue7d: number;
  feed24h: number;
};

function fmtKRW(n: number) { return `₩${Math.round(n).toLocaleString()}`; }
function fmtPct(n: number) { return `${(n * 100).toFixed(1)}%`; }

export default function AdminKpi() {
  const admin = useRequireAdmin();
  const [k, setK] = useState<Kpi | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    setBusy(true);
    try {
      const now = Date.now();
      const d1 = new Date(now - 24 * 3600e3).toISOString();
      const d7 = new Date(now - 7 * 24 * 3600e3).toISOString();
      const d30 = new Date(now - 30 * 24 * 3600e3).toISOString();

      const [feed24, feed30, rev7, prof7, viral] = await Promise.all([
        supabase.from("feed_events" as any).select("user_id, event_type").gte("created_at", d1).limit(50000),
        supabase.from("feed_events" as any).select("user_id").gte("created_at", d30).not("user_id", "is", null).limit(50000),
        supabase.from("revenue_events" as any).select("user_id, amount_krw").gte("created_at", d7).limit(50000),
        supabase.from("profiles" as any).select("id, referred_by, created_at").gte("created_at", d7).limit(10000),
        supabase.from("viral_metrics" as any).select("viral_score").order("updated_at", { ascending: false }).limit(500),
      ]);

      const fe = (feed24.data ?? []) as unknown as Array<{ user_id: string | null; event_type: string }>;
      const dauSet = new Set<string>();
      let views = 0, clicks = 0;
      for (const e of fe) {
        if (e.user_id) dauSet.add(e.user_id);
        if (e.event_type === "view") views++;
        else if (e.event_type === "3s" || e.event_type === "complete" || e.event_type === "share" || e.event_type === "like") clicks++;
      }

      const mauSet = new Set<string>();
      for (const r of (feed30.data ?? []) as unknown as Array<{ user_id: string }>) mauSet.add(r.user_id);

      const rev = (rev7.data ?? []) as unknown as Array<{ user_id: string | null; amount_krw: number }>;
      const revSum = rev.reduce((s, r) => s + (Number(r.amount_krw) || 0), 0);
      const payerSet = new Set<string>();
      for (const r of rev) if (r.user_id) payerSet.add(r.user_id);

      const profs = (prof7.data ?? []) as unknown as Array<{ id: string; referred_by: string | null }>;
      const inviters = new Set<string>();
      let invitedNew = 0;
      for (const p of profs) {
        if (p.referred_by) {
          inviters.add(p.referred_by);
          invitedNew++;
        }
      }
      const kFactor = inviters.size ? invitedNew / inviters.size : 0;

      const vs = (viral.data ?? []) as unknown as Array<{ viral_score: number }>;
      const viralAvg = vs.length ? vs.reduce((s, r) => s + (r.viral_score || 0), 0) / vs.length : 0;

      setK({
        mau: mauSet.size,
        dau: dauSet.size,
        ctr24h: views ? clicks / views : 0,
        arpu7d: payerSet.size ? revSum / payerSet.size : 0,
        kFactor7d: kFactor,
        viralAvg,
        revenue7d: revSum,
        feed24h: fe.length,
      });
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!admin) return;
    void load();
    const t = window.setInterval(() => void load(), 60_000);
    return () => window.clearInterval(t);
  }, [admin]); // eslint-disable-line

  if (!admin) return null;

  return (
    <Layout>
      <div className="container py-6 space-y-6">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-display font-black tracking-wide">제국 KPI 콕핏</h1>
            <span className="text-[10px] tracking-widest text-muted-foreground uppercase">V17 Master</span>
          </div>
          <button
            onClick={load}
            disabled={busy}
            className="text-xs font-bold flex items-center gap-1 text-muted-foreground hover:text-primary transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${busy ? "animate-spin" : ""}`} /> 새로고침
          </button>
        </header>

        {!k ? (
          <LoadingList rows={3} />
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Stat icon={Users} label="MAU (30d)" value={k.mau.toLocaleString()} />
              <Stat icon={Activity} label="DAU (24h)" value={k.dau.toLocaleString()} />
              <Stat icon={MousePointerClick} label="피드 CTR (24h)" value={fmtPct(k.ctr24h)} hint={`이벤트 ${k.feed24h.toLocaleString()}건`} />
              <Stat icon={TrendingUp} label="K-Factor (7d)" value={k.kFactor7d.toFixed(2)} hint="초대자당 신규 가입" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Stat icon={TrendingUp} label="ARPU (7d, 결제자 기준)" value={fmtKRW(k.arpu7d)} tone="text-money-strong" />
              <Stat icon={TrendingUp} label="총 매출 (7d)" value={fmtKRW(k.revenue7d)} tone="text-money-strong" />
              <Stat icon={Flame} label="평균 Viral Score" value={k.viralAvg.toFixed(3)} hint="최근 500개 영상" />
            </div>
            <div className="glass rounded-2xl p-4 text-xs text-muted-foreground border border-border/40">
              데이터 출처: feed_events / revenue_events / profiles.referred_by / viral_metrics. 60초마다 자동 갱신.
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}

function Stat({
  icon: Icon, label, value, hint, tone,
}: { icon: typeof Users; label: string; value: string; hint?: string; tone?: string }) {
  return (
    <div className="glass-strong rounded-2xl p-4 border border-border/40">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
        <Icon className="w-3.5 h-3.5" /> {label}
      </div>
      <div className={`font-display font-black text-2xl tabular-nums ${tone ?? ""}`}>{value}</div>
      {hint && <div className="text-[10px] text-muted-foreground mt-1">{hint}</div>}
    </div>
  );
}
