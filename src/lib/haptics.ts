// Lightweight haptic + reduced-motion helpers.
// navigator.vibrate is only available on Android Chrome / some PWAs;
// silently no-ops on iOS Safari and desktop.

const PREFS_KEY = "phonara:haptics_enabled:v1";

let cached: boolean | null = null;

export function isHapticsEnabled(): boolean {
  if (cached !== null) return cached;
  try {
    const v = localStorage.getItem(PREFS_KEY);
    cached = v === null ? true : v === "1";
  } catch {
    cached = true;
  }
  return cached!;
}

export function setHapticsEnabled(enabled: boolean) {
  cached = enabled;
  try { localStorage.setItem(PREFS_KEY, enabled ? "1" : "0"); } catch { }
}

function canVibrate(): boolean {
  return typeof navigator !== "undefined" && typeof (navigator as any).vibrate === "function";
}

export function haptic(pattern: number | number[]) {
  if (!isHapticsEnabled() || !canVibrate()) return;
  try { (navigator as any).vibrate(pattern); } catch { }
}

// Semantic presets — keep durations tight (<30ms) so they feel like clicks not buzzes.
export const haptics = {
  tick: () => haptic(8),         // bet step / small selection
  select: () => haptic(14),      // confirm tap
  spinStart: () => haptic([10, 40, 10]),
  reelStop: () => haptic(6),
  win: () => haptic([20, 30, 20, 30, 40]),
  bigWin: () => haptic([30, 40, 30, 40, 30, 40, 80]),
  error: () => haptic([40, 60, 40]),
};

// Reduced-motion respect — components can use this to skip non-essential animations.
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return false; }
}
