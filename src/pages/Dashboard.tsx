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
import SixtySecondFlow from "@/components/onboarding/SixtySecondFlow";
import EarnedToast from "@/components/onboarding/EarnedToast";
import EmpireSignature from "@/components/status/EmpireSignature";
import LivePurchaseTicker from "@/components/conversion/LivePurchaseTicker";
import TierComparisonCard from "@/components/status/TierComparisonCard";
import { useWinback } from "@/hooks/use-winback";

export default function Dashboard() {
  const [db] = useDB();
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

        <div className="container relative pt-6 pb-10">
          {/* 🏛️ Command Hero — 영웅 카드 (잔고 + 추천 미션 + 30석) */}
          <CommandHero />

          {/* Live ticker (compact, beneath hero) */}
          <div className="grid grid-cols-2 gap-2 mt-4 mb-4">
            <div className="glass rounded-2xl p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-secondary/20 flex items-center justify-center"><Users className="w-4 h-4 text-secondary" /></div>
              <div>
                <div className="text-[10px] text-muted-foreground flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" /> 현재 접속자</div>
                <div className="font-display font-black text-sm tabular-nums">{online.toLocaleString()}명</div>
              </div>
            </div>
            <div className="glass rounded-2xl p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center"><Activity className="w-4 h-4 text-primary" /></div>
              <div>
                <div className="text-[10px] text-muted-foreground flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" /> 오늘 정산액</div>
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
                  <div className="text-xs text-muted-foreground tracking-widest">현재 잔고</div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-gold/20 text-gold font-bold">{user.tier}</span>
                </div>
                <button onClick={() => { setBurst(true); setTimeout(() => setBurst(false), 1600); }}
                  className="font-display font-black text-4xl sm:text-5xl mt-2 text-gradient-gold block sm:hover:scale-105 transition">
                  {formatKRW(user.balance)}
                </button>
                <div className="mt-2 text-xs text-muted-foreground">
                  코인 잔고 <span className="text-secondary font-bold">{user.coinBalance.toLocaleString()} USDT</span>
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs text-secondary">
                  <TrendingUp className="w-3.5 h-3.5" /> 오늘 +{formatKRW(user.todayEarnings)} 적립됨
                </div>
              </div>

              <div className="relative grid grid-cols-3 gap-2 mt-6">
                <Stat icon={Flame} label="연속" value={`${user.streak}일`} color="text-primary" />
                <Stat icon={Zap} label="레벨" value={`Lv.${user.level}`} color="text-secondary" />
                <Stat icon={Trophy} label="XP" value={`${user.xp}`} color="text-gold" />
              </div>

              <div className="relative mt-3">
                <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                  <span>다음 등급까지</span>
                  <span>{user.xp}/{user.level * 1000} XP</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-primary glow-primary" style={{ width: `${Math.min(100, (user.xp / (user.level * 1000)) * 100)}%` }} />
                </div>
              </div>

              <div className="relative grid grid-cols-2 gap-2 mt-3">
                <Link to="/wallet" className="press sheen py-3 rounded-xl bg-gradient-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-1.5 glow-primary">
                  <Wallet className="w-4 h-4" /> 출금하기
                </Link>
                <Link to="/packages" className="press sheen py-3 rounded-xl glass border border-border font-bold text-sm flex items-center justify-center gap-1.5">
                  <Crown className="w-4 h-4 text-gold" /> 패키지
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
                  <div className="font-display font-black text-base flex items-center gap-2">
                    🎰 럭키 룰렛 <span className="text-[10px] px-2 py-0.5 rounded-full bg-gold/20 text-gold font-bold">매일 무료</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">스핀 보너스 · EMPIRE 황금 가챠</div>
                </div>
                <div className="text-2xl">→</div>
              </div>
            </div>
          </Link>

          {/* GAMIFICATION ENTRY — Phase 26 */}
          <div className="grid grid-cols-3 gap-2 mt-4">
            <Link to="/quests" className="press glass-strong rounded-2xl p-3 border border-amber-500/20 flex flex-col items-center gap-1">
              <span className="text-2xl">⚡</span>
              <span className="text-[11px] font-bold">퀘스트</span>
            </Link>
            <Link to="/season-pass" className="press glass-strong rounded-2xl p-3 border border-fuchsia-500/20 flex flex-col items-center gap-1 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-500/10 to-violet-600/10" />
              <span className="text-2xl relative">✨</span>
              <span className="text-[11px] font-bold relative">시즌 패스</span>
            </Link>
            <Link to="/achievements" className="press glass-strong rounded-2xl p-3 border border-primary/20 flex flex-col items-center gap-1">
              <span className="text-2xl">🏆</span>
              <span className="text-[11px] font-bold">업적</span>
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
              { to: "/missions", label: "미션", icon: "🎯", grad: "from-primary/20 to-primary/5" },
              { to: "/packages", label: "패키지", icon: "👑", grad: "from-gold/20 to-gold/5" },
              { to: "/wallet", label: "충전", icon: "💎", grad: "from-secondary/20 to-secondary/5" },
              { to: "/support", label: "고객센터", icon: "💬", grad: "from-accent/20 to-accent/5" },
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
                <Sparkles className="w-4 h-4 text-primary" /> 오늘의 추천 미션
              </h2>
              <Link to="/missions" className="text-xs text-muted-foreground hover:text-foreground flex items-center">전체 <ChevronRight className="w-3 h-3" /></Link>
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
