import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { ShieldCheck, TrendingUp, Activity, Crown, Clock, Users, FileCheck2, Radar, ArrowLeft, RefreshCw, History } from "lucide-react";
import Particles from "@/components/Particles";
import TrustHistoryCharts from "@/components/trust/TrustHistoryCharts";
import { LuxButton, LuxChip, Money } from "@/components/ui/lux";
import { prefetchTrust, getTrustCache, invalidateTrustCache } from "@/lib/trustPrefetch";

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
  const { t, i18n } = useTranslation("trust");
  const lng = i18n.language?.startsWith("en") ? "en" : "ko";
  const dtLocale = lng === "en" ? "en-US" : "ko-KR";
  const fmtMoney = (n: number) => lng === "en"
    ? `₩${Number(n || 0).toLocaleString("en-US")}`
    : `₩ ${Number(n || 0).toLocaleString("ko-KR")}`;
  const fmtNum = (n: number) => Number(n || 0).toLocaleString(dtLocale);

  const [m, setM] = useState<Metrics | null>(null);
  const [u, setU] = useState<UptimeSummary | null>(null);
  const [heat, setHeat] = useState<HeatmapDay[]>([]);
  const [chaos, setChaos] = useState<ChaosLatest>(null);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [historyDays, setHistoryDays] = useState<7 | 30>(30);
  const [assertStatus, setAssertStatus] = useState<AssertionStatus>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load(force = false) {
    if (force) invalidateTrustCache();
    const cached = getTrustCache(historyDays);
    if (cached) {
      setM(cached.metrics); setU(cached.uptime); setHeat(cached.heatmap);
      setChaos(cached.chaos); setHistory(cached.history);
      setLoading(false);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const sb: any = supabase;
      const [{ data: md }, { data: ud }] = await Promise.all([
        sb.rpc("public_trust_metrics"),
        sb.rpc("public_uptime_summary"),
      ]);
      setM((md as Metrics) ?? null);
      setU((ud as unknown as UptimeSummary) ?? null);
      setLoading(false);
      const [{ data: hd }, { data: cd }, { data: histD }] = await Promise.all([
        sb.rpc("public_uptime_heatmap_90d"),
        sb.rpc("latest_chaos_run"),
        sb.rpc("public_trust_history", { _days: historyDays }),
      ]);
      setHeat(((hd as any)?.days ?? []) as HeatmapDay[]);
      setChaos((cd as ChaosLatest) ?? null);
      setHistory((histD as HistoryRow[]) ?? []);
      sb.rpc("policy_assertions_status").then(({ data, error: e }: any) => {
        if (!e) setAssertStatus((data as AssertionStatus) ?? null);
      });
      void prefetchTrust(historyDays);
    } catch (e: any) {
      setError(e?.message ?? t("loadFail"));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void load(); /* eslint-disable-next-line */ }, [historyDays]);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "TOKEN_REFRESHED") {
        invalidateTrustCache();
        void load(true);
      }
    });
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    document.title = t("seoTitle");
    const meta = document.querySelector('meta[name="description"]');
    const desc = t("seoDesc");
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
  }, [t, lng]);

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

      <header className="relative z-10 container py-6 flex items-center justify-between gap-3">
        <Link to="/" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 min-h-[44px]">
          <ArrowLeft className="w-3.5 h-3.5" /> {t("home")}
        </Link>
        <button onClick={() => load(true)} disabled={loading} className="text-xs text-primary inline-flex items-center gap-1 min-h-[44px] px-3 break-keep">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> {t("refresh")}
        </button>
      </header>

      <main className="relative z-10 container pb-20">
        <section className="text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass border border-primary/30 mb-6">
            <Crown className="w-3 h-3 text-primary" />
            <span className="text-xs text-primary font-bold tracking-[0.2em]">{t("badge")}</span>
          </div>
          <h1 className="font-display font-black text-3xl sm:text-5xl leading-tight break-keep">
            <span className="text-gradient-imperial">{t("title")}</span>
          </h1>
          <p className="mt-4 text-sm text-muted-foreground break-keep">
            {t("desc")}
          </p>
          {m && (
            <div className={`mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full border ${allGreen ? "bg-secondary/15 border-secondary/40 text-secondary" : "bg-gold/15 border-gold/40 text-gold"}`}>
              <ShieldCheck className="w-4 h-4" />
              <span className="text-xs font-bold tracking-[0.18em]">{allGreen ? t("allOk") : t("monitoring")}</span>
            </div>
          )}
        </section>

        {/* Hero numbers */}
        <section className="mt-12 grid md:grid-cols-2 gap-4">
          <Hero
            icon={TrendingUp}
            label={t("heroPaid")}
            value={fmtMoney(m?.total_paid ?? 0)} loading={loading && !m}
            sub={loading ? "" : t("heroPaidSub", { val: fmtMoney(m?.paid_30d ?? 0) })}
          />
          <Hero
            icon={Users}
            label={t("heroMembers")}
            value={fmtNum(m?.total_members ?? 0)} loading={loading && !m}
            sub={loading ? "" : t("heroMembersSub", { n: fmtNum(m?.active_members_30d ?? 0) })}
          />
        </section>

        {/* SLO grid */}
        <section className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-3">
          <Tile icon={Activity} label={t("tileUptime")} value={fmtPct(m?.cron_uptime_7d ?? 0)} loading={loading && !m && !u} ok={(m?.cron_uptime_7d ?? 0) >= 99} />
          <Tile icon={Clock} label={t("tileAvgSettle")} value={`${(m?.avg_settle_minutes ?? 0).toFixed(1)} ${t("minutesUnit")}`} loading={loading && !m && !u} ok={(m?.avg_settle_minutes ?? 0) <= 30} />
          <Tile icon={ShieldCheck} label={t("tileAudit")} value={fmtPct(m?.audit_pass_30d ?? 0)} loading={loading && !m && !u} ok={(m?.audit_pass_30d ?? 0) >= 99} />
          <Tile icon={FileCheck2} label={t("tilePolicy")} value={fmtPct(m?.policy_pass_7d ?? 0)} loading={loading && !m && !u} ok={(m?.policy_pass_7d ?? 0) >= 99} />
          <Tile icon={Radar} label={t("tileAnomalies")} value={String(m?.unack_anomalies ?? 0)} loading={loading && !m && !u} ok={(m?.unack_anomalies ?? 0) === 0} />
          <Tile icon={Clock} label={t("tileLastCron")} value={(m?.last_cron_at ? new Date(m.last_cron_at).toLocaleString(dtLocale) : "—")} loading={loading && !m && !u} ok={!!m?.last_cron_at} small />
        </section>

        {error && (
          <div className="mt-6 glass-strong rounded-2xl p-4 border border-destructive/40 text-destructive text-xs flex items-center justify-between gap-3 flex-wrap">
            <span className="break-keep">⚠ {error}</span>
            <LuxButton size="sm" variant="danger" onClick={() => load(true)}>{t("retry")}</LuxButton>
          </div>
        )}

        {assertStatus && (
        <section className="mt-6 glass-strong rounded-3xl p-6 border border-gold/20">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2 font-display font-black text-base break-keep">
              <FileCheck2 className="w-5 h-5 text-gold" /> {t("assertTitle")}
            </div>
            {assertStatus && (
              <span className={`text-[10px] px-2 py-1 rounded-full border font-bold tracking-[0.12em] ${
                (assertStatus.last_failed ?? 0) === 0 ? "text-secondary bg-secondary/15 border-secondary/40" : "text-destructive bg-destructive/15 border-destructive/40"
              }`}>
                {(assertStatus.last_failed ?? 0) === 0
                  ? t("assertAllPass", { n: assertStatus.last_passed ?? 0 })
                  : t("assertFail", { n: assertStatus.last_failed })}
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="glass rounded-xl p-3">
              <div className="text-[10px] text-muted-foreground">{t("lastRun")}</div>
              <div className="font-bold mt-1 tabular-nums">{assertStatus?.last_run_at ? new Date(assertStatus.last_run_at).toLocaleString(dtLocale) : "—"}</div>
            </div>
            <div className="glass rounded-xl p-3">
              <div className="text-[10px] text-muted-foreground">{t("nextRun")}</div>
              <div className="font-bold mt-1 tabular-nums">{assertStatus?.next_run_at ? new Date(assertStatus.next_run_at).toLocaleString(dtLocale) : "—"}</div>
            </div>
          </div>
        </section>
        )}

        {/* Synthetic uptime canary */}
        <section className="mt-6 glass-strong rounded-3xl p-6 border border-secondary/20">
          <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
            <div className="font-display font-black text-base break-keep">{t("canaryTitle")}</div>
            <div className="text-[10px] text-muted-foreground">{t("canaryHint")}</div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Tile icon={Activity} label={t("success24h")} value={fmtPct(u?.success_rate_24h ?? 0)} loading={loading && !m && !u} ok={(u?.success_rate_24h ?? 0) >= 99} />
            <Tile icon={Activity} label={t("success7d")} value={fmtPct(u?.success_rate_7d ?? 0)} loading={loading && !m && !u} ok={(u?.success_rate_7d ?? 0) >= 99} />
            <Tile icon={Clock} label={t("p95")} value={`${u?.p95_latency_ms_24h ?? 0} ${t("msUnit")}`} loading={loading && !m && !u} ok={(u?.p95_latency_ms_24h ?? 0) <= 1500} />
            <Tile icon={Clock} label={t("lastPing")} value={(u?.last_ping_at ? new Date(u.last_ping_at).toLocaleTimeString(dtLocale) : "—")} loading={loading && !m && !u} ok={!!u?.last_ok} small />
          </div>
        </section>

        <section className="mt-6 glass-strong rounded-3xl p-6 border border-primary/20">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2 font-display font-black text-base break-keep">
              <History className="w-5 h-5 text-primary" /> {t("historyTitle")}
            </div>
            <div className="flex gap-1.5">
              {[7, 30].map((d) => (
                <LuxChip key={d} active={historyDays === d} tone="gold" onClick={() => setHistoryDays(d as 7 | 30)}>
                  {d}{t("daysSuffix")}
                </LuxChip>
              ))}
            </div>
          </div>
          {loading && history.length === 0 ? (
            <div className="grid md:grid-cols-2 gap-4">
              <div className="glass rounded-2xl p-3">
                <div className="h-3 w-32 rounded bg-muted/40 mb-3 animate-pulse" />
                <div className="h-[180px] rounded-lg bg-muted/20 animate-pulse" />
              </div>
              <div className="glass rounded-2xl p-3">
                <div className="h-3 w-32 rounded bg-muted/40 mb-3 animate-pulse" />
                <div className="h-[180px] rounded-lg bg-muted/20 animate-pulse" />
              </div>
            </div>
          ) : history.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-xs text-muted-foreground break-keep text-center px-4">{t("noSnapshot")}</div>
          ) : (
            <TrustHistoryCharts history={history} days={historyDays} />
          )}
        </section>

        {/* 90-day heatmap + Chaos */}
        <section className="mt-6 grid md:grid-cols-3 gap-4">
          <div className="md:col-span-2 glass-strong rounded-3xl p-6 border border-primary/20">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div className="font-display font-black text-base break-keep">{t("heatTitle")}</div>
              <div className="text-[10px] text-muted-foreground break-keep">{t("heatHint")}</div>
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
                    title={`${d.date} · ${d.samples} · ${r === null ? "—" : `${r.toFixed(1)}%`}`}
                  />
                );
              })}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground">
              <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-secondary/80" /> ≥99.5%</span>
              <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-secondary/40" /> ≥95%</span>
              <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-gold/60" /> ≥80%</span>
              <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-destructive/70" /> &lt;80%</span>
              <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-muted/30" /> {t("legendNoData")}</span>
            </div>
          </div>

          <div className="glass-strong rounded-3xl p-6 border border-gold/20">
            <div className="font-display font-black text-base mb-2 break-keep">{t("chaosTitle")}</div>
            {!chaos ? (
              <div className="text-xs text-muted-foreground break-keep">{t("chaosNone")}</div>
            ) : (
              <>
                <div className={`text-3xl font-display font-black tabular-nums ${chaos.failed === 0 ? "text-secondary" : "text-destructive"}`}>
                  <Money strong className={chaos.failed === 0 ? "text-secondary" : "text-destructive"}>
                    {chaos.passed}/{chaos.total_probes}
                  </Money>
                </div>
                <div className="text-[10px] text-muted-foreground mt-1 tabular-nums">
                  {chaos.pass_rate?.toFixed(1) ?? "—"}{t("chaosPass")} · {Math.round((chaos.duration_ms ?? 0) / 1000)}s
                </div>
                <div className="mt-3 text-xs break-keep">
                  {t("chaosRanAt", { val: new Date(chaos.ran_at).toLocaleString(dtLocale) })}
                </div>
                <div className="mt-1 text-[10px] text-muted-foreground break-keep">{t("chaosSource", { val: chaos.source })}</div>
              </>
            )}
          </div>
        </section>

        <section className="mt-12 glass-strong rounded-3xl p-6 border border-primary/20 text-xs text-muted-foreground leading-relaxed">
          <div className="font-display font-black text-base text-foreground mb-2 break-keep">{t("promiseTitle")}</div>
          <ul className="space-y-1.5 list-disc list-inside break-keep">
            <li>{t("promise1")}</li>
            <li>{t("promise2")}</li>
            <li>{t("promise3")}</li>
            <li>{t("promise4")}</li>
          </ul>
          {m?.generated_at && (
            <div className="mt-4 text-[10px] tabular-nums">{t("generated", { val: new Date(m.generated_at).toLocaleString(dtLocale) })}</div>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-2 text-[10px]">
            <span className="text-muted-foreground">{t("publicApi")}</span>
            <a
              href={`https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/public-status`}
              target="_blank" rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-full glass border border-primary/30 text-primary hover:border-primary/60 transition min-h-[36px] inline-flex items-center"
            >
              GET /public-status
            </a>
            <a
              href={`https://img.shields.io/endpoint?url=https%3A%2F%2F${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co%2Ffunctions%2Fv1%2Fpublic-status%3Fformat%3Dshield`}
              target="_blank" rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-full glass border border-secondary/30 text-secondary hover:border-secondary/60 transition min-h-[36px] inline-flex items-center"
            >
              {t("shieldsBadge")}
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}

function Hero({ icon: Icon, label, value, sub, loading }: any) {
  return (
    <div className="glass-strong rounded-3xl p-6 border border-primary/30 relative overflow-hidden">
      <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-40 bg-primary" />
      <Icon className="w-6 h-6 text-primary" />
      <div className="text-[10px] text-muted-foreground tracking-widest mt-3 font-bold break-keep">{label}</div>
      {loading ? (
        <div className="h-9 w-40 mt-1 rounded bg-muted/30 animate-pulse" />
      ) : (
        <div className="font-display font-black text-3xl sm:text-4xl mt-1">
          <Money strong>{value}</Money>
        </div>
      )}
      {loading ? (
        <div className="h-3 w-32 mt-2 rounded bg-muted/20 animate-pulse" />
      ) : sub ? <div className="text-xs text-muted-foreground mt-2 break-keep tabular-nums">{sub}</div> : null}
    </div>
  );
}

function Tile({ icon: Icon, label, value, ok, small, loading }: any) {
  return (
    <div className="glass rounded-2xl p-4 border border-border min-h-[112px]">
      <div className="flex items-center gap-2">
        <Icon className={`w-4 h-4 ${ok ? "text-secondary" : "text-gold"}`} />
        <span className={`w-1.5 h-1.5 rounded-full ${loading ? "bg-muted" : ok ? "bg-secondary" : "bg-gold"} animate-pulse`} />
      </div>
      <div className="text-[10px] text-muted-foreground mt-2 break-keep">{label}</div>
      {loading ? (
        <div className={`mt-1 rounded bg-muted/30 animate-pulse ${small ? "h-3 w-20" : "h-5 w-16"}`} />
      ) : (
        <div className={`font-bold mt-1 tabular-nums ${small ? "text-xs" : "text-lg"} ${ok ? "text-money-strong" : "text-gold"}`}>{value}</div>
      )}
    </div>
  );
}
