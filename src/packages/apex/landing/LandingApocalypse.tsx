// Phase 4 P4-A — Landing Apocalypse.
// LCP-first hero (text + CSS gradient only). All sub-widgets are <Suspense>-lazy.
import { lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";

const LandingBigWinTicker = lazy(() => import("./LandingBigWinTicker"));
const LandingRaceCountdown = lazy(() => import("./LandingRaceCountdown"));
const TierSTeaserGrid = lazy(() => import("./TierSTeaserGrid"));
const TrustStrip = lazy(() => import("./TrustStrip"));
const InstallPrompt = lazy(() => import("../pwa/InstallPrompt"));

export default function LandingApocalypse() {
  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      {/* HERO — first-paint critical, zero images */}
      <section
        aria-label="ApexForge Hero"
        className="relative isolate overflow-hidden px-4 py-16 sm:py-24"
        style={{
          background:
            "radial-gradient(1200px 600px at 20% -10%, hsl(var(--primary)/0.20), transparent), radial-gradient(800px 500px at 100% 10%, hsl(var(--accent)/0.18), transparent)",
        }}
      >
        <div className="mx-auto max-w-5xl">
          <p className="mb-3 inline-block rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs uppercase tracking-widest text-primary">
            ApexForge · Live
          </p>
          <h1 className="text-4xl font-black leading-[1.05] sm:text-6xl">
            세계 1위 끝판왕 베팅 플랫폼.
            <span className="block bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              Provably-Fair. 즉시 정산. 출금 6분.
            </span>
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
            Stake · Rollbit · Bybit · Binance를 한 화면에서 압살. Tier S 5종 + Live Crash V2 + Cross-Chain Cashout.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/apex/games"
              className="rounded-md bg-primary px-6 py-3 text-base font-bold text-primary-foreground shadow-lg shadow-primary/30 transition-transform hover:scale-[1.02]"
            >
              지금 시작
            </Link>
            <Link
              to="/safe"
              className="rounded-md border border-border bg-card px-6 py-3 text-base font-medium text-foreground hover:bg-muted"
            >
              플랫폼 소개
            </Link>
          </div>
        </div>
      </section>

      <Suspense fallback={<Skeleton className="mx-auto my-6 h-10 max-w-5xl" />}>
        <LandingBigWinTicker />
      </Suspense>

      <Suspense fallback={<Skeleton className="mx-auto my-6 h-24 max-w-5xl" />}>
        <LandingRaceCountdown />
      </Suspense>

      <Suspense fallback={<Skeleton className="mx-auto my-10 h-64 max-w-5xl" />}>
        <TierSTeaserGrid />
      </Suspense>

      <Suspense fallback={null}>
        <TrustStrip />
      </Suspense>

      <Suspense fallback={null}>
        <InstallPrompt />
      </Suspense>
    </div>
  );
}
