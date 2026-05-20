import { ReactNode } from "react";
import PhonaraTopBar from "@/components/nav/PhonaraTopBar";

/**
 * SlimShell — v14.0 Great Simplification 셸.
 * 좌측 사이드바(데스크탑)·하단 5탭(모바일)은 App 루트에서 글로벌 마운트되므로
 * 여기서는 TopBar + content 만 노출. (이전 PhonaraNav 중복 마운트 제거)
 */
export default function SlimShell({
  children,
  hideTabs: _hideTabs = false,
}: {
  children: ReactNode;
  hideTabs?: boolean;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PhonaraTopBar />
      <main className="pb-[calc(var(--bottom-nav-h,5.5rem)+env(safe-area-inset-bottom))]">
        {children}
      </main>
    </div>
  );
}
