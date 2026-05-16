import { lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import PhonaraNav from "@/components/nav/PhonaraNav";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { Crown, Trophy, Users } from "lucide-react";

const WhaleStrikeRail = lazy(() => import("@/components/empire/WhaleStrikeRail"));
const LiveRanking = lazy(() => import("@/components/LiveRanking"));

/**
 * /live — 지금 벌고 있는 사람들.
 * 기존 Empire/Crown/Founding/Galaxy 콘텐츠가 이리로 흡수됨.
 */
export default function Live() {
  const user = useRequireAuth();
  if (!user) return null;

  return (
    <Layout>
      <PhonaraNav />

      <div className="container py-5 space-y-5">
        <header>
          <div className="text-[11px] tracking-[0.3em] font-black text-primary/80 uppercase">
            🔴 실시간
          </div>
          <h1 className="font-imperial text-2xl md:text-3xl text-gradient-imperial mt-1">
            지금 벌고 있는 사람들
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            빅윈 · 랭킹 · VIP · 명예의 전당 · 길드를 한곳에서.
          </p>
        </header>

        {/* 빅윈 마키 */}
        <Suspense fallback={null}>
          <WhaleStrikeRail compact />
        </Suspense>

        {/* 빠른 진입 카드 3개 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Link
            to="/vip"
            className="rounded-2xl border border-amber-500/40 bg-gradient-to-br from-amber-500/15 to-yellow-500/5 p-4 press hover:border-primary/60 transition"
          >
            <Crown className="w-5 h-5 text-amber-400 mb-2" />
            <div className="font-imperial text-base text-foreground">VIP 패스</div>
            <div className="text-xs text-muted-foreground mt-0.5">전용 라운지 · 환전 보너스 · 수수료 0%</div>
          </Link>

          <Link
            to="/empire"
            className="rounded-2xl border border-violet-500/40 bg-gradient-to-br from-violet-500/15 to-fuchsia-500/5 p-4 press hover:border-primary/60 transition"
          >
            <Trophy className="w-5 h-5 text-violet-400 mb-2" />
            <div className="font-imperial text-base text-foreground">명예의 전당</div>
            <div className="text-xs text-muted-foreground mt-0.5">이번 주 TOP · 시즌 좌석 · 레벨 1~10</div>
          </Link>

          <Link
            to="/lounge"
            className="rounded-2xl border border-emerald-500/40 bg-gradient-to-br from-emerald-500/15 to-teal-500/5 p-4 press hover:border-primary/60 transition"
          >
            <Users className="w-5 h-5 text-emerald-400 mb-2" />
            <div className="font-imperial text-base text-foreground">길드</div>
            <div className="text-xs text-muted-foreground mt-0.5">가입 · 주간 랭킹 · 토너먼트</div>
          </Link>
        </div>

        {/* 실시간 랭킹 */}
        <Suspense fallback={null}>
          <LiveRanking />
        </Suspense>
      </div>
    </Layout>
  );
}
