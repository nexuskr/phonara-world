/**
 * /phon — PHON 허브 (잔액 · 혜택 · 다음 티어 · 컬렉션)
 *
 * 가상 화폐 PHON의 경제적 가치를 한 화면에 보여주는 페이지.
 * 신규 RPC 없음 — useMyPower 와 기존 컴포넌트 재활용.
 */
import { lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { useMyPower } from "@/hooks/use-my-power";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingList } from "@/components/ui/loading-state";
import { Sparkles, ArrowRight } from "lucide-react";
import { FOMO } from "@/lib/glossary";

const PhonAdvantageRibbon = lazy(() => import("@/components/trading/v3/PhonAdvantageRibbon"));
const EmpireCollection = lazy(() => import("@/pages/EmpireCollection"));
const PhonEconomyExplainer = lazy(() => import("@/components/phon/PhonEconomyExplainer"));
const PhonSwapBridge = lazy(() => import("@/components/phon/PhonSwapBridge"));
const PhonStakingPanel = lazy(() => import("@/components/phon/PhonStakingPanel"));
const PhonHubDashboard = lazy(() => import("@/components/phonhub/v3/PhonHubDashboard"));

function fmt(n: number) {
  return new Intl.NumberFormat("ko-KR").format(Math.floor(n));
}

function PhonHero() {
  const { phon, maxLeverage, boostPct, loading } = useMyPower();
  if (loading) return <LoadingList rows={2} />;
  return (
    <Card className="relative overflow-hidden rounded-2xl border-pink/30 bg-gradient-to-br from-primary/10 via-card/60 to-pink/10 p-6">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-pink/5 pointer-events-none" />
      <div className="relative">
        <div className="text-[11px] tracking-[0.3em] font-black text-pink uppercase mb-2">
          나의 PHON 자산
        </div>
        <div className="flex items-baseline gap-2">
          <span className="font-imperial text-4xl md:text-5xl text-gradient-imperial tabular-nums">
            {fmt(phon)}
          </span>
          <span className="text-lg font-bold text-primary/80">PHON</span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl glass border border-border/40 p-3">
            <div className="text-[10px] tracking-widest text-muted-foreground mb-1">최대 레버리지</div>
            <div className="font-imperial text-xl text-pink">{maxLeverage}x</div>
          </div>
          <div className="rounded-xl glass border border-border/40 p-3">
            <div className="text-[10px] tracking-widest text-muted-foreground mb-1">NFT 부스트</div>
            <div className="font-imperial text-xl text-primary">+{boostPct}%</div>
          </div>
        </div>
      </div>
    </Card>
  );
}


function NextTierProgress() {
  const { phon, nextThreshold } = useMyPower();
  if (!nextThreshold) {
    return (
      <Card className="rounded-2xl border-primary/30 bg-card/60 p-5">
        <div className="flex items-center gap-2 text-primary">
          <Sparkles className="w-4 h-4" />
          <span className="font-imperial">최고 등급 도달 — 폐하의 자리가 굳건합니다.</span>
        </div>
      </Card>
    );
  }
  const need = Math.max(0, (nextThreshold as any).need_phon ?? 0);
  const targetLabel = (nextThreshold as any).next_label ?? "다음 등급";
  const pct = need > 0 ? Math.min(100, (phon / (phon + need)) * 100) : 100;
  return (
    <Card className="rounded-2xl border-pink/30 bg-card/60 p-5">
      <div className="flex items-baseline justify-between mb-2">
        <div className="text-[11px] tracking-[0.3em] font-black text-pink uppercase">다음 티어까지</div>
        <div className="text-sm text-muted-foreground">{targetLabel}</div>
      </div>
      <div className="font-imperial text-2xl text-foreground tabular-nums">
        +{fmt(need)} <span className="text-base text-muted-foreground">PHON</span>
      </div>
      <div className="mt-3 h-2 rounded-full bg-muted/40 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-primary to-pink transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <Link to="/wallet?tab=deposit">
        <Button className="mt-4 w-full bg-gradient-to-r from-primary to-pink text-primary-foreground font-bold min-h-12">
          지금 입금하고 등급 올리기 <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </Link>
    </Card>
  );
}


export default function PhonHub() {
  const user = useRequireAuth();
  if (!user) return null;

  return (
    <Layout>
      <div className="container py-5 space-y-5 max-w-3xl">
        <div className="contain-card stack-rhythm-sm">
          <div className="eyebrow-imperial">{FOMO.phonEyebrow}</div>
          <h1 className="h-imperial text-3xl md:text-4xl imperial-halfoff-text tracking-[0.18em]">
            PHON
          </h1>
          <p className="text-[12px] text-muted-foreground tracking-wide">
            오늘도 폐하의 제국이 매일 자라고 있습니다.
          </p>
        </div>

        <Suspense fallback={<LoadingList rows={3} />}>
          <PhonHubDashboard />
        </Suspense>

        <Suspense fallback={null}>
          <PhonAdvantageRibbon />
        </Suspense>

        <Suspense fallback={<LoadingList rows={2} />}>
          <PhonEconomyExplainer />
        </Suspense>

        <Suspense fallback={null}>
          <PhonSwapBridge />
        </Suspense>

        <NextTierProgress />

        <Suspense fallback={null}>
          <PhonStakingPanel />
        </Suspense>

        <div>
          <div className="text-[11px] tracking-[0.3em] font-black text-foreground/70 uppercase mb-3 px-1">
            나의 NFT 컬렉션
          </div>
          <Suspense fallback={<LoadingList rows={3} />}>
            <EmpireCollection />
          </Suspense>
        </div>
      </div>
    </Layout>
  );
}
