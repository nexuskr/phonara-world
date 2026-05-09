import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import Layout from "@/components/Layout";
import LiveCounterRow from "@/components/intelligence/LiveCounterRow";
import DecisionCoreCard from "@/components/intelligence/DecisionCoreCard";
import LongShortTradingPanel, { type PrefilledOrder } from "@/components/intelligence/LongShortTradingPanel";
import PaperPositionList from "@/components/intelligence/PaperPositionList";
import TradingHistoryPanel from "@/components/intelligence/TradingHistoryPanel";
import PersonalMemoryPanel from "@/components/intelligence/PersonalMemoryPanel";
import GlobalContributionBar from "@/components/intelligence/GlobalContributionBar";
import WinMomentOverlay from "@/components/intelligence/WinMomentOverlay";
import WeeklyLeaderboard from "@/components/intelligence/WeeklyLeaderboard";
import Disclaimer from "@/components/Disclaimer";
import { usePaperLiquidationWatcher } from "@/hooks/use-paper-positions";
import { useTrackView } from "@/lib/telemetry";

export default function GlobalIntelligence() {
  useTrackView("global_intel_view");
  usePaperLiquidationWatcher();
  const [prefilled, setPrefilled] = useState<PrefilledOrder | undefined>();

  useEffect(() => {
    document.title = "Trading Arena · Phonara";
  }, []);

  return (
    <Layout>
      <div className="container py-4 sm:py-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <Link to="/" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
              <ArrowLeft className="w-3 h-3" /> Home
            </Link>
            <h1 className="font-display font-black text-2xl sm:text-3xl mt-1">
              <span className="text-gradient-imperial">Global Intelligence</span> · Paper Trading Arena
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              세계 AI 의사결정 인텔리전스 인프라 — 당신의 결정이 데이터를 만듭니다.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-amber-400/40 bg-amber-400/5 p-3 flex items-start gap-2 text-xs">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <strong className="text-amber-400">Paper Trading 시뮬레이션</strong> — Trading Credit은 학습용 가상 잔고이며,
            실거래 Empire Balance에는 영향을 주지 않습니다. 입출금/정산은 일어나지 않습니다.
          </div>
        </div>

        <LiveCounterRow />
        <DecisionCoreCard onPick={(o) => setPrefilled({ ...o })} />

        <div className="grid lg:grid-cols-2 gap-4">
          <div className="space-y-4 lg:col-span-2">
            <LongShortTradingPanel prefilled={prefilled} />
          </div>
          <div className="space-y-4 lg:col-span-2">
            <h2 className="font-display font-bold text-base">Open Positions (Paper)</h2>
            <PaperPositionList />
          </div>
          <div className="lg:col-span-2"><TradingHistoryPanel /></div>
          <PersonalMemoryPanel />
          <GlobalContributionBar />
        </div>

        <Disclaimer />
      </div>
    </Layout>
  );
}
