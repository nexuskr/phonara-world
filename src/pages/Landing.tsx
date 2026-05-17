import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Coins, Crown, Radio, ShieldCheck, Sparkles } from "lucide-react";
import PhonaraTopBar from "@/components/nav/PhonaraTopBar";

/**
 * /  — v19 Phase 0-R TRUE Clean Rebuild.
 * Hero(Imperial vignette) → Trust 3-line → Footer.
 * 라이브 마키 / pulse-halo / 광역 글로우 전부 제거.
 */
export default function Landing() {
  return (
    <div className="min-h-screen bg-[#110d1a] text-foreground">
      <PhonaraTopBar />
      <Hero />
      <Trust />
      <Footer />
    </div>
  );
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
    <section className="imperial-vignette relative overflow-hidden">
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
          className="mt-6 font-imperial text-[40px] leading-[1.04] sm:text-6xl md:text-7xl lg:text-8xl tracking-[0.04em] text-foreground text-shadow-imperial-xl"
        >
          <span className="block">
            <span className="bg-gradient-to-r from-[hsl(var(--gold))] via-[hsl(var(--gold))] to-[hsl(var(--pink))] bg-clip-text text-transparent drop-shadow-[0_6px_32px_hsl(var(--gold)/0.7)]">
              0원
            </span>
            <span className="text-foreground">으로 시작해서</span>
          </span>
          <span className="block mt-2 sm:mt-3">
            <span className="text-foreground">매일 돈을 버는 </span>
            <span className="bg-gradient-to-r from-[hsl(var(--gold))] to-[hsl(var(--pink))] bg-clip-text text-transparent drop-shadow-[0_6px_32px_hsl(var(--pink)/0.7)]">
              제국
            </span>
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.55, delay: 0.18 }}
          className="mt-7 text-lg sm:text-xl md:text-2xl max-w-3xl mx-auto leading-relaxed font-bold text-foreground/95"
        >
          지금 이 순간에도 <span className="text-[hsl(var(--gold))] drop-shadow-[0_0_18px_hsl(var(--gold)/0.55)]">수만 명의 황제들</span>이<br className="hidden sm:inline" />
          <span> 실시간으로 수익을 창출하고 있습니다</span>
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.32 }}
          className="mt-9 flex flex-col items-center gap-3"
        >
          <Link
            to="/auth?mode=signup"
            className="group imperial-jackpot-breathe inline-flex items-center gap-2.5 h-[64px] px-9 rounded-2xl bg-gradient-to-r from-[hsl(var(--gold))] via-[hsl(var(--gold))] to-[hsl(var(--pink))] text-background font-black text-lg md:text-xl press glow-pink-xl hover:scale-[1.04] transition-transform"
          >
            <Crown className="w-5 h-5" />
            지금 무료로 황제가 되기
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <div className="text-[12px] sm:text-[13px] text-[hsl(var(--gold)/0.85)] flex items-center gap-1.5 font-bold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            가입 즉시 10,000 PHON 지급 · 폐하의 자리는 언제나 열려 있습니다
          </div>
        </motion.div>
      </div>
    </section>
  );
}

const TRUST = [
  { icon: Coins, title: "가입 즉시 +10,000 PHON", line: "회원가입만으로 폐하의 첫 보상이 즉시 입금됩니다." },
  { icon: ShieldCheck, title: "환불·손실 보호", line: "초기 7일 보호 기간 동안 순손실의 일부를 PHON으로 환급합니다." },
  { icon: Radio, title: "라이브 출금 중", line: "지금 이 순간에도 황제들의 출금이 실시간으로 처리되고 있습니다." },
];

function Trust() {
  return (
    <section className="container py-14 md:py-20">
      <div className="text-center mb-8">
        <div className="text-[10px] tracking-[0.3em] font-black text-[hsl(var(--gold))] uppercase mb-2">Imperial Trust</div>
        <h2 className="font-imperial text-2xl md:text-4xl text-foreground">폐하를 위한 약속</h2>
      </div>
      <div className="grid sm:grid-cols-3 gap-3">
        {TRUST.map((w, i) => {
          const Icon = w.icon;
          return (
            <motion.div
              key={w.title}
              initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.35, delay: i * 0.05 }}
              className="imperial-card-hover imperial-corner-shine rounded-2xl border border-[hsl(var(--gold)/0.35)] bg-card/40 p-5 relative overflow-hidden"
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
      <div className="mt-10 text-center">
        <Link
          to="/auth?mode=signup"
          className="inline-flex items-center gap-2 h-14 px-7 rounded-2xl bg-gradient-to-r from-[hsl(var(--gold))] to-[hsl(var(--pink))] text-background font-black text-base md:text-lg press shadow-[0_14px_40px_-18px_hsl(var(--gold)/.7)]"
        >
          <Sparkles className="w-5 h-5" />
          지금 무료로 황제가 되기 <ArrowRight className="w-4 h-4" />
        </Link>
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
