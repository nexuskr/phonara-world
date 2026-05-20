import { lazy, Suspense, useState, useCallback, useEffect } from "react";
import MobileBottomNav from "./MobileBottomNav";
import QuickDepositFab from "./QuickDepositFab";

// MoreSheet uses vaul + several icons → lazy to keep Layer 1 lean.
const MoreSheet = lazy(() => import("./MoreSheet"));

/**
 * MobileShell — 단일 진입점.
 * - MobileBottomNav (5탭, 항상 마운트, md+ 자동 숨김)
 * - MoreSheet (오픈 시 lazy)
 * - QuickDepositFab (로그인 + 허용 경로에서만 표시)
 */
export default function MobileShell() {
  const [moreOpen, setMoreOpen] = useState(false);
  const openMore = useCallback(() => setMoreOpen(true), []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const root = document.documentElement;
    const setMetrics = () => {
      const vv = window.visualViewport;
      const height = vv?.height ?? window.innerHeight;
      const offsetTop = vv?.offsetTop ?? 0;
      const keyboardInset = Math.max(0, window.innerHeight - height - offsetTop);
      root.style.setProperty("--app-vh", `${height}px`);
      root.style.setProperty("--kb-inset", `${keyboardInset}px`);
    };

    setMetrics();
    window.addEventListener("resize", setMetrics);
    window.addEventListener("orientationchange", setMetrics);
    window.visualViewport?.addEventListener("resize", setMetrics);
    window.visualViewport?.addEventListener("scroll", setMetrics);

    return () => {
      window.removeEventListener("resize", setMetrics);
      window.removeEventListener("orientationchange", setMetrics);
      window.visualViewport?.removeEventListener("resize", setMetrics);
      window.visualViewport?.removeEventListener("scroll", setMetrics);
    };
  }, []);

  return (
    <>
      <MobileBottomNav onMoreOpen={openMore} />
      <QuickDepositFab />
      {moreOpen && (
        <Suspense fallback={null}>
          <MoreSheet open={moreOpen} onOpenChange={setMoreOpen} />
        </Suspense>
      )}
    </>
  );
}
