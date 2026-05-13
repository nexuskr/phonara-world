import { useEffect, useState, lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import Particles from "@/components/Particles";
import LazyMount from "@/components/util/LazyMount";
import BoostHeroCard from "@/components/BoostHeroCard";
import { useOnline, useTodayPayout } from "@/components/LiveStats";
import { useDB, DEFAULT_MISSIONS, formatKRW } from "@/lib/store";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { refreshWallet } from "@/lib/missions-rpc";
import { Flame, Zap, Trophy, ChevronRight, TrendingUp, Sparkles, Crown, Wallet, Users, Activity } from "lucide-react";
import CommandHero from "@/components/CommandHero";
import { FomoNotificationStrip } from "@/components/empire/FomoNotificationStrip";
import WhaleStrikeRail from "@/components/empire/WhaleStrikeRail";
import LiveRankingMarquee from "@/components/LiveRankingMarquee";
import CrownWarHUD from "@/components/empire/CrownWarHUD";
import EmpireSignature from "@/components/status/EmpireSignature";
import { useWinback } from "@/hooks/use-winback";
import { useTranslation } from "react-i18next";
import HubTabs from "@/components/HubTabs";
import Disclaimer from "@/components/Disclaimer";
import { isFlagOn } from "@/lib/conversion-flags";
import { SIXTY_SECOND_FLOW_KEY } from "@/components/onboarding/SixtySecondFlow";

// Below-the-fold + overlay components — code-split so first paint is fast.
const LiveRanking = lazy(() => import("@/components/LiveRanking"));
const JackpotBanner = lazy(() => import("@/components/JackpotBanner"));
const AttendanceCard = lazy(() => import("@/components/AttendanceCard"));
const ActiveBotsMini = lazy(() => import("@/components/AIBotCards").then(m => ({ default: m.ActiveBotsMini })));
const SevenDayChallengeCard = lazy(() => import("@/components/SevenDayChallengeCard"));
const EmpireDayCountdown = lazy(() => import("@/components/EmpireDayCountdown"));
const MachineFomoTicker = lazy(() => import("@/components/MachineFomoTicker"));
const OnboardingV2 = lazy(() => import("@/components/onboarding/OnboardingV2"));
const FirstMissionCard = lazy(() => import("@/components/FirstMissionCard"));
const EmpireP2EDashboard = lazy(() => import("@/components/empire/EmpireP2EDashboard"));
const SixtySecondFlow = lazy(() => import("@/components/onboarding/SixtySecondFlow"));
const EarnedToast = lazy(() => import("@/components/onboarding/EarnedToast"));
const FirstDepositTopBanner = lazy(() => import("@/components/onboarding/FirstDepositTopBanner"));
const LivePurchaseTicker = lazy(() => import("@/components/conversion/LivePurchaseTicker"));
const TierComparisonCard = lazy(() => import("@/components/status/TierComparisonCard"));
const PersonalizedFeedRail = lazy(() => import("@/components/feed/PersonalizedFeedRail"));
const RevenueWidget = lazy(() => import("@/components/feed/RevenueWidget"));
const CosmicSection = lazy(() => import("@/components/cosmic/CosmicSection"));

export default function Dashboard() {
  const [db] = useDB();
  const { t } = useTranslation("dashboard");
  const user = useRequireAuth();
  const [burst, setBurst] = useState(false);
  const [allowOnboardingV2, setAllowOnboardingV2] = useState(false);
  const online = useOnline();
  const today = useTodayPayout();

  useEffect(() => { void refreshWallet(); }, []);
  useWinback();

  useEffect(() => {
    if (!user || typeof window === "undefined") {
      setAllowOnboardingV2(false);
      return;
    }
    try {
      setAllowOnboardingV2(!isFlagOn("sixtySecondFlow") || !!localStorage.getItem(SIXTY_SECOND_FLOW_KEY));
    } catch {
      setAllowOnboardingV2(!isFlagOn("sixtySecondFlow"));
    }
  }, [user]);

  if (!user) return null;
  const featured = DEFAULT_MISSIONS.slice(0, 5);
  // Context-aware particle intensity based on balance
  const wealth = user.balance + user.coinBalance * 1300;
  const particleDensity = wealth > 5_000_000 ? 80 : wealth > 1_000_000 ? 55 : 30;
  const burstCount = wealth > 5_000_000 ? 24 : wealth > 1_000_000 ? 16 : 10;

  return (
    <Layout>
      <Suspense fallback={null}>
        <FirstDepositTopBanner />
        <SixtySecondFlow enabled={!!user} onClosed={() => setAllowOnboardingV2(true)} />
        <EarnedToast />
      </Suspense>
      <EmpireSignature />
      <Suspense fallback={null}>
        <LivePurchaseTicker />
        <OnboardingV2 enabled={!!user && allowOnboardingV2} />
        <FirstMissionCard />
      </Suspense>

      {/* 🌌 우주 끝판왕 — Above-the-fold Cosmic Layer */}
      <Suspense fallback={<div className="h-[70vh]" />}>
        <CosmicSection />
      </Suspense>
      <div className="relative animate-liquid-in">
        <div className="absolute inset-0 bg-grid opacity-20 pointer-events-none" />

        {/* === Imperial overlay (static, no motion): grids + grain + 3-layer vignette + corner glows === */}
        <div aria-hidden className="absolute inset-0 pointer-events-none">
          <div
            className="absolute inset-0 opacity-[0.065]"
            style={{
              backgroundImage:
                "linear-gradient(hsl(var(--gold)/0.7) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--gold)/0.7) 1px, transparent 1px)",
              backgroundSize: "112px 112px",
            }}
          />
          <div
            className="absolute inset-0 opacity-[0.034]"
            style={{
              backgroundImage:
                "linear-gradient(hsl(var(--gold)/0.6) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--gold)/0.6) 1px, transparent 1px)",
              backgroundSize: "28px 28px",
            }}
          />
          <div
            className="absolute inset-0 opacity-[0.05] mix-blend-overlay"
            style={{
              backgroundImage:
                "radial-gradient(hsl(var(--gold)/0.55) 0.5px, transparent 0.5px), radial-gradient(hsl(var(--gold)/0.35) 0.5px, transparent 0.5px)",
              backgroundSize: "3px 3px, 7px 7px",
              backgroundPosition: "0 0, 1px 2px",
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(70% 55% at 50% 18%, transparent 0%, hsl(var(--background)/0.5) 70%, hsl(var(--background)/0.82) 100%)",
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background: "radial-gradient(45% 30% at 50% 35%, transparent 0%, hsl(var(--background)/0.65) 100%)",
              mixBlendMode: "multiply",
            }}
          />
          <div className="absolute -top-32 -left-32 w-[420px] h-[420px] rounded-full bg-gold/15 blur-3xl" />
          <div className="absolute -bottom-32 -right-32 w-[420px] h-[420px] rounded-full bg-gold/10 blur-3xl" />
        </div>

        <Particles density={particleDensity} />

        <HubTabs hub="command" />

        <div className="container relative pt-2 pb-10">
          {/* === PHONARA · EST. 2026 seal + Crown 키커 === */}
          <div className="flex flex-col items-center select-none mt-1 mb-3">
            <div className="h-px w-44 bg-gradient-to-r from-transparent via-gold/55 to-transparent" />
            <div
              className="mt-1.5 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-gold/55 bg-background/70"
              style={{
                boxShadow:
                  "0 0 28px -6px hsl(var(--gold)/0.55), inset 0 1px 0 hsl(var(--gold)/0.45), inset 0 -1px 0 hsl(var(--gold)/0.18)",
              }}
            >
              <Crown className="w-4 h-4 text-gold drop-shadow-[0_0_7px_hsl(var(--gold)/0.7)]" />
              <span
                className="text-[10px] tracking-[0.42em] text-gold font-black"
                style={{ textShadow: "0 0 10px hsl(var(--gold)/0.45)" }}
              >
                PHONARA · EST. 2026
              </span>
            </div>
            <div className="mt-1.5 h-px w-44 bg-gradient-to-r from-transparent via-gold/55 to-transparent" />
          </div>

          {/* P5 — Recovery FOMO cascade */}
          <FomoNotificationStrip />
          <div className="mb-3"><CrownWarHUD /></div>
          <div className="mb-4"><WhaleStrikeRail /></div>
          <div className="mb-4"><LiveRankingMarquee /></div>
          {/* 🏛️ Command Hero — 영웅 카드 (잔고 + 추천 미션 + 100석) */}
          <CommandHero />

          {/* P2 — Empire P2E (Daily Combo + Idle Growth + Tap-to-Reinforce) */}
          <LazyMount minHeight={320} rootMargin="400px 0px">
            <div className="mt-4">
              <Suspense fallback={null}><EmpireP2EDashboard /></Suspense>
            </div>
          </LazyMount>

          {/* Live ticker — luxury imperial frame */}
          <div className="grid grid-cols-2 gap-2 mt-4 mb-4">
            {[
              { icon: Users, micro: "LIVE", label: t("online"), value: t("onlineUnit", { n: online.toLocaleString() }), strong: false },
              { icon: Activity, micro: "TODAY", label: t("todaySettled"), value: formatKRW(today), strong: true },
            ].map((c, i) => {
              const Icon = c.icon;
              return (
                <div
                  key={i}
                  className="relative glass rounded-2xl p-3 flex items-center gap-3 border border-gold/30 overflow-hidden"
                  style={{ boxShadow: "inset 0 1px 0 hsl(var(--gold)/0.18), 0 0 22px -8px hsl(var(--gold)/0.5)" }}
                >
                  <span aria-hidden className="absolute inset-x-3 top-0 h-[2px] bg-gradient-to-r from-transparent via-gold/70 to-transparent" />
                  <div className="w-8 h-8 rounded-lg bg-gold/15 border border-gold/30 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-gold" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[8px] tracking-[0.4em] text-gold/70 font-black">{c.micro}</div>
                    <div className="text-[10px] text-muted-foreground flex items-center gap-1 break-keep">
                      <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" /> {c.label}
                    </div>
                    <div className={`font-display font-black text-sm tabular-nums ${c.strong ? "text-money-strong" : ""}`}>
                      {c.value}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 🔥 메인 훅: BoostHero — 첫 0.5초 노출 사수 */}
          <div className="space-y-3">
            <BoostHeroCard />
          </div>

          {/* V17 — 개인화 추천 피드 + 24h 매출 위젯 */}
          <LazyMount minHeight={280} rootMargin="400px 0px">
            <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_280px] items-start">
              <Suspense fallback={null}><PersonalizedFeedRail /></Suspense>
              <Suspense fallback={null}><RevenueWidget /></Suspense>
            </div>
          </LazyMount>

          {/* Balance hero — luxury watch frame */}
          <div className="relative animate-fade-up mt-4">
            <div className="absolute inset-0 bg-gradient-cyber blur-3xl opacity-50 -z-10" />
            <div
              className="glass-strong rounded-3xl p-6 sm:p-7 relative overflow-hidden border-2 border-gold/55 outline outline-1 outline-offset-[3px] outline-gold/22"
              style={{
                boxShadow:
                  "0 0 44px hsl(var(--gold)/0.28), 0 0 84px hsl(var(--gold)/0.14), inset 0 1px 0 hsl(var(--gold)/0.28), inset 0 -1px 0 hsl(var(--gold)/0.14)",
              }}
            >
              {/* inner hairlines */}
              <span aria-hidden className="absolute top-0 inset-x-6 h-px bg-gradient-to-r from-transparent via-gold/65 to-transparent" />
              <span aria-hidden className="absolute bottom-0 inset-x-6 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
              {/* 4 corner L-markers */}
              <span aria-hidden className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-gold/80 rounded-tl-md" />
              <span aria-hidden className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-gold/80 rounded-tr-md" />
              <span aria-hidden className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-gold/80 rounded-bl-md" />
              <span aria-hidden className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-gold/80 rounded-br-md" />
              {/* static conic shine */}
              <span
                aria-hidden
                className="absolute inset-0 pointer-events-none opacity-[0.09]"
                style={{
                  background:
                    "conic-gradient(from 210deg at 50% 0%, transparent 0deg, hsl(var(--gold)) 60deg, transparent 140deg, transparent 360deg)",
                }}
              />
              <div className="absolute inset-0 bg-grid opacity-20" />
              <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-gradient-primary blur-3xl opacity-50 animate-float" />
              <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-accent/60 blur-3xl animate-float-slow" />

              {burst && (
                <div className="absolute inset-0 pointer-events-none">
                  {Array.from({ length: burstCount }).map((_, i) => {
                    const angle = (i / burstCount) * Math.PI * 2;
                    const tx = Math.cos(angle) * 220;
                    const ty = Math.sin(angle) * 220 - 40;
                    const icons = ["💸", "💰", "✨", "💎"];
                    return (
                      <span key={i} className="absolute left-1/2 top-1/2 text-2xl animate-money-burst"
                        style={{ ["--tx" as any]: `${tx}px`, ["--ty" as any]: `${ty}px`, ["--r" as any]: `${i * 25}deg`, animationDelay: `${i * 25}ms` }}>
                        {icons[i % icons.length]}
                      </span>
                    );
                  })}
                </div>
              )}

              <div className="relative">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] sm:text-xs text-muted-foreground tracking-[0.2em] uppercase">{t("currentBalance")}</div>
                  <span className="lux-chip lux-chip-gold">{user.tier}</span>
                </div>
                <button onClick={() => { setBurst(true); setTimeout(() => setBurst(false), 1600); }}
                  className="font-display font-black text-4xl sm:text-5xl mt-2 text-money-strong block sm:hover:scale-105 transition tabular-nums">
                  {formatKRW(user.balance)}
                </button>
                <div className="mt-2 text-xs text-muted-foreground">
                  {t("coinBalance")} <span className="text-money font-black tabular-nums">{user.coinBalance.toLocaleString()} USDT</span>
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs text-secondary tabular-nums break-keep">
                  <TrendingUp className="w-3.5 h-3.5" /> {t("todayEarned", { val: formatKRW(user.todayEarnings) })}
                </div>
              </div>

              <div className="relative grid grid-cols-3 gap-2 mt-6">
                <Stat icon={Flame} label={t("streak")} value={t("streakUnit", { n: user.streak })} color="text-primary" />
                <Stat icon={Zap} label={t("level")} value={`Lv.${user.level}`} color="text-secondary" />
                <Stat icon={Trophy} label={t("xp")} value={`${user.xp}`} color="text-gold" />
              </div>

              <div className="relative mt-3">
                <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                  <span className="break-keep">{t("nextTier")}</span>
                  <span className="tabular-nums">{user.xp}/{user.level * 1000} XP</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-primary glow-primary" style={{ width: `${Math.min(100, (user.xp / (user.level * 1000)) * 100)}%` }} />
                </div>
              </div>

              <div className="relative grid grid-cols-2 gap-2 mt-3">
                <Link to="/wallet" className="lux-btn lux-btn-primary">
                  <Wallet className="w-4 h-4" /> {t("withdraw")}
                </Link>
                <Link to="/packages" className="lux-btn lux-btn-ghost">
                  <Crown className="w-4 h-4 text-primary" /> {t("packages")}
                </Link>
              </div>
            </div>
          </div>

          {/* 보조 훅 */}
          <LazyMount minHeight={240} rootMargin="500px 0px">
            <div className="mt-4 space-y-3">
              <Suspense fallback={null}><SevenDayChallengeCard /></Suspense>
              <div className="flex justify-center"><Suspense fallback={null}><EmpireDayCountdown /></Suspense></div>
              <Suspense fallback={null}><MachineFomoTicker /></Suspense>
            </div>
          </LazyMount>

          {/* DAILY ATTENDANCE — habit/streak driver */}
          <LazyMount minHeight={120} rootMargin="500px 0px">
            <div className="mt-4">
              <Suspense fallback={null}><AttendanceCard /></Suspense>
            </div>
          </LazyMount>

          {/* TIER COMPARISON — 한국 유저 우월감 엔진 */}
          <LazyMount minHeight={140} rootMargin="500px 0px">
            <div className="mt-4">
              <Suspense fallback={null}><TierComparisonCard /></Suspense>
            </div>
          </LazyMount>

          {/* LUCKY ROULETTE entry */}
          <Link to="/roulette" className="mt-4 block press">
            <div className="glass-strong rounded-2xl p-4 neon-border relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-aurora opacity-[0.08] animate-gradient" style={{ backgroundSize: "300% 300%" }} />
              <div className="relative flex items-center justify-between">
                <div>
                  <div className="font-display font-black text-base flex items-center gap-2 break-keep">
                    {t("rouletteTitle")} <span className="text-[10px] px-2 py-0.5 rounded-full bg-gold/20 text-gold font-bold whitespace-nowrap">{t("rouletteFree")}</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5 break-keep">{t("rouletteSub")}</div>
                </div>
                <div className="text-2xl">→</div>
              </div>
            </div>
          </Link>

          {/* GAMIFICATION ENTRY — Phase 26 */}
          <div className="grid grid-cols-3 gap-2 mt-4">
            <Link to="/quests" className="press glass-strong rounded-2xl p-3 min-h-[56px] border border-amber-500/20 flex flex-col items-center gap-1">
              <span className="text-2xl">⚡</span>
              <span className="text-[11px] font-bold break-keep">{t("quests")}</span>
            </Link>
            <Link to="/season-pass" className="press glass-strong rounded-2xl p-3 min-h-[56px] border border-fuchsia-500/20 flex flex-col items-center gap-1 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-500/10 to-violet-600/10" />
              <span className="text-2xl relative">✨</span>
              <span className="text-[11px] font-bold relative break-keep">{t("seasonPass")}</span>
            </Link>
            <Link to="/achievements" className="press glass-strong rounded-2xl p-3 min-h-[56px] border border-primary/20 flex flex-col items-center gap-1">
              <span className="text-2xl">🏆</span>
              <span className="text-[11px] font-bold break-keep">{t("achievements")}</span>
            </Link>
          </div>

          {/* MEGA JACKPOT — primary dopamine driver */}
          <LazyMount minHeight={180} rootMargin="500px 0px">
            <div className="mt-5">
              <Suspense fallback={null}><JackpotBanner /></Suspense>
            </div>
          </LazyMount>

          {/* AI Auto Bots summary */}
          <LazyMount minHeight={180} rootMargin="500px 0px">
            <div className="mt-5">
              <Suspense fallback={null}><ActiveBotsMini /></Suspense>
            </div>
          </LazyMount>

          {/* Quick actions */}
          <div className="grid grid-cols-4 gap-2 mt-5">
            {[
              { to: "/missions", label: t("missions"), icon: "🎯", grad: "from-primary/20 to-primary/5" },
              { to: "/packages", label: t("packages"), icon: "👑", grad: "from-gold/20 to-gold/5" },
              { to: "/wallet", label: t("deposit"), icon: "💎", grad: "from-secondary/20 to-secondary/5" },
              { to: "/support", label: t("support"), icon: "💬", grad: "from-accent/20 to-accent/5" },
            ].map((a, i) => (
              <Link key={i} to={a.to} className={`glass rounded-2xl p-3 flex flex-col items-center gap-1 bg-gradient-to-b ${a.grad} sm:hover:scale-105 transition`}>
                <span className="text-2xl">{a.icon}</span>
                <span className="text-[11px] font-bold">{a.label}</span>
              </Link>
            ))}
          </div>

          {/* Featured missions */}
          <div className="mt-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display font-bold text-lg flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" /> {t("todayPick")}
              </h2>
              <Link to="/missions" className="text-xs text-muted-foreground hover:text-foreground flex items-center break-keep">{t("viewAll")} <ChevronRight className="w-3 h-3" /></Link>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-3 -mx-5 px-5 snap-x snap-mandatory">
              {featured.map(m => (
                <Link key={m.id} to="/missions" className="snap-start shrink-0 w-64 glass-strong rounded-2xl p-4 neon-border tilt-card relative overflow-hidden">
                  <div className="absolute -top-10 -right-10 w-24 h-24 rounded-full bg-gradient-primary blur-2xl opacity-40" />
                  <div className="flex items-center justify-between text-[10px] mb-2">
                    <span className="px-2 py-0.5 rounded-full bg-primary/15 text-primary font-bold">{m.category}</span>
                    <span className="text-muted-foreground">{m.duration}</span>
                  </div>
                  <h3 className="font-bold text-sm leading-snug">{m.title}</h3>
                  <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{m.desc}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="font-display font-black text-lg text-gradient-gold">+{formatKRW(m.reward)}</div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${m.tier === "EMPIRE" ? "bg-gold/20 text-gold" : m.tier === "GOD" ? "bg-accent/20 text-accent" : m.tier === "VIP" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>{m.tier}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Live ranking */}
          <LazyMount minHeight={320} rootMargin="600px 0px">
            <div className="mt-8">
              <Suspense fallback={null}><LiveRanking /></Suspense>
            </div>
          </LazyMount>

          <Disclaimer className="mt-6" />
        </div>
      </div>
    </Layout>
  );
}

function Stat({ icon: Icon, label, value, color }: any) {
  return (
    <div className="glass rounded-xl p-3 text-center">
      <Icon className={`w-4 h-4 mx-auto ${color}`} />
      <div className="text-[10px] text-muted-foreground mt-1">{label}</div>
      <div className="font-display font-bold text-sm">{value}</div>
    </div>
  );
}
