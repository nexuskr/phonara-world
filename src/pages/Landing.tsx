import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Radio, ShieldCheck, Sparkles, Timer, Users } from "lucide-react";
import PhonaraTopBar from "@/components/nav/PhonaraTopBar";
import ImperialLogo from "@/components/brand/ImperialLogo";
import { setPracticeMode } from "@/lib/practiceMode";

/**
 * Landing `/` — PR-P1-B Hero 재설계.
 * 3초 안에 이해: "오늘 사람들이 가장 많이 참여 중인 실시간 리워드 챌린지".
 * Primary: 무료 시작하기 → /auth?mode=signup
 * Secondary: 체험 모드 → Practice ON + /home
 */
export default function Landing() {
  return (
    <div className="min-h-screen bg-[#110d1a] text-foreground">
      <PhonaraTopBar />
      <Hero />
      <TrustLine />
      <Footer />
    </div>
  );
}

function Hero() {
  const nav = useNavigate();
  const startPractice = () => {
    setPracticeMode(true);
    nav("/home");
  };

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 -z-20 bg-[#110d1a]" />
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div className="absolute top-[-160px] left-[-120px] w-[520px] h-[520px] rounded-full bg-[hsl(var(--gold)/.18)] blur-[160px]" />
        <div className="absolute bottom-[-180px] right-[-120px] w-[520px] h-[520px] rounded-full bg-[hsl(var(--pink)/.14)] blur-[160px]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--gold)/.55)] to-transparent" />
      </div>

      <div className="container min-h-[calc(100svh-3.5rem)] md:min-h-[calc(100svh-4rem)] flex flex-col items-center justify-center text-center py-12 md:py-16">
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[hsl(var(--gold)/.45)] bg-[hsl(var(--gold)/.08)] text-[10px] font-black tracking-[0.32em] text-[hsl(var(--gold))] uppercase"
        >
          <Radio className="w-3 h-3" /> LIVE NOW
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.05 }}
          className="mt-6 font-imperial text-[34px] leading-[1.12] sm:text-5xl md:text-6xl lg:text-7xl tracking-[0.02em] text-foreground text-shadow-imperial-xl max-w-4xl"
        >
          <span className="block">오늘 사람들이 가장 많이 참여 중인</span>
          <span className="block mt-1 sm:mt-2">
            <span className="bg-gradient-to-r from-[hsl(var(--gold))] via-[hsl(var(--gold))] to-[hsl(var(--pink))] bg-clip-text text-transparent drop-shadow-[0_6px_28px_hsl(var(--gold)/0.65)]">
              실시간 리워드 챌린지
            </span>
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.18 }}
          className="mt-6 text-base sm:text-lg md:text-xl max-w-2xl mx-auto leading-relaxed font-semibold text-foreground/90"
        >
          무료 예측 · 무료돈벌기 · 실시간 보상 · PHON 받기
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-9 flex flex-col sm:flex-row items-center gap-3"
        >
          <Link
            to="/auth?mode=signup&next=/dashboard"
            className="group inline-flex items-center justify-center gap-2 min-h-[56px] px-8 rounded-2xl bg-gradient-to-r from-[hsl(var(--gold))] via-[hsl(var(--gold))] to-[hsl(var(--pink))] text-background font-black text-base md:text-lg press glow-pink-xl hover:scale-[1.03] transition-transform w-full sm:w-auto"
            style={{ touchAction: "manipulation" }}
          >
            <Sparkles className="w-5 h-5" />
            무료 시작하기
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <button
            type="button"
            onClick={startPractice}
            className="inline-flex items-center justify-center gap-2 min-h-[56px] px-7 rounded-2xl border border-[hsl(var(--gold)/.45)] bg-card/40 text-foreground font-bold text-base hover:bg-[hsl(var(--gold)/.08)] hover:border-[hsl(var(--gold)/.85)] transition-colors w-full sm:w-auto press"
            style={{ touchAction: "manipulation" }}
          >
            체험 모드
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.45 }}
          className="mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[12px] sm:text-[13px] text-foreground/75 font-medium"
        >
          <span className="inline-flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-[hsl(var(--gold))]" />
            지금 <span className="text-foreground font-bold tabular-nums">실시간 참여 중</span>
          </span>
          <span className="hidden sm:inline text-foreground/30">·</span>
          <span className="inline-flex items-center gap-1.5">
            <Timer className="w-3.5 h-3.5 text-emerald-400" />
            평균 지급 <span className="text-foreground font-bold">3분 이내</span>
          </span>
          <span className="hidden sm:inline text-foreground/30">·</span>
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            가입 즉시 PHON 지급
          </span>
        </motion.div>
      </div>
    </section>
  );
}

function TrustLine() {
  return (
    <section className="container py-10 md:py-14">
      <div className="grid sm:grid-cols-3 gap-3">
        {[
          { t: "무료 예측", d: "리스크 0원으로 매일 PHON 적립" },
          { t: "실시간 보상", d: "결과는 즉시 — 평균 3분 이내 지급" },
          { t: "환불·손실 보호", d: "초기 7일 보호 기간 PHON 환급" },
        ].map((w) => (
          <div
            key={w.t}
            className="rounded-2xl border border-[hsl(var(--gold)/0.3)] bg-card/40 p-5"
          >
            <div className="font-imperial text-lg text-foreground">{w.t}</div>
            <div className="text-sm text-muted-foreground mt-1 leading-relaxed">{w.d}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="container pb-10 text-center text-[11px] text-muted-foreground">
      <div className="flex items-center justify-center gap-3 mb-2">
        <Link to="/legal/terms" className="hover:text-foreground transition">이용약관</Link>
        <span>·</span>
        <Link to="/legal/privacy" className="hover:text-foreground transition">개인정보</Link>
        <span>·</span>
        <Link to="/trust" className="hover:text-foreground transition">신뢰</Link>
        <span>·</span>
        <Link to="/support" className="hover:text-foreground transition">고객센터</Link>
      </div>
      <div className="flex items-center justify-center gap-2">
        <span>© {new Date().getFullYear()}</span>
        <ImperialLogo to="" size="sm" withWordmark withWorld ariaLabel="PHONARA.WORLD" />
      </div>
    </footer>
  );
}
