import { ReactNode } from "react";
import PhonaraTopBar from "@/components/nav/PhonaraTopBar";
import PhonaraNav from "@/components/nav/PhonaraNav";

/**
 * SlimShell — v14.0 Great Simplification 전용 셸.
 * 헤비 Layout(사이드바·다중 위젯)을 의도적으로 배제하고
 * 깔끔한 TopBar + 4탭 + content 만 노출.
 */
export default function SlimShell({
  children,
  hideTabs = false,
}: {
  children: ReactNode;
  hideTabs?: boolean;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PhonaraTopBar />
      {!hideTabs && <PhonaraNav />}
      <main className="pb-[calc(var(--bottom-nav-h,5.5rem)+env(safe-area-inset-bottom))]">
        {children}
      </main>
    </div>
  );
}
