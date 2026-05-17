import { useEffect, useRef, lazy, Suspense } from "react";
import Layout from "@/components/Layout";
import { useDB } from "@/lib/store";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { refreshWallet } from "@/lib/missions-rpc";
import DashboardBetPanel, { type BetPanelHandle } from "@/components/dashboard/DashboardBetPanel";
import RecoveryPrompt from "@/components/dashboard/RecoveryPrompt";
import StreakBadge from "@/components/dashboard/StreakBadge";
import WithdrawNudge from "@/components/dashboard/WithdrawNudge";
import ImperialLivePulseRail from "@/components/empire/ImperialLivePulseRail";
import ImperialLiveWinsRail from "@/components/empire/ImperialLiveWinsRail";
import Disclaimer from "@/components/Disclaimer";

// V3 — Imperial hero flow only
import DashboardHeroV3 from "@/components/dashboard/v3/DashboardHeroV3";
import TradingEntryCard from "@/components/dashboard/v3/TradingEntryCard";
import ImperialJourneyMap from "@/components/journey/ImperialJourneyMap";
const DailyBriefingCard = lazy(() => import("@/components/dashboard/DailyBriefingCard"));
const VipWhalePreview = lazy(() => import("@/components/empire/VipWhalePreview"));
import JourneyClaimPanel from "@/components/journey/JourneyClaimPanel";
import KpiGridV3 from "@/components/dashboard/v3/KpiGridV3";
import MoreSection, { type MoreSectionHandle } from "@/components/dashboard/v3/MoreSection";
import { useMyPower } from "@/hooks/use-my-power";
import { useOnline } from "@/components/LiveStats";

/**
 * Dashboard — v19 Phase 0 Clean Rebuild.
 * Only the approved Imperial hero flow remains. All war / arena / battle /
 * legacy growth widgets are unmounted (files preserved for other pages).
 */
export default function Dashboard() {
  const [db] = useDB();
  const user = useRequireAuth();
  const betRef = useRef<BetPanelHandle>(null);
  const moreRef = useRef<MoreSectionHandle>(null);

  useEffect(() => { void refreshWallet(); }, []);

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

  const { phon, nfts } = useMyPower();
  const online = useOnline();

  if (!user) return null;

  return (
    <Layout>
      <div className="container pt-3 flex flex-col gap-3">
        <ImperialLivePulseRail />
        <ImperialLiveWinsRail />
      </div>

      {/* 🌌 100vh Cosmic Hero — 단일 CTA */}
      <DashboardHeroV3 phon={phon} nfts={nfts} online={online} />

      <div className="container relative pt-6 pb-12 space-y-6">
        {/* 🌅 Daily Imperial Briefing */}
        <Suspense fallback={null}><DailyBriefingCard /></Suspense>

        {/* 👑 VIP 30초 선공개 — VIP만 노출 */}
        <Suspense fallback={null}><VipWhalePreview /></Suspense>

        {/* 👑 Imperial Journey — 100단계 진행 + 다음 행동 1개 */}
        <ImperialJourneyMap />

        {/* 🎁 100-Stage Claim Panel */}
        <JourneyClaimPanel />

        {/* ⚡ 핵심 베팅 진입 카드 */}
        <TradingEntryCard />

        {/* 🎰 Olympus Slots 진입 */}
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

        {/* 📦 더 보기 — 폐하의 전략 패널만 유지 */}
        <MoreSection ref={moreRef}>
          <div className="flex items-center justify-between gap-2 pt-2">
            <div className="text-[10px] tracking-[0.3em] font-bold text-primary/80">폐하의 전략 패널</div>
            <StreakBadge />
          </div>
          <RecoveryPrompt onResubmit={() => betRef.current?.resubmit()} />
          <DashboardBetPanel ref={betRef} />
          <WithdrawNudge />
          <Disclaimer />
        </MoreSection>
      </div>
    </Layout>
  );
}
