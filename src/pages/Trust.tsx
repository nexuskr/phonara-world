import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ShieldCheck, TrendingUp, Activity, Crown, Clock, Users, FileCheck2, Radar, ArrowLeft, RefreshCw, History } from "lucide-react";
import Particles from "@/components/Particles";
import { ResponsiveContainer, AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip as RTooltip, CartesianGrid } from "recharts";

type HistoryRow = {
  taken_at: string;
  total_paid: number;
  paid_30d: number;
  cron_uptime_7d: number;
  audit_pass_30d: number;
  policy_pass_7d: number;
  uptime_success_24h: number;
  uptime_p95_ms_24h: number;
  unack_anomalies: number;
};
type AssertionStatus = { last_run_at: string | null; next_run_at: string | null; last_passed: number | null; last_failed: number | null } | null;

type Metrics = {
  total_paid: number;
  paid_30d: number;
  avg_settle_minutes: number;
  cron_uptime_7d: number;
  audit_pass_30d: number;
  policy_pass_7d: number;
  unack_anomalies: number;
  last_cron_at: string | null;
  total_members: number;
  active_members_30d: number;
  generated_at: string;
};

const fmtKRW = (n: number) => `₩ ${Number(n || 0).toLocaleString()}`;
const fmtPct = (n: number) => `${Number(n ?? 0).toFixed(2)}%`;

type UptimeSummary = {
  samples_24h: number;
  success_rate_24h: number;
  success_rate_7d: number;
  p95_latency_ms_24h: number;
  avg_latency_ms_24h: number;
  last_ping_at: string | null;
  last_ok: boolean | null;
  generated_at: string;
};

type HeatmapDay = { date: string; samples: number; success_rate: number | null };
type ChaosLatest = {
  ran_at: string; total_probes: number; passed: number; failed: number;
  duration_ms: number; pass_rate: number | null; source: string;
} | null;

export default function Trust() {
  const [m, setM] = useState<Metrics | null>(null);
  const [u, setU] = useState<UptimeSummary | null>(null);
  const [heat, setHeat] = useState<HeatmapDay[]>([]);
  const [chaos, setChaos] = useState<ChaosLatest>(null);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [historyDays, setHistoryDays] = useState<7 | 30>(30);
  const [assertStatus, setAssertStatus] = useState<AssertionStatus>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const sb: any = supabase;
      const [{ data: md }, { data: ud }, { data: hd }, { data: cd }, { data: histD }] = await Promise.all([
        sb.rpc("public_trust_metrics"),
        sb.rpc("public_uptime_summary"),
        sb.rpc("public_uptime_heatmap_90d"),
        sb.rpc("latest_chaos_run"),
        sb.rpc("public_trust_history", { _days: historyDays }),
      ]);
      setM((md as Metrics) ?? null);
      setU((ud as unknown as UptimeSummary) ?? null);
      setHeat(((hd as any)?.days ?? []) as HeatmapDay[]);
      setChaos((cd as ChaosLatest) ?? null);
      setHistory((histD as HistoryRow[]) ?? []);
      // admin 전용 — 실패는 조용히 무시
      sb.rpc("policy_assertions_status").then(({ data, error: e }: any) => {
        if (!e) setAssertStatus((data as AssertionStatus) ?? null);
      });
    } catch (e: any) {
      setError(e?.message ?? "데이터 로드 실패");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void load(); /* eslint-disable-next-line */ }, [historyDays]);

  useEffect(() => {
    document.title = "Phonara Trust — 공개 신뢰 지표";
    const meta = document.querySelector('meta[name="description"]');
    const desc = "누적 정산 지급액, 가동률, 보안 감사 통과율 등 Phonara의 운영 신뢰 지표를 실시간으로 공개합니다.";
    if (meta) meta.setAttribute("content", desc);
    else {
      const el = document.createElement("meta");
      el.name = "description"; el.content = desc;
      document.head.appendChild(el);
    }
    let canon = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canon) {
      canon = document.createElement("link");
      canon.rel = "canonical";
      document.head.appendChild(canon);
    }
    canon.href = `${window.location.origin}/trust`;
  }, []);

  // JSON-LD structured data — updates when metrics arrive
  useEffect(() => {
    const id = "phonara-trust-jsonld";
    document.getElementById(id)?.remove();
    if (!m) return;
    const ld = {
      "@context": "https://schema.org",
      "@type": "Dataset",
      name: "Phonara Trust Metrics",
      description: "Public operational trust metrics for Phonara: settlement uptime, audit pass rate, anomaly count.",
      url: `${window.location.origin}/trust`,
      creator: { "@type": "Organization", name: "Phonara" },
      dateModified: m.generated_at,
      variableMeasured: [
        { "@type": "PropertyValue", name: "cron_uptime_7d", value: m.cron_uptime_7d, unitText: "PERCENT" },
        { "@type": "PropertyValue", name: "audit_pass_30d", value: m.audit_pass_30d, unitText: "PERCENT" },
        { "@type": "PropertyValue", name: "policy_pass_7d", value: m.policy_pass_7d, unitText: "PERCENT" },
        { "@type": "PropertyValue", name: "unack_anomalies", value: m.unack_anomalies },
      ],
    };
    const script = document.createElement("script");
    script.id = id;
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(ld);
    document.head.appendChild(script);
    return () => { document.getElementById(id)?.remove(); };
  }, [m]);

  const allGreen = m && m.cron_uptime_7d >= 99 && m.audit_pass_30d >= 99 && m.policy_pass_7d >= 99 && m.unack_anomalies === 0;

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />
      <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-primary/25 blur-3xl animate-float" />
      <div className="absolute top-40 -right-40 w-[600px] h-[600px] rounded-full bg-primary/20 blur-3xl animate-float-slow" />
      <Particles density={50} />

      <header className="relative z-10 container py-6 flex items-center justify-between">
        <Link to="/" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> 홈으로
        </Link>
        <button onClick={load} disabled={loading} className="text-xs text-primary inline-flex items-center gap-1">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> 새로고침
        </button>
      </header>

      <main className="relative z-10 container pb-20">
        <section className="text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass border border-primary/30 mb-6">
            <Crown className="w-3 h-3 text-primary" />
            <span className="text-xs text-primary font-bold tracking-[0.2em]">PUBLIC TRUST</span>
          </div>
          <h1 className="font-display font-black text-3xl sm:text-5xl leading-tight">
            <span className="text-gradient-imperial">투명하게 운영합니다</span>
          </h1>
          <p className="mt-4 text-sm text-muted-foreground">
            Phonara의 정산·보안·가동률 지표를 실시간으로 공개합니다. 모든 데이터는 집계만 사용되며 개인정보는 포함되지 않습니다.
          </p>
          {m && (
            <div className={`mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full border ${allGreen ? "bg-secondary/15 border-secondary/40 text-secondary" : "bg-gold/15 border-gold/40 text-gold"}`}>
              <ShieldCheck className="w-4 h-4" />
              <span className="text-xs font-bold">{allGreen ? "ALL SYSTEMS NORMAL" : "MONITORING"}</span>
            </div>
          )}
        </section>

        {/* Hero numbers */}
        <section className="mt-12 grid md:grid-cols-2 gap-4">
          <Hero
            icon={TrendingUp}
            label="누적 정산 지급액"
            value={loading ? "—" : fmtKRW(m?.total_paid ?? 0)}
            sub={loading ? "" : `최근 30일 ${fmtKRW(m?.paid_30d ?? 0)}`}
          />
          <Hero
            icon={Users}
            label="누적 회원"
            value={loading ? "—" : (m?.total_members ?? 0).toLocaleString()}
            sub={loading ? "" : `최근 30일 활동 ${(m?.active_members_30d ?? 0).toLocaleString()}명`}
          />
        </section>

        {/* SLO grid */}
        <section className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-3">
          <Tile icon={Activity} label="정산 가동률 (7d)" value={loading ? "—" : fmtPct(m?.cron_uptime_7d ?? 0)} ok={(m?.cron_uptime_7d ?? 0) >= 99} />
          <Tile icon={Clock} label="평균 정산 처리" value={loading ? "—" : `${(m?.avg_settle_minutes ?? 0).toFixed(1)}분`} ok={(m?.avg_settle_minutes ?? 0) <= 30} />
          <Tile icon={ShieldCheck} label="보안 감사 PASS (30d)" value={loading ? "—" : fmtPct(m?.audit_pass_30d ?? 0)} ok={(m?.audit_pass_30d ?? 0) >= 99} />
          <Tile icon={FileCheck2} label="정책 단언 통과 (7d)" value={loading ? "—" : fmtPct(m?.policy_pass_7d ?? 0)} ok={(m?.policy_pass_7d ?? 0) >= 99} />
          <Tile icon={Radar} label="미확인 이상치" value={loading ? "—" : String(m?.unack_anomalies ?? 0)} ok={(m?.unack_anomalies ?? 0) === 0} />
          <Tile icon={Clock} label="마지막 정산 실행" value={loading ? "—" : (m?.last_cron_at ? new Date(m.last_cron_at).toLocaleString("ko-KR") : "—")} ok={!!m?.last_cron_at} small />
        </section>

        {error && (
          <div className="mt-6 glass-strong rounded-2xl p-4 border border-destructive/40 text-destructive text-xs flex items-center justify-between">
            <span>⚠ {error}</span>
            <button onClick={load} className="px-3 py-1.5 rounded-lg bg-destructive/20 font-bold">재시도</button>
          </div>
        )}

        {assertStatus && (
        <section className="mt-6 glass-strong rounded-3xl p-6 border border-gold/20">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2 font-display font-black text-base">
              <FileCheck2 className="w-5 h-5 text-gold" /> 정책 단언 자동검증
            </div>
            {assertStatus && (
              <span className={`text-[10px] px-2 py-1 rounded-full border font-bold ${
                (assertStatus.last_failed ?? 0) === 0 ? "text-secondary bg-secondary/15 border-secondary/40" : "text-destructive bg-destructive/15 border-destructive/40"
              }`}>
                {(assertStatus.last_failed ?? 0) === 0 ? `ALL PASS · ${assertStatus.last_passed ?? 0}건` : `${assertStatus.last_failed} FAIL`}
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="glass rounded-xl p-3">
              <div className="text-[10px] text-muted-foreground">마지막 실행</div>
              <div className="font-bold mt-1">{assertStatus?.last_run_at ? new Date(assertStatus.last_run_at).toLocaleString("ko-KR") : "—"}</div>
            </div>
            <div className="glass rounded-xl p-3">
              <div className="text-[10px] text-muted-foreground">다음 실행 예정</div>
              <div className="font-bold mt-1">{assertStatus?.next_run_at ? new Date(assertStatus.next_run_at).toLocaleString("ko-KR") : "—"}</div>
            </div>
          </div>
        </section>

        {/* Synthetic uptime canary */}
        <section className="mt-6 glass-strong rounded-3xl p-6 border border-secondary/20">
          <div className="flex items-center justify-between mb-3">
            <div className="font-display font-black text-base">합성 가동률 카나리</div>
            <div className="text-[10px] text-muted-foreground">5분마다 외부 핑</div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Tile icon={Activity} label="성공률 (24h)" value={loading ? "—" : fmtPct(u?.success_rate_24h ?? 0)} ok={(u?.success_rate_24h ?? 0) >= 99} />
            <Tile icon={Activity} label="성공률 (7d)" value={loading ? "—" : fmtPct(u?.success_rate_7d ?? 0)} ok={(u?.success_rate_7d ?? 0) >= 99} />
            <Tile icon={Clock} label="p95 지연 (24h)" value={loading ? "—" : `${u?.p95_latency_ms_24h ?? 0}ms`} ok={(u?.p95_latency_ms_24h ?? 0) <= 1500} />
            <Tile icon={Clock} label="마지막 핑" value={loading ? "—" : (u?.last_ping_at ? new Date(u.last_ping_at).toLocaleTimeString("ko-KR") : "—")} ok={!!u?.last_ok} small />
          </div>
        </section>

        <section className="mt-6 glass-strong rounded-3xl p-6 border border-primary/20">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2 font-display font-black text-base">
              <History className="w-5 h-5 text-primary" /> 신뢰 지표 히스토리
            </div>
            <div className="flex gap-1">
              {[7, 30].map((d) => (
                <button key={d} onClick={() => setHistoryDays(d as 7 | 30)}
                  className={`px-3 py-1 rounded-lg text-[10px] font-bold ${historyDays === d ? "bg-gradient-imperial text-primary-foreground" : "glass text-muted-foreground"}`}>
                  {d}일
                </button>
              ))}
            </div>
          </div>
          {loading ? (
            <div className="h-48 flex items-center justify-center text-xs text-muted-foreground animate-pulse">불러오는 중…</div>
          ) : history.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-xs text-muted-foreground">아직 누적된 스냅샷이 없습니다. (매일 04:05 UTC 기록)</div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              <div className="glass rounded-2xl p-3">
                <div className="text-[11px] text-muted-foreground mb-2 font-bold">누적 정산 지급액 (₩)</div>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={history}>
                    <defs>
                      <linearGradient id="gPaid" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.6} />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis dataKey="taken_at" tick={{ fontSize: 9 }} tickFormatter={(t) => new Date(t).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" })} />
                    <YAxis tick={{ fontSize: 9 }} tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}M`} />
                    <RTooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", fontSize: 11 }}
                      formatter={(v: any) => fmtKRW(Number(v))} labelFormatter={(t) => new Date(t).toLocaleDateString("ko-KR")} />
                    <Area type="monotone" dataKey="total_paid" stroke="hsl(var(--primary))" fill="url(#gPaid)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="glass rounded-2xl p-3">
                <div className="text-[11px] text-muted-foreground mb-2 font-bold">가동률·감사 PASS (%)</div>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={history}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis dataKey="taken_at" tick={{ fontSize: 9 }} tickFormatter={(t) => new Date(t).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" })} />
                    <YAxis tick={{ fontSize: 9 }} domain={[90, 100]} />
                    <RTooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", fontSize: 11 }}
                      formatter={(v: any) => `${Number(v).toFixed(2)}%`} labelFormatter={(t) => new Date(t).toLocaleDateString("ko-KR")} />
                    <Line type="monotone" dataKey="cron_uptime_7d" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="가동률" />
                    <Line type="monotone" dataKey="audit_pass_30d" stroke="hsl(var(--secondary))" strokeWidth={2} dot={false} name="감사 PASS" />
                    <Line type="monotone" dataKey="policy_pass_7d" stroke="hsl(var(--gold))" strokeWidth={2} dot={false} name="정책 단언" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </section>

        {/* 90-day heatmap + Chaos */}
        <section className="mt-6 grid md:grid-cols-3 gap-4">
          <div className="md:col-span-2 glass-strong rounded-3xl p-6 border border-primary/20">
            <div className="flex items-center justify-between mb-3">
              <div className="font-display font-black text-base">90일 가동률 히트맵</div>
              <div className="text-[10px] text-muted-foreground">하루당 1셀 · 외부 핑 기준</div>
            </div>
            <div className="grid grid-cols-[repeat(30,minmax(0,1fr))] sm:grid-cols-[repeat(45,minmax(0,1fr))] md:grid-cols-[repeat(90,minmax(0,1fr))] gap-[2px]">
              {heat.map((d) => {
                const r = d.success_rate;
                const cls = d.samples === 0 ? "bg-muted/30"
                  : r === null ? "bg-muted/30"
                  : r >= 99.5 ? "bg-secondary/80"
                  : r >= 95 ? "bg-secondary/40"
                  : r >= 80 ? "bg-gold/60"
                  : "bg-destructive/70";
                return (
                  <div key={d.date} className={`aspect-square rounded-[2px] ${cls}`}
                    title={`${d.date} · ${d.samples} 샘플 · ${r === null ? "—" : `${r.toFixed(1)}%`}`}
                  />
                );
              })}
            </div>
            <div className="mt-3 flex items-center gap-3 text-[10px] text-muted-foreground">
              <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-secondary/80" /> ≥99.5%</span>
              <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-secondary/40" /> ≥95%</span>
              <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-gold/60" /> ≥80%</span>
              <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-destructive/70" /> &lt;80%</span>
              <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-muted/30" /> 데이터 없음</span>
            </div>
          </div>

          <div className="glass-strong rounded-3xl p-6 border border-gold/20">
            <div className="font-display font-black text-base mb-2">최근 카오스 드릴</div>
            {!chaos ? (
              <div className="text-xs text-muted-foreground">아직 기록된 드릴이 없습니다.</div>
            ) : (
              <>
                <div className={`text-3xl font-display font-black tabular-nums ${chaos.failed === 0 ? "text-secondary" : "text-destructive"}`}>
                  {chaos.passed}/{chaos.total_probes}
                </div>
                <div className="text-[10px] text-muted-foreground mt-1">
                  {chaos.pass_rate?.toFixed(1) ?? "—"}% PASS · {Math.round((chaos.duration_ms ?? 0) / 1000)}s
                </div>
                <div className="mt-3 text-xs">
                  실행: {new Date(chaos.ran_at).toLocaleString("ko-KR")}
                </div>
                <div className="mt-1 text-[10px] text-muted-foreground">소스: {chaos.source}</div>
              </>
            )}
          </div>
        </section>

        <section className="mt-12 glass-strong rounded-3xl p-6 border border-primary/20 text-xs text-muted-foreground leading-relaxed">
          <div className="font-display font-black text-base text-foreground mb-2">우리의 약속</div>
          <ul className="space-y-1 list-disc list-inside">
            <li>모든 정산은 자동화된 cron이 매일 실행하며, 실패 시 자동 복구가 시도됩니다.</li>
            <li>RLS(Row-Level Security) 무결성은 매일 자가검사로 검증됩니다.</li>
            <li>정책 단언은 anon 사용자가 민감 데이터에 접근할 수 없음을 매일 실증합니다.</li>
            <li>이상 행위(출금 버스트·정산 직후 출금 등)는 5분마다 자동 탐지됩니다.</li>
          </ul>
          {m?.generated_at && (
            <div className="mt-4 text-[10px]">데이터 생성: {new Date(m.generated_at).toLocaleString("ko-KR")}</div>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-2 text-[10px]">
            <span className="text-muted-foreground">공개 상태 API:</span>
            <a
              href={`https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/public-status`}
              target="_blank" rel="noopener noreferrer"
              className="px-2 py-1 rounded-full glass border border-primary/30 text-primary hover:border-primary/60 transition"
            >
              GET /public-status
            </a>
            <a
              href={`https://img.shields.io/endpoint?url=https%3A%2F%2F${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co%2Ffunctions%2Fv1%2Fpublic-status%3Fformat%3Dshield`}
              target="_blank" rel="noopener noreferrer"
              className="px-2 py-1 rounded-full glass border border-secondary/30 text-secondary hover:border-secondary/60 transition"
            >
              Shields.io 배지
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}

function Hero({ icon: Icon, label, value, sub }: any) {
  return (
    <div className="glass-strong rounded-3xl p-6 border border-primary/30 relative overflow-hidden">
      <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-40 bg-primary" />
      <Icon className="w-6 h-6 text-primary" />
      <div className="text-[10px] text-muted-foreground tracking-widest mt-3 font-bold">{label}</div>
      <div className="font-display font-black text-3xl mt-1 text-gradient-imperial tabular-nums">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-2">{sub}</div>}
    </div>
  );
}

function Tile({ icon: Icon, label, value, ok, small }: any) {
  return (
    <div className="glass rounded-2xl p-4 border border-border">
      <div className="flex items-center gap-2">
        <Icon className={`w-4 h-4 ${ok ? "text-secondary" : "text-gold"}`} />
        <span className={`w-1.5 h-1.5 rounded-full ${ok ? "bg-secondary" : "bg-gold"} animate-pulse`} />
      </div>
      <div className="text-[10px] text-muted-foreground mt-2">{label}</div>
      <div className={`font-bold mt-1 tabular-nums ${small ? "text-xs" : "text-lg"} ${ok ? "" : "text-gold"}`}>{value}</div>
    </div>
  );
}
