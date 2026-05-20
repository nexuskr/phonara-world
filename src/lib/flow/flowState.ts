/**
 * Flow State Engine — PR-P1-B.
 *
 * 최초 1회 라우팅 결정만 책임. 머니플로/세션 가드와 무관한 UX 라우터.
 *  - first_visit (세션 X, 방문 기록 X) → "landing"
 *  - return_visit (세션 X, 방문 기록 O) → "landing" (재로그인 가능)
 *  - logged_in → "home" (=/dashboard)
 *  - practice_mode + 세션 X → "practice" (Practice 배너 + /home)
 *
 * 비정상 상태는 호출자가 별도 라우트(/secure-auth, /status, MaintenanceGate)에서 처리.
 */
export type FlowState =
  | "landing"
  | "practice"
  | "home"
  | "verify_email"
  | "kyc_pending"
  | "safe_mode"
  | "maintenance";

const VISITED_KEY = "phonara:flow:visited:v1";

export function isFirstVisit(): boolean {
  if (typeof window === "undefined") return false;
  try { return localStorage.getItem(VISITED_KEY) !== "1"; } catch { return false; }
}

export function markVisited() {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(VISITED_KEY, "1"); } catch { /* noop */ }
}

export interface FlowInput {
  hasSession: boolean;
  practiceMode: boolean;
  isFirst: boolean;
}

export function computeFlowState(input: FlowInput): FlowState {
  if (input.hasSession) return "home";
  if (input.practiceMode) return "practice";
  // first_visit 과 return_visit 모두 Landing 으로 — 차이는 markVisited() 사이드이펙트만.
  return "landing";
}

export function flowStateToPath(s: FlowState): string | null {
  switch (s) {
    case "home":      return "/dashboard";
    case "practice":  return "/home";
    case "landing":   return null; // stay on /
    default:          return null;
  }
}
