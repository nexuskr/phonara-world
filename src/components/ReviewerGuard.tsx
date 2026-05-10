import { ReactNode } from "react";
import { useReviewerMode } from "@/lib/reviewerMode";
import { Navigate } from "react-router-dom";
import { EmptyState } from "@/components/ui/empty-state";
import { Lock } from "lucide-react";

/**
 * Phase 10 — Reviewer Guard
 *
 * Wraps a finance/gambling-style route. When Reviewer Mode is on, redirects to /guide
 * (safe content) or renders a generic "feature unavailable" placeholder when `inline`.
 */
export function ReviewerGuard({
  children,
  inline = false,
  fallbackPath = "/guide",
}: {
  children: ReactNode;
  inline?: boolean;
  fallbackPath?: string;
}) {
  const reviewer = useReviewerMode();
  if (!reviewer) return <>{children}</>;
  if (inline) {
    return (
      <EmptyState
        icon={<Lock className="w-6 h-6" />}
        title="현재 이 기능은 사용할 수 없습니다"
        description="콘텐츠 검토용 모드에서는 일부 기능이 제한됩니다."
      />
    );
  }
  return <Navigate to={fallbackPath} replace />;
}
