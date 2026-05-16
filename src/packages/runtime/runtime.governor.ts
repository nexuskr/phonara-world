/**
 * @pkg/runtime/runtime.governor — PR-G Hidden-Tab Suspension entry point.
 *
 * Phase 2 (PR-G): pauseCategory/resumeCategory are LIVE.
 *   - Cooperative: only setVisibleInterval callers honor the paused state.
 *   - Native window.setInterval is NOT touched (immutable behavior on raw sites).
 *   - Money-flow paths use raw setInterval and are therefore unaffected.
 *
 * Auto-binding: when installed, document.hidden → pauseCategory("cosmetic"),
 * visible → resumeCategory("cosmetic"). Admin/money-flow stay live.
 *
 * Phase 4 (later): killCategory/killAll will hard-clear tracked ids.
 */
import { listIdsByCategory, type RuntimeCategory } from "./runtime.registry";

const PAUSED: Set<RuntimeCategory> = new Set();
const listeners = new Set<() => void>();

/** True if the given category is currently paused by the governor. */
export function isCategoryPaused(cat: RuntimeCategory): boolean {
  return PAUSED.has(cat);
}

export function pauseCategory(cat: RuntimeCategory): void {
  if (PAUSED.has(cat)) return;
  PAUSED.add(cat);
  listeners.forEach((l) => { try { l(); } catch {} });
  if ((import.meta as { env?: { DEV?: boolean } }).env?.DEV) {
    console.info(`[runtime.governor] pauseCategory(${cat})`);
  }
}

export function resumeCategory(cat: RuntimeCategory): void {
  if (!PAUSED.has(cat)) return;
  PAUSED.delete(cat);
  listeners.forEach((l) => { try { l(); } catch {} });
  if ((import.meta as { env?: { DEV?: boolean } }).env?.DEV) {
    console.info(`[runtime.governor] resumeCategory(${cat})`);
  }
}

export function subscribeGovernor(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function pausedCategories(): RuntimeCategory[] {
  return Array.from(PAUSED);
}

/**
 * PR-G auto-bind: pause "cosmetic" on hidden tab, resume on visible.
 * Idempotent; safe to call multiple times.
 */
let autoBound = false;
export function installHiddenTabSuspension(): void {
  if (autoBound || typeof document === "undefined") return;
  autoBound = true;
  const sync = () => {
    if (document.hidden) pauseCategory("cosmetic");
    else resumeCategory("cosmetic");
  };
  document.addEventListener("visibilitychange", sync);
  sync();
}

/** Phase 2: stub. Returns ids that WOULD be killed; does not kill. */
export function previewKillCategory(cat: RuntimeCategory): number[] {
  return listIdsByCategory(cat);
}

/** Phase 4 will implement. */
export function killCategory(_cat: RuntimeCategory): void {
  if ((import.meta as { env?: { DEV?: boolean } }).env?.DEV) {
    console.warn("[runtime.governor] killCategory is a Phase 4 stub — no action taken");
  }
}

export function killAll(): void {
  if ((import.meta as { env?: { DEV?: boolean } }).env?.DEV) {
    console.warn("[runtime.governor] killAll is a Phase 4 stub — no action taken");
  }
}
