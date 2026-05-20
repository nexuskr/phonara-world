import { memo, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Zap } from "lucide-react";
import { useAuthReady } from "@/hooks/use-auth-ready";

/**
 * QuickDepositFab — 모바일 우하단 64px 골드 FAB.
 * thumb zone(우측 하단)에 배치, Bottom Nav 위 12px 간격.
 * 미로그인 / auth·legal·admin·apex 페이지에서는 자동 숨김.
 */

const HIDDEN_PREFIX = ["/apex", "/auth", "/secure-auth", "/legal", "/admin", "/welcome", "/guide", "/landing", "/safe", "/forgot-password", "/reset-password", "/auth/callback", "/complete-profile", "/wallet"];

function QuickDepositFabInner() {
  const loc = useLocation();
  const nav = useNavigate();
  const { hasSession } = useAuthReady();

  const onClick = useCallback(() => {
    nav("/wallet?intent=first-deposit&tab=deposit&amount=50000");
  }, [nav]);

  if (!hasSession) return null;
  if (HIDDEN_PREFIX.some((p) => loc.pathname.startsWith(p))) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="빠른 입금"
      className="
        md:hidden fixed right-4 z-30
        w-16 h-16 rounded-full
        bg-gradient-to-br from-amber-300 via-amber-400 to-amber-600
        text-black font-black
        shadow-[0_8px_28px_-4px_hsl(38_92%_60%/0.6)]
        ring-2 ring-amber-200/70
        flex flex-col items-center justify-center gap-0.5
        transition-transform duration-150 motion-reduce:transition-none
        active:scale-95
      "
      style={{
        bottom: "calc(72px + max(var(--safe-bottom), var(--kb-inset)) + 12px)",
        touchAction: "manipulation",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      <Zap className="w-6 h-6" strokeWidth={2.75} aria-hidden />
      <span className="text-[10px] leading-none tracking-tight">입금</span>
    </button>
  );
}

export const QuickDepositFab = memo(QuickDepositFabInner);
export default QuickDepositFab;
