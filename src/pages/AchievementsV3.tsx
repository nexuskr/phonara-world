// Pass 2 — /achievements/quest 페이지. AchievementTree 단독 호스팅.
import { lazy, Suspense } from "react";
import Layout from "@/components/Layout";
import { LoadingList } from "@/components/ui/loading-state";
import { Trophy } from "lucide-react";

const AchievementTree = lazy(() => import("@/components/achievements/v3/AchievementTree"));

export default function AchievementsV3() {
  return (
    <Layout>
      <div className="space-y-5 pb-24">
        <header className="rounded-3xl bg-gradient-to-br from-amber-500/15 via-background to-background border border-amber-400/20 p-6">
          <div className="flex items-center gap-3">
            <Trophy className="text-amber-400" />
            <h1 className="font-imperial text-2xl font-black tracking-tight break-keep">
              제국의 위업 — Quest Tree
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1 break-keep">
            폐하의 모든 발자취. 트레이딩 · 스테이킹 · 제국 · 소셜 · 데일리 5축, 30개 위업.
          </p>
        </header>

        <Suspense fallback={<LoadingList rows={6} />}>
          <AchievementTree />
        </Suspense>
      </div>
    </Layout>
  );
}
