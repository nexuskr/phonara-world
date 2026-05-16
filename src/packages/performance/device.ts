/**
 * @pkg/performance/device — Device Intelligence Layer (LOCKED v3.0 §13-2)
 *
 *  device.profile = "low" | "mid" | "high"
 *
 *  판정 입력:
 *    - navigator.deviceMemory       (< 4 ⇒ low)
 *    - hardwareConcurrency          (< 4 ⇒ low)
 *    - effectiveConnectionType      (2g/3g/saveData ⇒ low)
 *    - 첫 5초 fps drops > 10        ⇒ auto downgrade (registerFpsDowngrade)
 *
 *  사용:
 *    - body[data-device="low|mid|high"] 자동 적용
 *    - Tailwind variants: low:hidden / mid:opacity-50 / high:animate-pulse
 *    - cosmetic 효과는 항상 data-device 셀렉터 기반
 */
import { useSyncExternalStore } from "react";

export type DeviceProfile = "low" | "mid" | "high";

type NetInfo = { effectiveType?: string; saveData?: boolean };

let cached: DeviceProfile | null = null;
const listeners = new Set<() => void>();

function detect(): DeviceProfile {
  if (typeof navigator === "undefined") return "mid";
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: NetInfo;
    hardwareConcurrency?: number;
  };
  const mem = nav.deviceMemory ?? 4;
  const cores = nav.hardwareConcurrency ?? 4;
  const conn = nav.connection;
  const slowNet = conn?.saveData === true || /(^|-)(2g|3g)$/i.test(conn?.effectiveType ?? "");

  if (mem < 4 || cores < 4 || slowNet) return "low";
  if (mem >= 8 && cores >= 8 && !slowNet) return "high";
  return "mid";
}

export function getDeviceProfile(): DeviceProfile {
  if (cached) return cached;
  cached = detect();
  applyBodyAttr(cached);
  return cached;
}

function applyBodyAttr(p: DeviceProfile) {
  if (typeof document === "undefined") return;
  document.body?.setAttribute("data-device", p);
}

/** FPS 모니터가 저성능 감지 시 호출 — profile을 한 단계 강제 강등. */
export function registerFpsDowngrade() {
  if (!cached) cached = detect();
  if (cached === "high") cached = "mid";
  else if (cached === "mid") cached = "low";
  applyBodyAttr(cached);
  for (const l of listeners) l();
}

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};

/** React hook — 현재 device profile을 구독. */
export function useDeviceProfile(): DeviceProfile {
  return useSyncExternalStore(subscribe, getDeviceProfile, () => "mid" as DeviceProfile);
}

/** 부팅 시 1회 호출. (App 루트에서) */
export function initDeviceIntelligence() {
  const p = getDeviceProfile();
  applyBodyAttr(p);

  // 첫 5초 fps drops > 10 → downgrade
  if (typeof window === "undefined" || typeof requestAnimationFrame === "undefined") return;
  let frames = 0;
  let drops = 0;
  let last = performance.now();
  const started = last;
  const tick = (now: number) => {
    const dt = now - last;
    last = now;
    frames++;
    if (dt > 50) drops++; // ~20fps 이하 프레임
    if (now - started < 5000) {
      requestAnimationFrame(tick);
    } else if (drops > 10) {
      registerFpsDowngrade();
    }
  };
  requestAnimationFrame(tick);
}
