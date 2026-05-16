import { useSyncExternalStore } from "react";
import { trackInterval, forgetInterval } from "@pkg/runtime";

/**
 * Global wall-clock tick store.
 * One setInterval per bucket (1s/2s/5s/10s) shared across the entire app,
 * regardless of how many components subscribe.
 *
 * Usage:
 *   const now = useNowTick(2000);   // re-renders every ~2s with Date.now()
 */

type Bucket = 1000 | 2000 | 5000 | 10000;

interface BucketState {
  now: number;
  listeners: Set<() => void>;
  timer: ReturnType<typeof setInterval> | null;
}

const buckets = new Map<Bucket, BucketState>();

function getBucket(ms: Bucket): BucketState {
  let b = buckets.get(ms);
  if (!b) {
    b = { now: Date.now(), listeners: new Set(), timer: null };
    buckets.set(ms, b);
  }
  return b;
}

function ensureTimer(ms: Bucket) {
  const b = getBucket(ms);
  if (b.timer || typeof window === "undefined") return;
  b.timer = setInterval(() => {
    b.now = Date.now();
    // Pause notifications when document is hidden — saves CPU on background tabs.
    if (typeof document !== "undefined" && document.hidden) return;
    b.listeners.forEach((l) => l());
  }, ms);
  // Phase 2 PR-B — register shared bucket timer as TRACKED cosmetic.
  // The interval is intentionally native here (singleton with custom hidden-skip);
  // we only add ledger registration so coverage reflects reality.
  trackInterval(b.timer as unknown as number, {
    owner: `use-now-tick:bucket-${ms}`,
    intervalMs: ms,
    category: "cosmetic",
    createdAt: Date.now(),
  });
}

function subscribe(ms: Bucket, listener: () => void) {
  const b = getBucket(ms);
  b.listeners.add(listener);
  ensureTimer(ms);
  return () => {
    b.listeners.delete(listener);
    if (b.listeners.size === 0 && b.timer) {
      forgetInterval(b.timer as unknown as number);
      clearInterval(b.timer);
      b.timer = null;
    }
  };
}

function getSnapshot(ms: Bucket) {
  return getBucket(ms).now;
}

const SSR_NOW = 0;
const getServerSnapshot = () => SSR_NOW;

export function useNowTick(intervalMs: Bucket = 1000): number {
  return useSyncExternalStore(
    (l) => subscribe(intervalMs, l),
    () => getSnapshot(intervalMs),
    getServerSnapshot,
  );
}
