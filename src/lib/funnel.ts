/**
 * Landing → First Deposit Intent funnel timing.
 *
 * 목표: P50(Landing first paint → Deposit intent click) ≤ 3.0s.
 *
 * - 첫 진입 시점을 sessionStorage 에 1회 기록 (`funnel_landing_start_ms`).
 * - 사용자의 첫 입금 의도 클릭 시점에 경과 ms 를 `track()` 으로 전송.
 * - 가짜/시뮬레이션 X. 실제 사용자 타이밍만.
 */
import { track } from "@/lib/analytics";

const START_KEY = "funnel_landing_start_ms";
const INTENT_FIRED_KEY = "funnel_deposit_intent_fired";

export function markLandingStart() {
  if (typeof window === "undefined") return;
  try {
    if (!sessionStorage.getItem(START_KEY)) {
      sessionStorage.setItem(START_KEY, String(performance.now()));
      sessionStorage.removeItem(INTENT_FIRED_KEY);
      track("funnel_landing_start", { ts: Date.now() });
    }
  } catch {}
}

export function getLandingElapsedMs(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const s = sessionStorage.getItem(START_KEY);
    if (!s) return null;
    return Math.max(0, performance.now() - Number(s));
  } catch {
    return null;
  }
}

/**
 * 사용자의 첫 입금 의도 클릭 (CTA / 은행 딥링크 / 금액 칩 등) 발생 시 호출.
 * 세션 1회만 전송.
 */
export function markDepositIntent(surface: string, extra: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  try {
    if (sessionStorage.getItem(INTENT_FIRED_KEY)) return;
    const elapsed = getLandingElapsedMs();
    sessionStorage.setItem(INTENT_FIRED_KEY, "1");
    track("funnel_deposit_intent", {
      surface,
      elapsed_ms: elapsed == null ? null : Math.round(elapsed),
      under_3s: elapsed != null && elapsed <= 3000,
      ...extra,
    });
  } catch {}
}

/** 최근 24h 사이트 평균 (임시 — 실측 백엔드 집계 RPC 연결 전 placeholder). */
export const ASSUMED_P50_SECONDS = 2.7;
