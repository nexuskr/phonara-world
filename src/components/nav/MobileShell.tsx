import { useEffect } from "react";
import MobileBottomNav from "./MobileBottomNav";

/**
 * MobileShell — 모바일 단일 진입점.
 * P1-C v8: FAB(QuickDepositFab) + MoreSheet 제거.
 * 오직 MobileBottomNav5 (홈/무료돈벌기/실시간대결/실시간예측/내PHON) 만 렌더.
 */
export default function MobileShell() {
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

  return <MobileBottomNav />;
}
