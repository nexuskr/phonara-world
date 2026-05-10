import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, Globe, ArrowRight, Activity } from "lucide-react";
import LivePulseStrip from "@/components/landing/LivePulseStrip";
import LivePayoutSlaBadge from "@/components/landing/LivePayoutSlaBadge";
import GlobalPresenceMap from "@/components/landing/GlobalPresenceMap";
import Particles from "@/components/Particles";

/**
 * Public marketing-grade live snapshot page.
 * Aggregates: anonymized 24h pulse, 30d withdrawal SLA, global presence map.
 * Designed to be the URL shared on SNS / press / investors.
 */
export default function GlobalLive() {
  useEffect(() => {
    document.title = "Phonara — Live Global Pulse";
    const meta = document.querySelector('meta[name="description"]');
    const desc = "Real-time anonymized snapshot of Phonara: 24h payouts, 30-day SLA, and global presence across 14 regions.";
    if (meta) meta.setAttribute("content", desc);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground relative">
      <Particles />
      <div className="relative z-10 container py-8 sm:py-12 space-y-6">
        {/* Hero */}
        <header className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 glass-strong rounded-full px-3 py-1 border border-secondary/40">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary"></span>
            </span>
            <span className="text-[10px] tracking-[0.25em] font-black uppercase text-secondary">LIVE · 실시간</span>
          </div>
          <h1 className="font-display font-black text-3xl sm:text-5xl mt-4 leading-tight">
            지금 이 순간, <span className="text-money-strong">Phonara</span>는<br />
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              지구 전역에서 작동 중입니다
            </span>
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-4 break-keep">
            아무것도 숨기지 않습니다. 익명화된 24시간 활동·30일 출금 SLA·글로벌 거점을 한 화면에 공개합니다.
          </p>
        </header>

        {/* Live stats column */}
        <section className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1 space-y-3">
            <LivePulseStrip />
            <LivePayoutSlaBadge />
            <Link
              to="/trust"
              className="block glass-strong rounded-2xl px-4 py-3 border border-border/50 hover:border-primary/60 transition group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-secondary" />
                  <span className="text-xs font-black tracking-wide">전체 Trust 리포트</span>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition" />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                cron uptime · audit pass rate · 정책 단언 모두 공개
              </p>
            </Link>
            <Link
              to="/status"
              className="block glass-strong rounded-2xl px-4 py-3 border border-border/50 hover:border-primary/60 transition group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" />
                  <span className="text-xs font-black tracking-wide">Status & Uptime</span>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition" />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                90일 uptime heatmap · 인시던트 0 공개
              </p>
            </Link>
          </div>

          {/* Global map */}
          <div className="lg:col-span-2">
            <GlobalPresenceMap />
          </div>
        </section>

        {/* CTA */}
        <section className="rounded-3xl p-6 sm:p-8 border border-primary/40 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent text-center glow-imperial">
          <Globe className="w-8 h-8 text-secondary mx-auto" />
          <h2 className="font-display font-black text-xl sm:text-2xl mt-3">
            검증된 신뢰. 0원의 마케팅. 24시간의 펄스.
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-2 max-w-xl mx-auto break-keep">
            이 모든 수치는 자동으로 갱신되며, 누구도 임의로 조작할 수 없습니다. 검증 가능한 신뢰가 1위 플랫폼의 기준입니다.
          </p>
          <div className="mt-5 flex items-center justify-center gap-3 flex-wrap">
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 bg-gradient-primary text-primary-foreground px-5 py-3 rounded-2xl font-black text-sm glow-primary"
            >
              지금 참여하기 <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/"
              className="inline-flex items-center gap-2 glass-strong px-5 py-3 rounded-2xl font-bold text-sm border border-border/60 hover:border-primary/60 transition"
            >
              홈으로
            </Link>
          </div>
        </section>

        <footer className="text-center text-[10px] text-muted-foreground py-6">
          모든 수치는 익명화된 집계이며, 개인 식별 정보는 절대 노출하지 않습니다.
        </footer>
      </div>
    </div>
  );
}
