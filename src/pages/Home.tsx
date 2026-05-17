import { Link } from "react-router-dom";
import { lazy, Suspense } from "react";
import SlimShell from "@/components/layout/SlimShell";
import WorldHero from "@/components/nav/WorldHero";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { Coins, Gamepad2, TrendingUp, Radio, ArrowRight } from "lucide-react";
import { G } from "@/lib/glossary";

const WhaleStrikeRail = lazy(() => import("@/components/empire/WhaleStrikeRail"));
const LiveTicker = lazy(() => import("@pkg/live/components/LiveTicker"));
const Onboarding60s = lazy(() => import("@pkg/earn/components/Onboarding60s"));
const LivePayoutCounter = lazy(() => import("@/components/fomo/LivePayoutCounter"));
const LiveTradingCounter = lazy(() => import("@/components/fomo/LiveTradingCounter"));
const FoundingContendersBadge = lazy(() => import("@/components/fomo/FoundingContendersBadge"));

/**
 * /home — Sprint 0 슬림 홈.
 * 5초 룰: Hero + 4탭 + 큰 카드 4개 + 실시간 빅윈 + 60초 온보딩(1회).
 */

const CARDS = [
  {
    to: "/earn",
    title: G.tabEarn,
    line1: "출석·미션·친구초대로",
    line2: "오늘도 무료 PHON",
    icon: Coins,
    accent: "from-amber-500/20 to-yellow-500/10 border-amber-500/40",
  },
  {
    to: "/games",
    title: G.tabGames,
    line1: "슬롯 12종 · 크래쉬 · 룰렛",
    line2: "오늘 무료 1회",
    icon: Gamepad2,
    accent: "from-pink-500/20 to-rose-500/10 border-pink-500/40",
  },
  {
    to: "/trade",
    title: G.tabTrade,
    line1: "BTC·ETH 가격 베팅",
    line2: "데모로 먼저 연습",
    icon: TrendingUp,
    accent: "from-emerald-500/20 to-teal-500/10 border-emerald-500/40",
  },
  {
    to: "/live",
    title: G.tabLive,
    line1: "지금 누가 얼마 벌고 있나",
    line2: "랭킹 · 빅윈 · VIP",
    icon: Radio,
    accent: "from-violet-500/20 to-fuchsia-500/10 border-violet-500/40",
  },
];

export default function Home() {
  const user = useRequireAuth();
  if (!user) return null;

  return (
    <SlimShell>
      <WorldHero />

      <div className="container py-6 space-y-5">
        {/* 위에서 아래로 = 한 결정: 지금 누가 벌고 있나 → 어디로 들어갈지 */}
        <Suspense fallback={null}>
          <div className="grid grid-cols-3 gap-2">
            <LivePayoutCounter />
            <LiveTradingCounter compact />
            <FoundingContendersBadge />
          </div>
        </Suspense>

        {/* 4 큰 카드 — 한 화면에 끝남 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {CARDS.map((c) => {
            const Icon = c.icon;
            return (
              <Link
                key={c.to}
                to={c.to}
                className={`imperial-card imperial-card-hover imperial-corner-shine group relative overflow-hidden bg-gradient-to-br ${c.accent} p-5 press`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[11px] tracking-[0.3em] font-black text-foreground/70 uppercase mb-1">
                      {c.title}
                    </div>
                    <div className="font-imperial text-lg text-foreground leading-tight">
                      {c.line1}
                    </div>
                    <div className="text-sm text-muted-foreground mt-0.5">
                      {c.line2}
                    </div>
                  </div>
                  <div className="shrink-0 w-11 h-11 rounded-xl glass border border-border/40 flex items-center justify-center text-primary">
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-4 inline-flex items-center gap-1 text-[11px] font-bold text-primary opacity-80 group-hover:opacity-100">
                  들어가기 <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                </div>
              </Link>
            );
          })}
        </div>

        {/* 실시간 빅윈 마키 — 5번째이자 마지막 카드 (≤6 룰) */}
        <Suspense fallback={null}>
          <WhaleStrikeRail compact />
        </Suspense>
      </div>

      {/* 하단 고정 실시간 티커 */}
      <Suspense fallback={null}>
        <LiveTicker />
      </Suspense>

      {/* 60초 온보딩 — 첫 방문 1회만 자동 노출 */}
      <Suspense fallback={null}>
        <Onboarding60s />
      </Suspense>
    </SlimShell>
  );
}
