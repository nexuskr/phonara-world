import { Link } from "react-router-dom";
import { ArrowRight, Zap } from "lucide-react";
import { markDepositIntent, ASSUMED_P50_SECONDS } from "@/lib/funnel";
import { useDB } from "@/lib/store";

/**
 * 3초 입금 동선 — 단일 CTA 히어로 (랜딩 최상단에 얹는 슬림 컴포넌트).
 *
 * - 비로그인:  /secure-auth?signup=1&next=/wallet?intent=first-deposit&tab=deposit&amount=50000
 * - 로그인 :  /wallet?intent=first-deposit&tab=deposit&amount=50000
 * - 디자인 토큰만 사용 (gold/imperial, 1픽셀 변경 없음).
 */
export default function ThreeSecondHero() {
  const [db] = useDB();
  const isLoggedIn = !!db.user?.id;
  const nextWallet = "/wallet?intent=first-deposit&tab=deposit&amount=50000";
  const href = isLoggedIn ? nextWallet : `/secure-auth?signup=1&next=${encodeURIComponent(nextWallet)}`;

  return (
    <div className="relative rounded-2xl border border-primary/40 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-3 sm:p-4 glow-imperial overflow-hidden">
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex w-10 h-10 rounded-xl bg-gradient-imperial items-center justify-center shrink-0">
          <Zap className="w-5 h-5 text-primary-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] tracking-[0.25em] font-bold text-primary uppercase">
            ⏱ 평균 첫 입금 {ASSUMED_P50_SECONDS}초
          </div>
          <div className="text-sm sm:text-base font-display font-black truncate">
            지금 바로 입금 시작 — 첫입금 +30% 보너스 자동 적용
          </div>
        </div>
        <Link
          to={href}
          onClick={() => markDepositIntent("three_second_hero", { logged_in: isLoggedIn })}
          className="press shrink-0 min-h-[48px] px-5 rounded-xl bg-gradient-imperial text-primary-foreground font-bold text-sm flex items-center gap-1.5"
        >
          시작하기
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
