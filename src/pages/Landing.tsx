import { Link } from "react-router-dom";
import { lazy, Suspense, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Coins, Crown, Gamepad2, Radio, ShieldCheck, Sparkles, TrendingUp, Zap } from "lucide-react";
import PhonaraTopBar from "@/components/nav/PhonaraTopBar";
import ImperialLiveWinsRail from "@/components/empire/ImperialLiveWinsRail";

const WhaleStrikeRail = lazy(() => import("@/components/empire/WhaleStrikeRail"));

/**
 * /  — v19 Imperial First Impression.
 * Hero(Warm Deep Black + Gold particles) → Imperial Live Wins Rail(full)
 *   → 4탭 프리뷰 → 빅윈 마키 → Why → Final CTA → Footer.
 * money-flow / Operator Isolation / Bundle Budget / Phase D·F 0줄 변경.
 */
export default function Landing() {
  return (
    <div className="min-h-screen bg-[#110d1a] text-foreground">
      <PhonaraTopBar />
      <Hero />
      <section className="container py-4 md:py-6">
        <ImperialLiveWinsRail variant="full" />
      </section>
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

/** 정적 골드 입자 오버레이 — JS 0, CSS radial-gradient만 */
function GoldParticles() {
  return (
    <div
      aria-hidden
      className="absolute inset-0 -z-10 opacity-[0.45] mix-blend-screen pointer-events-none"
      style={{
        backgroundImage: [
          "radial-gradient(1.5px 1.5px at 12% 22%, hsl(var(--gold)/0.7), transparent 60%)",
          "radial-gradient(1px 1px at 78% 18%, hsl(var(--gold)/0.55), transparent 60%)",
          "radial-gradient(1.5px 1.5px at 32% 70%, hsl(var(--pink)/0.5), transparent 60%)",
          "radial-gradient(1px 1px at 64% 52%, hsl(var(--gold)/0.6), transparent 60%)",
          "radial-gradient(2px 2px at 88% 78%, hsl(var(--gold)/0.55), transparent 60%)",
          "radial-gradient(1px 1px at 22% 88%, hsl(var(--gold)/0.5), transparent 60%)",
          "radial-gradient(1.5px 1.5px at 52% 12%, hsl(var(--pink)/0.45), transparent 60%)",
          "radial-gradient(1px 1px at 8% 58%, hsl(var(--gold)/0.55), transparent 60%)",
        ].join(", "),
      }}
    />
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Warm Deep Black + Imperial halos */}
      <div className="absolute inset-0 -z-20 bg-[#110d1a]" />
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div className="absolute top-[-160px] left-[-120px] w-[560px] h-[560px] rounded-full bg-[hsl(var(--gold)/.22)] blur-[160px]" />
        <div className="absolute bottom-[-180px] right-[-120px] w-[560px] h-[560px] rounded-full bg-[hsl(var(--pink)/.18)] blur-[160px]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--gold)/.55)] to-transparent" />
      </div>
      <GoldParticles />

      <div className="container min-h-[calc(100svh-3.5rem)] md:min-h-[calc(100svh-4rem)] flex flex-col items-center justify-center text-center py-12 md:py-16">
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[hsl(var(--gold)/.45)] bg-[hsl(var(--gold)/.08)] text-[10px] font-black tracking-[0.32em] text-[hsl(var(--gold))] uppercase"
        >
          <Crown className="w-3 h-3" /> The Imperial World
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.05 }}
          className="mt-6 font-imperial text-[36px] leading-[1.05] sm:text-5xl md:text-6xl lg:text-7xl tracking-[0.04em] text-foreground"
        >
          <span className="block">
            <span className="bg-gradient-to-r from-[hsl(var(--gold))] via-[hsl(var(--gold))] to-[hsl(var(--pink))] bg-clip-text text-transparent drop-shadow-[0_4px_24px_hsl(var(--gold)/0.35)]">
              0원
            </span>
            <span className="text-foreground">으로 시작해서</span>
          </span>
          <span className="block mt-2 sm:mt-3">
            <span className="text-foreground">매일 돈을 버는 </span>
            <span className="bg-gradient-to-r from-[hsl(var(--gold))] to-[hsl(var(--pink))] bg-clip-text text-transparent drop-shadow-[0_4px_24px_hsl(var(--pink)/0.35)]">
              제국
            </span>
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.55, delay: 0.18 }}
          className="mt-6 text-base sm:text-lg md:text-xl max-w-2xl mx-auto leading-relaxed font-semibold text-[hsl(var(--gold)/0.92)]"
        >
          지금 가입하면 첫 입금 <span className="text-[hsl(var(--gold))] font-black">10,000 PHON</span> 즉시 지급<br className="hidden sm:inline" />
          <span className="text-foreground/80 font-medium"> + 실시간으로 전 세계 황제들의 승전보를 확인하세요</span>
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.28 }}
          className="mt-9 flex flex-col items-center gap-3"
        >
          <Link
            to="/auth?mode=signup"
            className="pulse-halo group inline-flex items-center gap-2.5 h-16 px-8 rounded-2xl bg-gradient-to-r from-[hsl(var(--gold))] via-[hsl(var(--gold))] to-[hsl(var(--pink))] text-background font-black text-base md:text-lg press shadow-[0_24px_72px_-18px_hsl(var(--gold)/0.85)] glow-imperial"
          >
            <Crown className="w-5 h-5" />
            지금 무료로 황제가 되기
            <span className="ml-1 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-background/25 text-[11px] font-black tracking-wide">
              +10,000 PHON
            </span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <div className="text-[12px] text-[hsl(var(--gold)/0.75)] flex items-center gap-1.5 font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            가입 즉시 무료 PHON · 신용카드 필요 없음 · 30초 안에 시작
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-10 flex items-center gap-4 text-[12px] text-foreground/70"
        >
          <span className="inline-flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> 실시간 출금 중</span>
          <span className="text-[hsl(var(--gold)/0.5)]">·</span>
          <span className="font-semibold">한국 1위 가상세계 플랫폼</span>
        </motion.div>

        {/* 오늘 누적 — 작게 */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.7 }}
          className="mt-6 text-[12px] text-foreground/55"
        >
          오늘 사용자 평균 수익 <span className="font-mono font-black text-[hsl(var(--gold))]"><AnimatedEarning />원</span>
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
  { icon: Coins, title: "무료로 돈 버는 곳", line: "가입만 해도 보너스 PHON. 출석·미션으로 매일 벌어요." },
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
                <Icon className="w-4 h-4" />
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
      <div className="relative overflow-hidden rounded-3xl border border-[hsl(var(--gold)/.35)] p-8 md:p-14 text-center bg-gradient-to-br from-[#1a1320] to-[#110d1a]">
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[420px] h-[420px] rounded-full bg-[hsl(var(--gold)/.22)] blur-[120px] -z-0" />
        <div className="relative">
          <h3 className="font-imperial text-3xl md:text-5xl text-foreground leading-tight tracking-[0.04em]">
            지금 가입하면<br className="sm:hidden" />
            <span className="bg-gradient-to-r from-[hsl(var(--gold))] to-[hsl(var(--pink))] bg-clip-text text-transparent"> +10,000 PHON</span> 즉시 지급
          </h3>
          <p className="mt-3 text-sm md:text-base text-foreground/70">
            한 번 들어오면 헤어나기 힘들어요. 진심으로요.
          </p>
          <Link
            to="/auth?mode=signup"
            className="pulse-halo mt-7 inline-flex items-center gap-2 h-14 px-7 rounded-2xl bg-gradient-to-r from-[hsl(var(--gold))] to-[hsl(var(--pink))] text-background font-black text-base md:text-lg press shadow-[0_18px_60px_-18px_hsl(var(--gold)/.8)] glow-imperial"
          >
            <Crown className="w-5 h-5" />
            지금 무료로 황제가 되기 <ArrowRight className="w-4 h-4" />
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
