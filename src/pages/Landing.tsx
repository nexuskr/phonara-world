import { Link } from "react-router-dom";
import { lazy, Suspense, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Coins, Gamepad2, Radio, ShieldCheck, Sparkles, TrendingUp, Zap } from "lucide-react";
import PhonaraTopBar from "@/components/nav/PhonaraTopBar";

const WhaleStrikeRail = lazy(() => import("@/components/empire/WhaleStrikeRail"));

/**
 * /  — v14.0 신규 랜딩.
 * 5섹션 cinematic: Hero / 4탭 프리뷰 / 실시간 빅윈 / Why / 최종 CTA.
 * 비로그인도 접근 가능. 5초 안에 "무료로 돈 버는 가상세계"라고 답할 수 있어야 통과.
 */
export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PhonaraTopBar />
      <Hero />
      <TabPreview />
      <LiveBand />
      <Why />
      <FinalCTA />
      <Footer />
    </div>
  );
}

function AnimatedEarning() {
  const target = 4800;
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf = 0; const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / 1200);
      setN(Math.floor(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <span className="tabular-nums">{n.toLocaleString()}</span>;
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-card/60" />
        <div className="absolute top-[-160px] left-[-120px] w-[520px] h-[520px] rounded-full bg-[hsl(var(--gold)/.18)] blur-[140px]" />
        <div className="absolute bottom-[-160px] right-[-100px] w-[520px] h-[520px] rounded-full bg-[hsl(var(--pink)/.18)] blur-[140px]" />
      </div>

      <div className="container min-h-[calc(100svh-3.5rem)] md:min-h-[calc(100svh-4rem)] flex flex-col items-center justify-center text-center py-12">
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[hsl(var(--gold)/.4)] bg-card/50 text-[10px] font-bold tracking-[0.28em] text-[hsl(var(--gold))] uppercase"
        >
          <Sparkles className="w-3 h-3" /> THE DIGITAL WORLD
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.05 }}
          className="mt-5 font-imperial text-[34px] leading-[1.08] sm:text-5xl md:text-6xl lg:text-7xl tracking-tight text-foreground"
        >
          오늘도{" "}
          <span className="bg-gradient-to-r from-[hsl(var(--gold))] to-[hsl(var(--pink))] bg-clip-text text-transparent">
            <AnimatedEarning />원
          </span>{" "}
          벌었어요
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.55, delay: 0.15 }}
          className="mt-4 text-sm sm:text-base md:text-lg text-muted-foreground max-w-xl mx-auto"
        >
          부업하면서 게임도 하고 코인 트레이딩까지.<br className="hidden sm:inline" />
          한국에서 제일 쉽게 돈 버는 가상세계.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.22 }}
          className="mt-7 flex flex-col items-center gap-3"
        >
          <Link
            to="/auth?mode=signup"
            className="group inline-flex items-center gap-2 h-14 px-7 rounded-2xl bg-gradient-to-r from-[hsl(var(--gold))] to-[hsl(var(--pink))] text-background font-black text-base md:text-lg press shadow-[0_18px_60px_-18px_hsl(var(--gold)/.7)]"
          >
            지금 무료로 시작하기
            <span className="ml-1 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-background/20 text-[11px] font-black">
              +500 PHON
            </span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            가입 즉시 무료 PHON · 신용카드 필요 없음
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.45 }}
          className="mt-10 flex items-center gap-4 text-[11px] text-muted-foreground"
        >
          <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> 실시간 출금 중</span>
          <span>·</span>
          <span>한국 1위 가상세계 플랫폼</span>
        </motion.div>
      </div>
    </section>
  );
}

const TABS = [
  { to: "/earn", icon: Coins, title: "수익", line: "출석 · 미션 · 친구초대로 무료 PHON", accent: "from-amber-500/25 to-yellow-500/10 border-amber-500/40" },
  { to: "/games", icon: Gamepad2, title: "게임", line: "슬롯 12종 · 룰렛 · 크래쉬", accent: "from-pink-500/25 to-rose-500/10 border-pink-500/40" },
  { to: "/trade", icon: TrendingUp, title: "투자", line: "BTC·ETH 가격 베팅 · 데모 연습", accent: "from-emerald-500/25 to-teal-500/10 border-emerald-500/40" },
  { to: "/live", icon: Radio, title: "실시간", line: "지금 누가 얼마 벌고 있나", accent: "from-violet-500/25 to-fuchsia-500/10 border-violet-500/40" },
];

function TabPreview() {
  return (
    <section className="container py-12 md:py-20">
      <div className="text-center mb-6">
        <div className="text-[10px] tracking-[0.3em] font-black text-[hsl(var(--gold))] uppercase mb-2">4가지 모드</div>
        <h2 className="font-imperial text-2xl md:text-4xl text-foreground">한 화면에 다 있어요</h2>
      </div>
      <div className="flex md:grid gap-3 md:grid-cols-4 overflow-x-auto md:overflow-visible snap-x snap-mandatory -mx-5 px-5 md:mx-0 md:px-0">
        {TABS.map((t, i) => {
          const Icon = t.icon;
          return (
            <motion.div
              key={t.to}
              initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.35, delay: i * 0.06 }}
              className="snap-start min-w-[78%] md:min-w-0"
            >
              <Link
                to={t.to}
                className={`block h-full rounded-2xl border bg-gradient-to-br ${t.accent} p-5 press transition hover:border-primary/60`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[11px] tracking-[0.3em] font-black text-foreground/70 uppercase mb-1">{t.title}</div>
                    <div className="font-imperial text-lg text-foreground leading-tight">{t.line}</div>
                  </div>
                  <div className="shrink-0 w-11 h-11 rounded-xl bg-background/50 border border-border/40 flex items-center justify-center text-[hsl(var(--gold))]">
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-5 inline-flex items-center gap-1 text-[11px] font-bold text-[hsl(var(--gold))]">
                  들어가기 <ArrowRight className="w-3 h-3" />
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

function LiveBand() {
  return (
    <section className="container py-6">
      <Suspense fallback={null}>
        <WhaleStrikeRail compact />
      </Suspense>
    </section>
  );
}

const WHY = [
  { icon: Coins, title: "무료로 돈 버는 곳", line: "가입만 해도 500 PHON. 출석·미션으로 매일 벌어요." },
  { icon: Zap, title: "부업 + 게임 한 곳", line: "잠깐 쉴 때 슬롯 한판, 친구초대로 보너스까지." },
  { icon: Sparkles, title: "헤어날 수 없는 재미", line: "VIP, 길드, 실시간 빅윈. 매일 들어오게 되는 세계." },
];
function Why() {
  return (
    <section className="container py-14 md:py-24">
      <div className="text-center mb-8">
        <div className="text-[10px] tracking-[0.3em] font-black text-[hsl(var(--pink))] uppercase mb-2">WHY PHONARA</div>
        <h2 className="font-imperial text-2xl md:text-4xl text-foreground">왜 다들 들어와 있을까요</h2>
      </div>
      <div className="grid sm:grid-cols-3 gap-3">
        {WHY.map((w, i) => {
          const Icon = w.icon;
          return (
            <motion.div
              key={w.title}
              initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.35, delay: i * 0.05 }}
              className="rounded-2xl border border-border/50 bg-card/40 p-5"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[hsl(var(--gold)/.2)] to-[hsl(var(--pink)/.15)] border border-border/50 flex items-center justify-center text-[hsl(var(--gold))] mb-3">
                <Icon className="w-4.5 h-4.5" />
              </div>
              <div className="font-imperial text-lg text-foreground">{w.title}</div>
              <div className="text-sm text-muted-foreground mt-1 leading-relaxed">{w.line}</div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="container py-16 md:py-24">
      <div className="relative overflow-hidden rounded-3xl border border-[hsl(var(--gold)/.3)] p-8 md:p-14 text-center bg-gradient-to-br from-card/80 to-background">
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[420px] h-[420px] rounded-full bg-[hsl(var(--gold)/.18)] blur-[120px] -z-0" />
        <div className="relative">
          <h3 className="font-imperial text-3xl md:text-5xl text-foreground leading-tight">
            지금 가입하면<br className="sm:hidden" />
            <span className="bg-gradient-to-r from-[hsl(var(--gold))] to-[hsl(var(--pink))] bg-clip-text text-transparent"> +500 PHON</span> 즉시 지급
          </h3>
          <p className="mt-3 text-sm md:text-base text-muted-foreground">
            한 번 들어오면 헤어나기 힘들어요. 진심으로요.
          </p>
          <Link
            to="/auth?mode=signup"
            className="mt-7 inline-flex items-center gap-2 h-14 px-7 rounded-2xl bg-gradient-to-r from-[hsl(var(--gold))] to-[hsl(var(--pink))] text-background font-black text-base md:text-lg press shadow-[0_18px_60px_-18px_hsl(var(--gold)/.7)]"
          >
            무료로 시작하기 <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
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
      © {new Date().getFullYear()} PHONARA.WORLD
    </footer>
  );
}
