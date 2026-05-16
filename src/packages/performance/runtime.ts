/**
 * @pkg/performance/runtime — Runtime Priority System (LOCKED v3.0 §13-1)
 *
 *  A — Critical Runtime    ⇒ 즉시 (auth · wallet · deposit · withdraw · kernel · oracle)
 *  B — Interactive Runtime ⇒ first paint 직후 (play · live-strip · missions · ticker)
 *  C — Deferred Runtime    ⇒ 첫 user interaction 이후 (chat · feed · leaderboard · avatar)
 *  D — Cosmetic Runtime    ⇒ device.profile 게이팅 (particles · glow · 3D · hologram)
 *
 * 규칙: A에 lazy import 금지. B/C/D는 아래 헬퍼를 경유.
 *       Layer 1 진입 시 동시 task ≤ 4.
 */
import { getDeviceProfile } from "./device";

type Cleanup = () => void;

/** B/C 런타임: idle 시점에 1회 실행. requestIdleCallback fallback 포함. */
export function runWhenIdle(fn: () => void, opts: { timeout?: number } = {}): Cleanup {
  if (typeof window === "undefined") return () => {};
  const timeout = opts.timeout ?? 2000;
  const ric = (window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number })
    .requestIdleCallback;
  if (typeof ric === "function") {
    const id = ric(() => {
      try { fn(); } catch (e) { console.error("[runWhenIdle]", e); }
    }, { timeout });
    const cic = (window as unknown as { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback;
    return () => cic?.(id);
  }
  const id = window.setTimeout(() => {
    try { fn(); } catch (e) { console.error("[runWhenIdle]", e); }
  }, Math.min(timeout, 250));
  return () => window.clearTimeout(id);
}

/** C 런타임: 요소가 viewport에 들어오는 순간 1회 실행. */
export function runIfVisible(
  el: Element | null,
  fn: () => void,
  opts: IntersectionObserverInit = { rootMargin: "200px" },
): Cleanup {
  if (typeof window === "undefined" || !el || typeof IntersectionObserver === "undefined") {
    if (el) fn();
    return () => {};
  }
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        try { fn(); } catch (err) { console.error("[runIfVisible]", err); }
        io.disconnect();
        break;
      }
    }
  }, opts);
  io.observe(el);
  return () => io.disconnect();
}

/** D 런타임: 고사양 단말에서만 실행 (cosmetic effects). */
export function runIfHighEndDevice(fn: () => void): Cleanup {
  if (typeof window === "undefined") return () => {};
  const profile = getDeviceProfile();
  if (profile === "high") {
    try { fn(); } catch (e) { console.error("[runIfHighEndDevice]", e); }
  }
  return () => {};
}

/** C 런타임: 첫 user interaction (pointerdown/keydown/scroll) 후 1회. */
export function runAfterFirstInteraction(fn: () => void): Cleanup {
  if (typeof window === "undefined") return () => {};
  let fired = false;
  const handler = () => {
    if (fired) return;
    fired = true;
    cleanup();
    try { fn(); } catch (e) { console.error("[runAfterFirstInteraction]", e); }
  };
  const events: (keyof WindowEventMap)[] = ["pointerdown", "keydown", "scroll", "touchstart"];
  const cleanup = () => {
    for (const ev of events) window.removeEventListener(ev, handler, { capture: true } as never);
  };
  for (const ev of events) window.addEventListener(ev, handler, { passive: true, capture: true, once: false });
  return cleanup;
}
