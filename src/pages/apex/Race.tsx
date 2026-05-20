/**
 * /apex/race — P3-D Stake-style race + rakeback.
 */
import { Suspense, lazy } from "react";

const RaceLeaderboard = lazy(() => import("@/packages/apex/race/RaceLeaderboard"));
const RakebackCard = lazy(() => import("@/packages/apex/race/RakebackCard"));

export default function ApexRacePage() {
  return (
    <div className="container max-w-5xl py-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-black apex-gradient-text">RACE · RAKEBACK</h1>
        <p className="text-sm text-muted-foreground">Stake.com / Rollbit 압도 — 24h + 주간 베팅 레이스 + 매일 자동 rakeback.</p>
      </header>
      <Suspense fallback={<div className="text-sm text-muted-foreground">로딩…</div>}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="md:col-span-2"><RaceLeaderboard /></div>
          <div><RakebackCard /></div>
        </div>
      </Suspense>
    </div>
  );
}
