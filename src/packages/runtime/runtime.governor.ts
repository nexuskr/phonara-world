/**
 * @pkg/runtime/runtime.governor — Active Governance (Phase 3 / PR-I).
 *
 * Phase 2 (PR-G/H): pauseCategory/resumeCategory — cooperative pause only.
 * Phase 3 (PR-I): killCategory/killAll LIVE — hard-clears tracked interval IDs.
 *
 * MONEY-FLOW IMMUTABILITY — triple guarded:
 *   1) MONEY_FLOW_GUARD explicit deny-list (["money_flow"])
 *   2) KILLABLE explicit allow-list (["cosmetic","admin"]) — fail-closed for any new category
 *   3) killAll iterates KILLABLE only — money_flow ids never enter the loop
 *
 * Auto-binding: document.hidden → pauseCategory("cosmetic"), visible → resume.
 */
import { listIdsByCategory, forgetInterval, type RuntimeCategory } from "./runtime.registry";

const PAUSED: Set<RuntimeCategory> = new Set();
const listeners = new Set<() => void>();

const MONEY_FLOW_GUARD: ReadonlyArray<RuntimeCategory> = Object.freeze(["money_flow"]);
const KILLABLE: ReadonlyArray<RuntimeCategory> = Object.freeze(["cosmetic", "admin"]);

function isMoneyFlowOrUnknown(cat: RuntimeCategory): boolean {
  // Guard 1: explicit deny
  if (MONEY_FLOW_GUARD.includes(cat)) return true;
  // Guard 2: fail-closed — anything not explicitly KILLABLE is treated as money_flow
  if (!KILLABLE.includes(cat)) return true;
  return false;
}

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

/** Preview-only helper: returns ids that WOULD be killed; does not kill. */
export function previewKillCategory(cat: RuntimeCategory): number[] {
  if (isMoneyFlowOrUnknown(cat)) return [];
  return listIdsByCategory(cat);
}

/**
 * PR-I LIVE: hard-clear all tracked intervals in the category.
 * money_flow + unknown categories are blocked. Returns number cleared.
 */
export function killCategory(cat: RuntimeCategory): number {
  if (isMoneyFlowOrUnknown(cat)) {
    if (typeof console !== "undefined") {
      console.warn(`[runtime.governor] killCategory blocked: ${cat} is immutable (money-flow guard)`);
    }
    return 0;
  }
  const ids = listIdsByCategory(cat);
  let n = 0;
  for (const id of ids) {
    try {
      clearInterval(id as unknown as number);
      forgetInterval(id);
      n++;
    } catch { /* noop */ }
  }
  try {
    (window as unknown as { __phonaraGovernor?: unknown }).__phonaraGovernor = {
      lastKill: { cat, n, at: Date.now() },
    };
  } catch { /* noop */ }
  if ((import.meta as { env?: { DEV?: boolean } }).env?.DEV) {
    console.warn(`[runtime.governor] killCategory(${cat}) → cleared ${n} ids`);
  }
  return n;
}

/** PR-I LIVE: kills KILLABLE categories only. money_flow is structurally excluded. */
export function killAll(): number {
  return KILLABLE.reduce((s, c) => s + killCategory(c), 0);
}
