import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ShieldCheck, TrendingUp, Activity, Crown, Clock, Users, FileCheck2, Radar, ArrowLeft, RefreshCw } from "lucide-react";
import Particles from "@/components/Particles";

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

export default function Trust() {
  const [m, setM] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data } = await supabase.rpc("public_trust_metrics");
    setM((data as Metrics) ?? null);
    setLoading(false);
  }
  useEffect(() => { void load(); }, []);

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
