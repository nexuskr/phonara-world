/**
 * Phonara — Service Worker 등록 가드
 *
 * 다음 환경에서는 등록을 절대 하지 않고, 기존 등록도 unregister:
 *  - DEV / Vite 미리보기
 *  - iframe 내부 (Lovable 에디터 preview)
 *  - 호스트가 *.lovable.app / *.lovableproject.com / id-preview--*
 *  - file:// 등 비표준 origin
 *
 * Production + 정상 호스트(phonara.world / phonetok.lovable.app 등 lovable.app만 차단)
 * 에서만 /sw.js 를 등록한다.
 */

const PREVIEW_HOST_HINTS = [
  "id-preview--",
  ".lovableproject.com",
  ".lovable.app", // 배포된 .lovable.app 도메인은 PWA 비활성 (실서비스는 phonara.world)
];

function isInIframe(): boolean {
  try { return window.self !== window.top; } catch { return true; }
}

function isPreviewHost(): boolean {
  const h = window.location.hostname;
  return PREVIEW_HOST_HINTS.some((hint) => h.includes(hint));
}

async function unregisterAll() {
  if (!("serviceWorker" in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((r) => r.unregister().catch(() => false)));
  } catch { /* noop */ }
}

export function registerSW() {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  const isProd = import.meta.env.PROD;
  const blocked = !isProd || isInIframe() || isPreviewHost();

  if (blocked) {
    // 과거에 등록된 SW가 있으면 깨끗하게 정리
    void unregisterAll();
    return;
  }

  const run = () => {
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .catch((err) => {
        // 조용한 실패 — 콘솔만
        // eslint-disable-next-line no-console
        console.warn("[SW] register failed", err);
      });
  };

  // @ts-expect-error requestIdleCallback non-standard
  if (typeof window.requestIdleCallback === "function") {
    // @ts-expect-error
    window.requestIdleCallback(run, { timeout: 4000 });
  } else {
    setTimeout(run, 2500);
  }
}
