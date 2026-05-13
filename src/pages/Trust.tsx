import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ShieldCheck, Banknote, Activity, FileText, Scale, AlertTriangle, Radio } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LoadingList } from "@/components/ui/loading-state";
import LiveWithdrawalsTable from "@/components/empire/LiveWithdrawalsTable";
import TrustGuaranteeBadges from "@/components/empire/TrustGuaranteeBadges";
import RefundRequestPanel from "@/components/empire/RefundRequestPanel";
import LossProtectionGate from "@/components/empire/LossProtectionGate";

type PayoutStats = {
  window: string;
  generated_at: string;
  requested_count: number;
  requested_amount: number;
  completed_count: number;
  completed_amount: number;
  pending_count: number;
  median_minutes: number;
  p95_minutes: number;
};

const fmtKRW = (n: number) =>
  new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW", maximumFractionDigits: 0 }).format(n || 0);

export default function Trust() {
  const [stats, setStats] = useState<PayoutStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Phonara Trust Center — 신뢰의 24시간";
    const meta = document.querySelector('meta[name="description"]');
    const desc = "Phonara Trust Center: 최근 24시간 출금 처리 현황, 정산 통계, 약관·개인정보·리스크 고지를 한 곳에서 확인하세요.";
    if (meta) meta.setAttribute("content", desc);
    else {
      const el = document.createElement("meta"); el.name = "description"; el.content = desc;
      document.head.appendChild(el);
    }
    let alive = true;
    (async () => {
      const { data, error } = await supabase.rpc("get_payout_ops_stats_24h");
      if (!alive) return;
      if (!error && data) setStats(data as unknown as PayoutStats);
      setLoading(false);
    })();
    const id = setInterval(async () => {
      const { data } = await supabase.rpc("get_payout_ops_stats_24h");
      if (alive && data) setStats(data as unknown as PayoutStats);
    }, 60_000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="container py-6 flex items-center justify-between">
        <Link to="/" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 min-h-[36px]">
          <ArrowLeft className="w-3.5 h-3.5" /> 홈
        </Link>
        <Link to="/status" className="text-xs text-primary inline-flex items-center gap-1 min-h-[36px] px-2">
          <Activity className="w-3.5 h-3.5" /> 시스템 상태
        </Link>
      </header>

      <main className="container max-w-3xl pb-20">
        <h1 className="font-imperial font-black text-3xl sm:text-5xl text-center tracking-[0.04em]">
          Trust Center
        </h1>
        <p className="text-center text-xs text-muted-foreground mt-2 break-keep">
          Phonara는 모든 출금 운영 데이터를 실시간으로 공개합니다.
        </p>

        <section className="mt-10">
          <div className="flex items-center gap-2 mb-3">
            <Banknote className="w-4 h-4 text-money-strong" />
            <h2 className="font-imperial font-bold text-lg tracking-[0.02em]">최근 24시간 출금 운영</h2>
          </div>
          {loading ? (
            <LoadingList rows={3} />
          ) : !stats ? (
            <div className="glass rounded-2xl p-4 text-xs text-muted-foreground">통계를 불러오지 못했습니다.</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Cell label="신청 건수" value={`${stats.requested_count.toLocaleString("ko-KR")}건`} />
              <Cell label="신청 금액" value={fmtKRW(stats.requested_amount)} />
              <Cell label="완료 건수" value={`${stats.completed_count.toLocaleString("ko-KR")}건`} />
              <Cell label="완료 금액" value={fmtKRW(stats.completed_amount)} highlight />
              <Cell label="대기 중" value={`${stats.pending_count.toLocaleString("ko-KR")}건`} />
              <Cell label="처리 중간값" value={`${stats.median_minutes}분`} />
              <Cell label="처리 P95" value={`${stats.p95_minutes}분`} />
            </div>
          )}
          {stats && (
            <div className="mt-3 text-[10px] text-muted-foreground text-right tabular-nums">
              {new Date(stats.generated_at).toLocaleString("ko-KR")} 기준
            </div>
          )}
        </section>

        <section className="mt-10">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="w-4 h-4 text-secondary" />
            <h2 className="font-imperial font-bold text-lg tracking-[0.02em]">법적 문서</h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <DocLink to="/legal/terms" icon={<FileText className="w-4 h-4" />} title="이용약관" desc="서비스 이용 규칙" />
            <DocLink to="/legal/privacy" icon={<Scale className="w-4 h-4" />} title="개인정보 처리방침" desc="데이터 수집·보관" />
            <DocLink to="/legal/risk" icon={<AlertTriangle className="w-4 h-4" />} title="리스크 고지" desc="변동성·과몰입 경고" />
          </div>
        </section>

        <p className="mt-12 text-center text-[10px] text-muted-foreground break-keep">
          본 서비스는 금융 자문/투자 권유가 아닙니다. 모든 보상은 시스템 내 자산입니다.
        </p>
      </main>
    </div>
  );
}

function Cell({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="glass rounded-2xl p-4 text-center">
      <div className="text-[10px] text-muted-foreground break-keep">{label}</div>
      <div className={`font-imperial font-bold text-base sm:text-lg mt-1 tabular-nums ${highlight ? "text-money-strong" : "text-foreground"}`}>
        {value}
      </div>
    </div>
  );
}

function DocLink({ to, icon, title, desc }: { to: string; icon: React.ReactNode; title: string; desc: string }) {
  return (
    <Link to={to} className="glass rounded-2xl p-4 hover:bg-muted/30 transition-colors block">
      <div className="flex items-center gap-2 text-secondary">{icon}<span className="font-bold text-sm">{title}</span></div>
      <div className="mt-1 text-[11px] text-muted-foreground break-keep">{desc}</div>
    </Link>
  );
}
