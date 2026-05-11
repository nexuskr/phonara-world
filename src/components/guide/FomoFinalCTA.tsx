import { Link } from "react-router-dom";
import { Flame, ArrowRight } from "lucide-react";
import DepositCTA from "@/components/onboarding/DepositCTA";

/**
 * Phase 4 — 씬7 FINAL CTA.
 * 50,000원 1탭 첫입금 직행 + 보조 패키지 보기 링크.
 */
export default function FomoFinalCTA() {
  return (
    <section className="snap-start min-h-[calc(100vh-56px)] flex flex-col justify-center relative overflow-hidden px-5 py-10 bg-gradient-to-b from-background via-primary/10 to-gold/10">
      <div className="relative max-w-md mx-auto w-full text-center">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full glass border border-gold/40 text-[10px] font-black tracking-[0.3em] text-gold mb-4">
          <Flame className="w-3 h-3 animate-pulse" /> 마지막 한 걸음
        </div>

        <h2 className="font-imperial text-3xl sm:text-4xl leading-tight break-keep mb-3">
          50,000원 한 번이면<br />
          <span className="text-gradient-gold">제국이 시작됩니다</span>
        </h2>

        <p className="text-sm text-muted-foreground mb-7 break-keep">
          평균 출금 23분 · 19+ 본인인증 · 운영자 무손실 인장
        </p>

        <DepositCTA size="lg" />

        <Link
          to="/packages?focus=easy_starter"
          className="press mt-3 w-full inline-flex items-center justify-center gap-2 min-h-[52px] rounded-2xl glass-strong border border-border text-sm font-bold"
        >
          패키지 전체 보기 <ArrowRight className="w-4 h-4" />
        </Link>

        <div className="mt-6 text-[10px] text-muted-foreground tracking-widest break-keep">
          본 서비스는 미션 보상형 리워드 플랫폼이며, 투자/도박이 아닙니다.
        </div>
      </div>
    </section>
  );
}
