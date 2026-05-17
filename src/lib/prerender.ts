/**
 * Hybrid Prerender helpers.
 *
 * - `isPrerender()`  → 런타임 판별. Playwright headless 가 `phonara-prerender`
 *                      User-Agent 로 라우트를 캡처하는 동안에만 true.
 *                      공개 페이지 컴포넌트 최상단에서 가드해 민감 훅
 *                      (인증/실시간/머니플로) 호출 자체를 차단하는 용도.
 * - `isPrerenderBuild()` → 빌드 산출물 안에서 prerender 단계를 식별하기 위한
 *                          window 글로벌 플래그. prerender.mjs 가 캡처 직전에
 *                          `window.__PHONARA_PRERENDER__ = true` 를 주입한다.
 *
 * 본 모듈은 money-flow / realtime / operator 어디에도 import 되지 않는다.
 * 오직 *공개 페이지* 컴포넌트에서만 호출되어야 한다.
 */

const PRERENDER_UA_TOKEN = "phonara-prerender";

export const isPrerender = (): boolean => {
  if (typeof navigator === "undefined") return false;
  try {
    return navigator.userAgent.includes(PRERENDER_UA_TOKEN);
  } catch {
    return false;
  }
};

export const isPrerenderBuild = (): boolean => {
  if (typeof window === "undefined") return false;
  return (window as unknown as { __PHONARA_PRERENDER__?: boolean })
    .__PHONARA_PRERENDER__ === true;
};

export const PRERENDER_USER_AGENT_TOKEN = PRERENDER_UA_TOKEN;
