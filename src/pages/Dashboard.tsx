import { useEffect, useRef, lazy, Suspense } from "react";
import Layout from "@/components/Layout";
import LazyMount from "@/components/util/LazyMount";
import BoostHeroCard from "@/components/BoostHeroCard";
import { useDB } from "@/lib/store";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { refreshWallet } from "@/lib/missions-rpc";
import DashboardBetPanel, { type BetPanelHandle } from "@/components/dashboard/DashboardBetPanel";
import RecoveryPrompt from "@/components/dashboard/RecoveryPrompt";
import StreakBadge from "@/components/dashboard/StreakBadge";
import WithdrawNudge from "@/components/dashboard/WithdrawNudge";
import CommandHero from "@/components/CommandHero";
import { FomoNotificationStrip } from "@/components/empire/FomoNotificationStrip";
import WhaleStrikeRail from "@/components/empire/WhaleStrikeRail";
import LiveRankingMarquee from "@/components/LiveRankingMarquee";
import CrownWarHUD from "@/components/empire/CrownWarHUD";
import EmpireSignature from "@/components/status/EmpireSignature";
import { useWinback } from "@/hooks/use-winback";
import HubTabs from "@/components/HubTabs";
import Disclaimer from "@/components/Disclaimer";
import { isFlagOn } from "@/lib/conversion-flags";
import { SIXTY_SECOND_FLOW_KEY } from "@/components/onboarding/SixtySecondFlow";
import { useState } from "react";

// V3 — 우주 끝판왕 핵심
import DashboardHeroV3 from "@/components/dashboard/v3/DashboardHeroV3";
import TradingEntryCard from "@/components/dashboard/v3/TradingEntryCard";
import ImperialJourneyMap from "@/components/journey/ImperialJourneyMap";
import ImperialStoryRail from "@/components/empire/ImperialStoryRail";
const DailyBriefingCard = lazy(() => import("@/components/dashboard/DailyBriefingCard"));
const VipWhalePreview = lazy(() => import("@/components/empire/VipWhalePreview"));
import JourneyClaimPanel from "@/components/journey/JourneyClaimPanel";
import KpiGridV3 from "@/components/dashboard/v3/KpiGridV3";
import MoreSection, { type MoreSectionHandle } from "@/components/dashboard/v3/MoreSection";
import { useMyPower } from "@/hooks/use-my-power";
import { useOnline } from "@/components/LiveStats";
import RoutingMigrationBanner from "@/components/RoutingMigrationBanner";
import ChurnReactivationBanner from "@/components/reactivation/ChurnReactivationBanner";
const DailyChest = lazy(() => import("@/components/gamification/DailyChest"));
const LevelProgressBar = lazy(() => import("@/components/gamification/LevelProgressBar"));
const LivePayoutCounter = lazy(() => import("@/components/fomo/LivePayoutCounter"));
const FriendLeaderboard = lazy(() => import("@/components/fomo/FriendLeaderboard"));
const FriendGapToast = lazy(() => import("@/components/fomo/FriendGapToast"));
const FoundingContendersBadge = lazy(() => import("@/components/fomo/FoundingContendersBadge"));

// 접힘 영역에 들어가는 기존 컴포넌트들 — 모두 lazy
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

export default function Dashboard() {
  const [db] = useDB();
  const user = useRequireAuth();
  const betRef = useRef<BetPanelHandle>(null);
  const moreRef = useRef<MoreSectionHandle>(null);
  const [allowOnboardingV2, setAllowOnboardingV2] = useState(false);

  useEffect(() => { void refreshWallet(); }, []);
  useWinback();

  // CTA / focus 이벤트 통합 — More 펼침 + 베팅 패널 포커스
  useEffect(() => {
    const focus = () => {
      moreRef.current?.open();
      setTimeout(() => betRef.current?.focusAmount(), 320);
    };
    const onFocusBet = () => focus();
    const onFocusTrade = () => focus();
    window.addEventListener("phonara:focus-bet", onFocusBet);
    window.addEventListener("phonara:focus-trade", onFocusTrade);
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.get("focus") === "bet") {
        setTimeout(focus, 500);
        url.searchParams.delete("focus");
        window.history.replaceState({}, "", url.toString());
      }
    } catch {}
    return () => {
      window.removeEventListener("phonara:focus-bet", onFocusBet);
      window.removeEventListener("phonara:focus-trade", onFocusTrade);
    };
  }, []);

  useEffect(() => {
    if (!user || typeof window === "undefined") { setAllowOnboardingV2(false); return; }
    try {
      setAllowOnboardingV2(!isFlagOn("sixtySecondFlow") || !!localStorage.getItem(SIXTY_SECOND_FLOW_KEY));
    } catch {
      setAllowOnboardingV2(!isFlagOn("sixtySecondFlow"));
    }
  }, [user]);

  // Single shared subscription — passed down to Hero & KpiGrid as props
  // to eliminate duplicate RPC + realtime channels.
  // IMPORTANT: must be called BEFORE any early return to keep hook order stable.
  const { phon, nfts } = useMyPower();
  const online = useOnline();

  if (!user) return null;

  return (
    <Layout>
      <RoutingMigrationBanner />
      <div className="container pt-3"><ChurnReactivationBanner /></div>
      <div className="container pt-3 grid gap-3 md:grid-cols-2">
        <Suspense fallback={null}><DailyChest /></Suspense>
        <Suspense fallback={null}><LevelProgressBar /></Suspense>
      </div>
      <Suspense fallback={null}>
        <FirstDepositTopBanner />
        <SixtySecondFlow enabled={!!user} onClosed={() => setAllowOnboardingV2(true)} />
        <EarnedToast />
        <LivePurchaseTicker />
        <OnboardingV2 enabled={!!user && allowOnboardingV2} />
      </Suspense>
      <EmpireSignature />

      {/* 🌌 100vh Cosmic Hero — 단일 CTA */}
      <DashboardHeroV3 phon={phon} nfts={nfts} online={online} />

      <div className="container relative pt-6 pb-12 space-y-6">
        {/* 🌅 Daily AI Briefing — 5장 카드 */}
        <Suspense fallback={null}><DailyBriefingCard /></Suspense>

        {/* 👑 VIP 30초 선공개 — VIP만 노출 */}
        <Suspense fallback={null}><VipWhalePreview /></Suspense>

        {/* 📣 Imperial Stories — 자동 서사 라이브 */}
        <ImperialStoryRail />

        {/* 👑 Imperial Journey — 100단계 진행 + 다음 행동 1개 */}
        <ImperialJourneyMap />

        {/* 🎁 100-Stage Claim Panel */}
        <JourneyClaimPanel />

        {/* ⚡ 핵심 베팅 진입 카드 */}
        <TradingEntryCard />

        {/* 🎰 카지노 진입 — Olympus 1000 by Phonara */}
        <a
          href="/casino"
          className="block rounded-2xl border-2 border-primary/40 hover:border-primary glow-imperial transition press p-4 bg-gradient-to-br from-amber-950/30 via-background to-stone-950/40 relative overflow-hidden"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] tracking-[0.3em] text-primary/80 font-bold">PHONARA SLOTS</div>
              <div className="font-imperial text-lg text-gradient-imperial tracking-[0.18em] mt-1">
                Olympus 1000
              </div>
              <div className="text-[11px] text-muted-foreground mt-1">
                자체 슬롯 엔진 · DEMO 무료 · REAL은 PHON · RTP 96.0%
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-muted-foreground tracking-wider">MAX</div>
              <div className="font-mono text-xl font-black text-primary">1000×</div>
            </div>
          </div>
        </a>

        {/* 📊 KPI 4개 */}
        <KpiGridV3 nfts={nfts} online={online} />

        {/* 📦 더 보기 — 기존 카드 전부 보존 */}
        <MoreSection ref={moreRef}>
          <HubTabs hub="command" />
          <FomoNotificationStrip />
          <CrownWarHUD />
          <WhaleStrikeRail compact />

          <div className="flex items-center justify-between gap-2 pt-2">
            <div className="text-[10px] tracking-[0.3em] font-bold text-primary/80">우주 황제 베팅 패널</div>
            <StreakBadge />
          </div>
          <RecoveryPrompt onResubmit={() => betRef.current?.resubmit()} />
          <DashboardBetPanel ref={betRef} />
          <WithdrawNudge />

          <LiveRankingMarquee />
          <CommandHero />

          <LazyMount minHeight={320} rootMargin="400px 0px">
            <Suspense fallback={null}><EmpireP2EDashboard /></Suspense>
          </LazyMount>

          <BoostHeroCard />

          <LazyMount minHeight={280} rootMargin="400px 0px">
            <div className="grid gap-3 lg:grid-cols-[1fr_280px] items-start">
              <Suspense fallback={null}><PersonalizedFeedRail /></Suspense>
              <Suspense fallback={null}><RevenueWidget /></Suspense>
            </div>
          </LazyMount>

          <LazyMount minHeight={240} rootMargin="500px 0px">
            <Suspense fallback={null}><SevenDayChallengeCard /></Suspense>
            <div className="flex justify-center mt-3"><Suspense fallback={null}><EmpireDayCountdown /></Suspense></div>
            <div className="mt-3"><Suspense fallback={null}><MachineFomoTicker /></Suspense></div>
          </LazyMount>

          <LazyMount minHeight={120} rootMargin="500px 0px">
            <Suspense fallback={null}><AttendanceCard /></Suspense>
          </LazyMount>

          <LazyMount minHeight={140} rootMargin="500px 0px">
            <Suspense fallback={null}><TierComparisonCard /></Suspense>
          </LazyMount>

          <LazyMount minHeight={180} rootMargin="500px 0px">
            <Suspense fallback={null}><JackpotBanner /></Suspense>
          </LazyMount>

          <LazyMount minHeight={180} rootMargin="500px 0px">
            <Suspense fallback={null}><ActiveBotsMini /></Suspense>
          </LazyMount>

          <Suspense fallback={null}><FirstMissionCard /></Suspense>

          <LazyMount minHeight={320} rootMargin="600px 0px">
            <Suspense fallback={null}><LiveRanking /></Suspense>
          </LazyMount>
        </MoreSection>

        <Disclaimer />
      </div>
    </Layout>
  );
}
