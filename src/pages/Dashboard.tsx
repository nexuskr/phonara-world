import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import Particles from "@/components/Particles";
import LiveRanking from "@/components/LiveRanking";
import JackpotBanner from "@/components/JackpotBanner";
import AttendanceCard from "@/components/AttendanceCard";
import { ActiveBotsMini } from "@/components/AIBotCards";
import BoostHeroCard from "@/components/BoostHeroCard";
import SevenDayChallengeCard from "@/components/SevenDayChallengeCard";
import EmpireDayCountdown from "@/components/EmpireDayCountdown";
import MachineFomoTicker from "@/components/MachineFomoTicker";
import { useOnline, useTodayPayout } from "@/components/LiveStats";
import { useDB, DEFAULT_MISSIONS, formatKRW } from "@/lib/store";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { refreshWallet } from "@/lib/missions-rpc";
import { Flame, Zap, Trophy, ChevronRight, TrendingUp, Sparkles, Crown, Wallet, Users, Activity } from "lucide-react";
import FirstTimeOnboarding from "@/components/FirstTimeOnboarding";
import FirstMissionCard from "@/components/FirstMissionCard";
import CommandHero from "@/components/CommandHero";
import EmpireP2EDashboard from "@/components/empire/EmpireP2EDashboard";
import { FomoNotificationStrip } from "@/components/empire/FomoNotificationStrip";
import SixtySecondFlow from "@/components/onboarding/SixtySecondFlow";
import EarnedToast from "@/components/onboarding/EarnedToast";
import FirstDepositTopBanner from "@/components/onboarding/FirstDepositTopBanner";
import EmpireSignature from "@/components/status/EmpireSignature";
import LivePurchaseTicker from "@/components/conversion/LivePurchaseTicker";
import TierComparisonCard from "@/components/status/TierComparisonCard";
import { useWinback } from "@/hooks/use-winback";
import { useTranslation } from "react-i18next";
import HubTabs from "@/components/HubTabs";
import Disclaimer from "@/components/Disclaimer";

export default function Dashboard() {
  const [db] = useDB();
  const { t } = useTranslation("dashboard");
  const user = useRequireAuth() ?? db.user;
  const [burst, setBurst] = useState(false);
  const online = useOnline();
  const today = useTodayPayout();

  useEffect(() => { void refreshWallet(); }, []);
  useWinback();

  if (!user) return null;
  const featured = DEFAULT_MISSIONS.slice(0, 5);
  // Context-aware particle intensity based on balance
  const wealth = user.balance + user.coinBalance * 1300;
  const particleDensity = wealth > 5_000_000 ? 80 : wealth > 1_000_000 ? 55 : 30;
  const burstCount = wealth > 5_000_000 ? 24 : wealth > 1_000_000 ? 16 : 10;

  return (
    <Layout>
      <SixtySecondFlow enabled={!!user} />
      <EarnedToast />
      <EmpireSignature />
      <LivePurchaseTicker />
      <FirstTimeOnboarding enabled={!!user} />
      <FirstMissionCard />
      <div className="relative animate-liquid-in">
        <div className="absolute inset-0 bg-grid opacity-20 pointer-events-none" />
        <Particles density={particleDensity} />

        <HubTabs hub="command" />

        <div className="container relative pt-2 pb-10">
          {/* P5 — Recovery FOMO cascade */}
          <FomoNotificationStrip />
          {/* 🏛️ Command Hero — 영웅 카드 (잔고 + 추천 미션 + 100석) */}
          <CommandHero />

          {/* P2 — Empire P2E (Daily Combo + Idle Growth + Tap-to-Reinforce) */}
          <div className="mt-4">
            <EmpireP2EDashboard />
          </div>

          {/* Live ticker (compact, beneath hero) */}
          <div className="grid grid-cols-2 gap-2 mt-4 mb-4">
            <div className="glass rounded-2xl p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-secondary/20 flex items-center justify-center"><Users className="w-4 h-4 text-secondary" /></div>
              <div>
                <div className="text-[10px] text-muted-foreground flex items-center gap-1 break-keep"><span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" /> {t("online")}</div>
                <div className="font-display font-black text-sm tabular-nums">{t("onlineUnit", { n: online.toLocaleString() })}</div>
              </div>
            </div>
            <div className="glass rounded-2xl p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center"><Activity className="w-4 h-4 text-primary" /></div>
              <div>
                <div className="text-[10px] text-muted-foreground flex items-center gap-1 break-keep"><span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" /> {t("todaySettled")}</div>
                <div className="font-display font-black text-sm tabular-nums text-money-strong">{formatKRW(today)}</div>
              </div>
            </div>
          </div>

          {/* 🔥 메인 훅: BoostHero — 첫 0.5초 노출 사수 */}
          <div className="space-y-3">
            <BoostHeroCard />
          </div>

          {/* Balance hero */}
          <div className="relative animate-fade-up mt-4">
            <div className="absolute inset-0 bg-gradient-cyber blur-3xl opacity-50 -z-10" />
            <div className="glass-strong rounded-3xl p-7 neon-border relative overflow-hidden">
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
          <div className="mt-4 space-y-3">
            <SevenDayChallengeCard />
            <div className="flex justify-center"><EmpireDayCountdown /></div>
            <MachineFomoTicker />
          </div>

          {/* DAILY ATTENDANCE — habit/streak driver */}
          <div className="mt-4">
            <AttendanceCard />
          </div>

          {/* TIER COMPARISON — 한국 유저 우월감 엔진 */}
          <div className="mt-4">
            <TierComparisonCard />
          </div>

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
          <div className="mt-5">
            <JackpotBanner />
          </div>

          {/* AI Auto Bots summary */}
          <div className="mt-5">
            <ActiveBotsMini />
          </div>

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
          <div className="mt-8">
            <LiveRanking />
          </div>

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
