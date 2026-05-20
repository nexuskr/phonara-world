import { useEffect, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuthReady } from "@/hooks/use-auth-ready";
import { usePracticeMode } from "@/lib/practiceMode";
import {
  computeFlowState,
  flowStateToPath,
  isFirstVisit,
  markVisited,
} from "@/lib/flow/flowState";

/**
 * FlowRouter — `/` 라우트 래퍼.
 *  - 세션 있음 → /dashboard 로 리다이렉트
 *  - 세션 없음 + practice mode → /home 로 리다이렉트
 *  - 그 외 → children (Landing) 렌더
 *  - 첫 방문 플래그는 마운트 시 1회 기록.
 */
export default function FlowRouter({ children }: { children: ReactNode }) {
  const { isReady, hasSession } = useAuthReady();
  const [practice] = usePracticeMode();

  useEffect(() => {
    if (isFirstVisit()) markVisited();
  }, []);

  if (!isReady) return <>{children}</>;

  const state = computeFlowState({
    hasSession: !!hasSession,
    practiceMode: practice,
    isFirst: isFirstVisit(),
  });
  const dest = flowStateToPath(state);
  if (dest) return <Navigate to={dest} replace />;
  return <>{children}</>;
}
