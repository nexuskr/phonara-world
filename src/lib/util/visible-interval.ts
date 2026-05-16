// P3 — visibility-aware interval & document-visible hook.
//
// 백그라운드 탭에서도 setInterval은 그대로 도는 브라우저(데스크톱) 동작 때문에
// 60s 폴링 RPC 30개가 백그라운드에서 분당 600+ 호출을 유발한다.
// 이 헬퍼는 `document.hidden` 동안 콜백 호출을 skip 하고,
// 탭이 다시 보이면 즉시 1회 호출(catch-up) 후 정상 주기를 재개한다.
//
// framer-motion 무한 애니메이션도 같은 visibility 신호로 일시정지하기 위해
// `useDocumentVisible()` 훅을 함께 제공한다.

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { trackInterval, forgetInterval, isCategoryPaused } from "@pkg/runtime";
import type { RuntimeCategory } from "@pkg/runtime";

type Cleanup = () => void;

export type VisibleIntervalMeta = {
  owner?: string;
  category?: RuntimeCategory;
};

/**
 * setInterval 대체. document.hidden 이면 콜백을 skip 한다.
 * 옵션:
 *  - leading=true → 처음 1회 즉시 실행
 *  - catchUpOnVisible=true → 숨김→보임 전환 시 즉시 1회 실행
 *  - meta → DEV ledger 분류 (owner/category). prod 영향 0.
 */
export function setVisibleInterval(
  fn: () => void,
  ms: number,
  opts: { leading?: boolean; catchUpOnVisible?: boolean; meta?: VisibleIntervalMeta } = {},
): Cleanup {
  const { leading = false, catchUpOnVisible = true, meta } = opts;
  if (typeof window === "undefined") return () => {};
  const cat: RuntimeCategory = meta?.category ?? "cosmetic";

  let lastRun = 0;
  const tick = () => {
    if (typeof document !== "undefined" && document.hidden) return;
    // PR-G: governor-paused categories skip cooperatively.
    if (isCategoryPaused(cat)) return;
    lastRun = Date.now();
    try { fn(); } catch (e) { console.error("[visible-interval]", e); }
  };

  if (leading) tick();
  const id = window.setInterval(tick, ms);

  // Phase 2 Visibility — register as TRACKED (intentional). DEV-only side effect.
  trackInterval(id, {
    owner: meta?.owner ?? "anonymous:setVisibleInterval",
    intervalMs: ms,
    category: cat,
    createdAt: Date.now(),
  });

  const onVisible = () => {
    if (document.hidden) return;
    if (!catchUpOnVisible) return;
    if (Date.now() - lastRun >= ms) tick();
  };
  document.addEventListener("visibilitychange", onVisible);

  return () => {
    window.clearInterval(id);
    forgetInterval(id);
    document.removeEventListener("visibilitychange", onVisible);
  };
}

/* --------------------------- React hooks --------------------------- */

/**
 * useEffect 안에서 setVisibleInterval 을 깔끔하게 쓰기 위한 래퍼.
 * fn 은 ref 로 캡처하므로 deps 폭발 없이 항상 최신을 호출한다.
 */
export function useVisibleInterval(
  fn: () => void,
  ms: number,
  enabled: boolean = true,
  opts: { leading?: boolean; catchUpOnVisible?: boolean } = {},
) {
  const fnRef = useRef(fn);
  fnRef.current = fn;
  useEffect(() => {
    if (!enabled || ms <= 0) return;
    return setVisibleInterval(() => fnRef.current(), ms, opts);
    // opts.leading/catchUpOnVisible은 사실상 정적 — deps에서 제외
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ms]);
}

/* --------------------------- Visibility store --------------------------- */
// 단일 listener — 모든 컴포넌트가 같은 `document.hidden` 상태를 구독한다.

const visListeners = new Set<() => void>();
let visBound = false;
function bindVis() {
  if (visBound || typeof document === "undefined") return;
  visBound = true;
  document.addEventListener("visibilitychange", () => {
    visListeners.forEach((l) => { try { l(); } catch {} });
  });
}
function subscribeVis(l: () => void): Cleanup {
  bindVis();
  visListeners.add(l);
  return () => visListeners.delete(l);
}
function getVisSnapshot() {
  return typeof document === "undefined" ? true : !document.hidden;
}
const SSR_VIS = true;
const getVisServerSnapshot = () => SSR_VIS;

/**
 * 현재 탭이 보이는 상태인지(boolean). 탭 전환 시 자동 re-render.
 * framer-motion `animate` prop 에 조건부로 사용하기 위함.
 */
export function useDocumentVisible(): boolean {
  return useSyncExternalStore(subscribeVis, getVisSnapshot, getVisServerSnapshot);
}

/**
 * 컴포넌트가 (1) 탭이 보이고 (2) 뷰포트 안에 있을 때만 true.
 * useInViewport 와 함께 쓰는 합성 훅이 필요하면 이 자리에 추가.
 */
export function useDocumentVisibleAnd(extra: boolean): boolean {
  const visible = useDocumentVisible();
  const [v, setV] = useState(visible && extra);
  useEffect(() => { setV(visible && extra); }, [visible, extra]);
  return v;
}
