import { lazy, Suspense, useState, useCallback } from "react";
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
