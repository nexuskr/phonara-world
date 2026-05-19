// 우상단 통합 진단 토글 (모든 ApexForge 영역을 1탭으로).
import { Link, useLocation } from "react-router-dom";

export function ApexHealthFab() {
  const loc = useLocation();
  if (!loc.pathname.startsWith("/apex")) return null;
  if (loc.pathname.startsWith("/apex/health")) return null;
  return (
    <Link
      to="/apex/health"
      aria-label="Apex Health Dock"
      className="fixed bottom-20 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full border border-primary/40 bg-background/80 text-primary shadow-lg backdrop-blur-md transition hover:scale-105 hover:bg-primary hover:text-primary-foreground sm:bottom-6"
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    </Link>
  );
}
export default ApexHealthFab;
