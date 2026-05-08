import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ShieldCheck,
  Zap,
  Lock,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Crown,
  Cpu,
  Users,
  Heart,
} from "lucide-react";
import Particles from "@/components/Particles";
import PayoutTicker from "@/components/PayoutTicker";
import { useOnline, useTotalPayout, useTodayPayout, useMembers } from "@/components/LiveStats.tsx";
import { useAuthReady } from "@/hooks/use-auth-ready";
import EmpireFoundingCounter from "@/components/EmpireFoundingCounter";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import throneBg from "@/assets/command-throne-bg.jpg";
import { track } from "@/lib/analytics";

// KST 자정 기준 경과 비율로 오늘 신규 가입자 추정 (베이스 1,180 + 시간대별 가중)
function computeTodaySignups(): number {
  const now = new Date();
  const kstNow = new Date(now.getTime() + (9 * 60 - now.getTimezoneOffset()) * 60_000);
  const startKST = new Date(kstNow); startKST.setUTCHours(0, 0, 0, 0);
  const elapsedMin = (kstNow.getTime() - startKST.getTime()) / 60_000;
  const dayFraction = Math.min(1, elapsedMin / (24 * 60));
  const seedBase = 980 + Math.floor(Math.sin(kstNow.getUTCDate() * 1.7) * 80) + 80;
  const projected = Math.floor(seedBase * dayFraction + 60);
  return Math.max(120, projected);
}

export default function Index() {
  const nav = useNavigate();
  const { t, i18n } = useTranslation("landing");
  const { isReady, hasSession } = useAuthReady();
  useEffect(() => { if (isReady && hasSession) nav("/dashboard", { replace: true }); }, [isReady, hasSession, nav]);
  useEffect(() => { track("landing_view", { lang: i18n.language }); }, [i18n.language]);
  const onCta = (location: string) => track("cta_click", { location, lang: i18n.language });
  const online = useOnline();
  const total = useTotalPayout();
  const today = useTodayPayout();
  const members = useMembers();

  // 실시간 신규 가입 카운터 — KST 자정 기준 누적, 60~90s 간격으로 +1~3 미세 증가
  const [todaySignups, setTodaySignups] = useState(() => computeTodaySignups());
  useEffect(() => {
    let alive = true;
    function schedule() {
      if (!alive) return;
      const delay = 55_000 + Math.random() * 35_000; // 55~90s
      window.setTimeout(() => {
        if (!alive) return;
        setTodaySignups((n) => n + 1 + Math.floor(Math.random() * 3)); // +1~3
        schedule();
      }, delay);
    }
    schedule();
    const onVis = () => { if (document.visibilityState === "visible") setTodaySignups(computeTodaySignups()); };
    document.addEventListener("visibilitychange", onVis);
    return () => { alive = false; document.removeEventListener("visibilitychange", onVis); };
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Backdrop — imperial gold */}
      <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />
      <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-primary/25 blur-3xl animate-float" />
      <div className="absolute top-40 -right-40 w-[600px] h-[600px] rounded-full bg-primary/20 blur-3xl animate-float-slow" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-primary/15 blur-3xl" />
      <Particles density={70} />

      {/* Top nav */}
      <header className="relative z-20">
        <div className="container flex items-center justify-between h-20">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-imperial glow-imperial flex items-center justify-center">
              <Crown className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-xl tracking-[0.2em] text-gradient-imperial">
              PHONARA
            </span>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Link to="/secure-auth" className="text-sm text-muted-foreground hover:text-foreground transition hidden sm:block">
              {t("navLogin")}
            </Link>
            <Link
              to="/secure-auth?signup=1"
              onClick={() => onCta("nav")}
              className="px-4 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-bold bg-gradient-imperial text-primary-foreground glow-imperial hover:scale-105 transition"
            >
              {t("navEnter")}
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 container pt-10 pb-24 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass mb-8 animate-fade-up border border-primary/30">
          <Crown className="w-3 h-3 text-primary" />
          <span className="text-xs text-primary font-bold tracking-[0.2em]">{t("badge")}</span>
        </div>

        <h1 className="font-display font-black text-4xl sm:text-6xl lg:text-7xl leading-[1.05] tracking-tight animate-fade-up">
          {t("h1Line1")}
          <br />
          <span className="text-gradient-imperial">{t("h1Line2")}</span>
        </h1>
        <p className="mt-3 text-xs sm:text-sm tracking-[0.4em] text-primary/80 font-bold animate-fade-up" style={{ animationDelay: "0.05s" }}>
          {t("h1Sub")}
        </p>
        <p className="mt-6 text-base sm:text-xl text-muted-foreground max-w-2xl mx-auto animate-fade-up" style={{ animationDelay: "0.1s" }}>
          {t("sub")}
        </p>

        {/* Throne treasury card */}
        <div className="mt-12 relative w-full max-w-md mx-auto animate-fade-up" style={{ animationDelay: "0.2s" }}>
          <div className="absolute inset-0 bg-gradient-imperial blur-3xl opacity-40 -z-10" />
          <div className="relative rounded-3xl overflow-hidden border border-primary/40 glow-imperial">
            <div
              className="absolute inset-0 bg-cover bg-center opacity-25"
              style={{ backgroundImage: `url(${throneBg})` }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/85 to-background/95" />
            <div className="relative p-6 sm:p-8">
              <div className="text-[10px] text-primary tracking-[0.3em] font-bold flex items-center justify-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" /> {t("liveLabel")}
              </div>
              <div className="font-display font-black text-4xl sm:text-5xl mt-2 text-gradient-imperial tabular-nums">
                ₩ {total.toLocaleString()}
              </div>
              <div className="mt-3 flex items-center justify-center gap-2 text-xs text-primary/90">
                <TrendingUp className="w-4 h-4" /> +₩ {today.toLocaleString()} {t("todaySuffix")}
              </div>
              <div className="mt-2 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Users className="w-3.5 h-3.5 text-primary" />
                <span className="text-primary font-bold">{online.toLocaleString()}</span> {t("onlineSuffix")}
              </div>
              <div className="mt-5">
                <EmpireFoundingCounter />
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-up" style={{ animationDelay: "0.3s" }}>
          <Link
            to="/secure-auth?signup=1"
            onClick={() => onCta("hero")}
            className="group relative px-8 py-4 rounded-2xl font-display font-bold text-base sm:text-lg bg-gradient-imperial text-primary-foreground glow-imperial animate-pulse-glow hover:scale-105 transition flex items-center gap-2"
          >
            <Crown className="w-5 h-5" />
            {t("ctaPrimary")}
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition" />
          </Link>
          <Link to="/secure-auth" className="text-sm text-muted-foreground hover:text-foreground transition">
            {t("ctaSecondary")}
          </Link>
        </div>

        {/* 즉시 가치 + 사회적 증거 */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2 animate-fade-up" style={{ animationDelay: "0.32s" }}>
          <span className="px-3 py-1.5 rounded-full glass border border-primary/30 text-[11px] font-bold text-primary inline-flex items-center gap-1.5">
            <Sparkles className="w-3 h-3" /> 가입 즉시 ₩5,000 지급
          </span>
          <span className="px-3 py-1.5 rounded-full glass border border-primary/20 text-[11px] text-muted-foreground inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
            오늘 신규 가입 <span key={todaySignups} className="font-black text-foreground tabular-nums animate-fade-up">{todaySignups.toLocaleString()}</span>명
          </span>
          <span className="px-3 py-1.5 rounded-full glass border border-primary/20 text-[11px] text-muted-foreground inline-flex items-center gap-1.5">
            <Zap className="w-3 h-3 text-secondary" /> 60초 안에 첫 적립
          </span>
        </div>

        <div className="mt-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass border border-primary/20 text-[11px] text-primary/90 animate-fade-up" style={{ animationDelay: "0.35s" }}>
          <Heart className="w-3.5 h-3.5 fill-primary text-primary" /> {t("freeBadge")}
        </div>

        {/* Trust badges */}
        <div className="mt-16 grid grid-cols-3 gap-3 sm:gap-6 max-w-2xl mx-auto animate-fade-up" style={{ animationDelay: "0.4s" }}>
          {[
            { icon: Lock, label: t("trust1"), sub: t("trust1Sub") },
            { icon: ShieldCheck, label: t("trust2"), sub: t("trust2Sub") },
            { icon: Zap, label: t("trust3"), sub: t("trust3Sub") },
          ].map((b, i) => (
            <div key={i} className="glass rounded-2xl p-4 sm:p-5 tilt-card animate-float border border-primary/15" style={{ animationDelay: `${i * 0.3}s` }}>
              <b.icon className="w-6 h-6 mx-auto text-primary" />
              <div className="mt-2 text-xs sm:text-sm font-bold">{b.label}</div>
              <div className="text-[10px] sm:text-xs text-muted-foreground">{b.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Mega trust badge */}
      <section className="relative z-10 container -mt-4">
        <div className="rounded-3xl p-6 sm:p-8 border border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent text-center relative overflow-hidden glow-imperial">
          <div className="font-display font-black text-2xl sm:text-4xl">
            <span className="text-gradient-imperial tabular-nums">{members.toLocaleString()}</span>
            <span className="ml-2">{t("megaSuffix")}</span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-2">{t("megaSub")}</p>
        </div>
      </section>

      {/* Live payout ticker + Council */}
      <section className="relative z-10 container py-12">
        <div className="grid md:grid-cols-2 gap-5">
          <PayoutTicker />
          <div className="relative rounded-3xl overflow-hidden border border-primary/40 glow-imperial">
            <div className="absolute inset-0 bg-cover bg-center opacity-20" style={{ backgroundImage: `url(${throneBg})` }} />
            <div className="absolute inset-0 bg-gradient-to-br from-background/85 to-background/95" />
            <div className="relative p-6">
              <div className="text-[10px] text-primary tracking-widest font-black">{t("councilTag")}</div>
              <h3 className="font-display font-black text-2xl mt-2 text-gradient-imperial">{t("councilTitle")}</h3>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{t("councilDesc")}</p>
              <div className="mt-4">
                <EmpireFoundingCounter />
              </div>
              <Link
                to="/secure-auth?signup=1"
                onClick={() => onCta("council")}
                className="mt-5 inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-imperial text-primary-foreground font-bold text-sm glow-imperial hover:scale-105 transition"
              >
                <Crown className="w-4 h-4" /> {t("councilCta")}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Social proof */}
      <section className="relative z-10 container py-16">
        <div className="text-center mb-8">
          <h2 className="font-display font-black text-2xl sm:text-4xl">
            {t("reviewsTitle").split(",")[0]},
            <span className="text-gradient-imperial"> {t("reviewsTitle").split(",")[1]?.trim() || t("reviewsTitle")}</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-2">{t("reviewsSub")}</p>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { name: "민지 (24·서울)", h: "Gold Tier · 월 320만원", t: "퇴근 후 1시간만 미션 돌렸는데 첫 달부터 130만원. 등급 올리니 320 찍었어요.", tag: "@minji_imperial" },
            { name: "현우 (31·부산)", h: "Imperial Tier", t: "정산 진짜 12분 안에 들어옵니다. 임페리얼 미션이 자동으로 돌아가서 폰만 켜놓으면 끝.", tag: "@hyunwoo.god" },
            { name: "수아 (28·대전)", h: "창립 멤버 · Imperial Owner", t: "30석 안에 겨우 들어왔어요. 매주 분배금이 입금됩니다. 진짜 자산이 굴러갑니다.", tag: "@sua.empire" },
            { name: "재훈 (22·인천)", h: "Silver · 주 5회 출금", t: "출금 한 번도 막힌 적 없음. 친구 5명 추천했더니 보너스만 25만원 받았어요.", tag: "@jaehoon99" },
            { name: "지원 (35·광주)", h: "Bronze · 9개월", t: "유료 안 가도 기본 미션만으로 한 달 80~120 나옴. 완전 부담 없어서 좋음.", tag: "@jiwon_free" },
            { name: "태리 (29·일산)", h: "Platinum · Imperial Council", t: "30석 창립 멤버에 들어와서 자산매니저가 1:1 케어 해줍니다.", tag: "@taeri.imperial" },
          ].map((r, i) => (
            <div key={i} className="glass rounded-2xl p-5 tilt-card border border-primary/15">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-bold">{r.name}</div>
                <div className="text-[10px] px-2 py-0.5 rounded-full bg-primary/15 text-primary font-bold whitespace-nowrap">{r.h}</div>
              </div>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">"{r.t}"</p>
              <div className="text-[10px] text-primary mt-3">{r.tag}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Feature row */}
      <section className="relative z-10 container py-16">
        <div className="grid md:grid-cols-3 gap-5">
          {[
            { icon: Cpu, title: t("featImperialTitle"), desc: t("featImperialDesc") },
            { icon: Crown, title: t("featTierTitle"), desc: t("featTierDesc") },
            { icon: TrendingUp, title: t("featTreasuryTitle"), desc: t("featTreasuryDesc") },
          ].map((f, i) => (
            <div key={i} className="glass-strong rounded-3xl p-6 border border-primary/30 tilt-card relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-40 bg-primary" />
              <f.icon className="w-10 h-10 text-primary" />
              <h3 className="font-display font-bold text-xl mt-4">{f.title}</h3>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section className="relative z-10 container py-16">
        <div className="rounded-3xl p-8 sm:p-12 border border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent relative overflow-hidden">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { v: members.toLocaleString(), k: t("statsMembers") },
              { v: "₩ 128억+", k: t("statsTotal") },
              { v: "99.97%", k: t("statsRate") },
              { v: "4.9/5", k: t("statsScore") },
            ].map((s, i) => (
              <div key={i}>
                <div className="font-display font-black text-2xl sm:text-4xl text-gradient-imperial tabular-nums">{s.v}</div>
                <div className="text-xs text-muted-foreground mt-1">{s.k}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative z-10 container py-20 text-center">
        <h2 className="font-display font-black text-3xl sm:text-5xl">
          <span className="text-gradient-imperial">{t("finalH")}</span>
        </h2>
        <p className="text-muted-foreground mt-3">{t("finalSub")}</p>
        <Link
          to="/secure-auth?signup=1"
          onClick={() => onCta("final")}
          className="mt-8 inline-flex items-center gap-2 px-10 py-5 rounded-2xl font-display font-bold text-lg bg-gradient-imperial text-primary-foreground glow-imperial animate-pulse-glow hover:scale-105 transition"
        >
          <Crown className="w-5 h-5" /> {t("finalCta")}
        </Link>
        <div className="mt-12 text-xs text-muted-foreground flex items-center justify-center gap-3">
          <Link to="/trust"
            onMouseEnter={() => import("@/lib/trustPrefetch").then(m => m.prefetchTrust(30))}
            onFocus={() => import("@/lib/trustPrefetch").then(m => m.prefetchTrust(30))}
            className="hover:text-primary inline-flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" /> Trust 지표
          </Link>
          <span>·</span>
          <span>© 2026 Phonara. All Rights Reserved.</span>
        </div>
      </section>
    </div>
  );
}
