/**
 * Practice Mode — 클라이언트 전용 시뮬레이션 안전모드.
 * 활성 시: 출금/입금 등 실거래 흐름은 인터스티셜로 차단.
 * 모든 트레이딩 결과는 시각적으로만 작동(서버 측 출금 RPC는 영향 없음 — UI 가드).
 */
const KEY = "pm_practice_mode";

export function isPracticeMode(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(KEY) === "1";
}

export function setPracticeMode(on: boolean) {
  if (typeof window === "undefined") return;
  if (on) localStorage.setItem(KEY, "1");
  else localStorage.removeItem(KEY);
  window.dispatchEvent(new CustomEvent("pm:practice-mode-change", { detail: on }));
}

import { useEffect, useState } from "react";

export function usePracticeMode(): [boolean, (on: boolean) => void] {
  const [on, setOn] = useState<boolean>(() => isPracticeMode());
  useEffect(() => {
    const h = (e: Event) => setOn(!!(e as CustomEvent).detail);
    window.addEventListener("pm:practice-mode-change", h as EventListener);
    return () => window.removeEventListener("pm:practice-mode-change", h as EventListener);
  }, []);
  return [on, setPracticeMode];
}
