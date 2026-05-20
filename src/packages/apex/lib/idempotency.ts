/**
 * ApexForge client-side idempotency layer.
 * Money-flow safe: server enforces dedup via apex_place_bet_v2.
 * Client adds sessionStorage cache + in-flight Promise dedup as UX layer.
 */

const STORAGE_PREFIX = "apex:idem:";
const TTL_MS = 5 * 60 * 1000;
const inflight = new Map<string, Promise<unknown>>();

export function newIdemKey(gameCode: string): string {
  const uuid =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${gameCode}_${uuid}`.slice(0, 96);
}

export function cacheIdem(key: string, value: unknown): void {
  try {
    sessionStorage.setItem(
      STORAGE_PREFIX + key,
      JSON.stringify({ v: value, t: Date.now() }),
    );
  } catch {}
}

export function readIdem<T = unknown>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { v: T; t: number };
    if (Date.now() - parsed.t > TTL_MS) {
      sessionStorage.removeItem(STORAGE_PREFIX + key);
      return null;
    }
    return parsed.v;
  } catch {
    return null;
  }
}

export function dedupeInflight<T>(key: string, factory: () => Promise<T>): Promise<T> {
  const existing = inflight.get(key) as Promise<T> | undefined;
  if (existing) return existing;
  const p = factory().finally(() => {
    setTimeout(() => inflight.delete(key), 50);
  });
  inflight.set(key, p);
  return p;
}
