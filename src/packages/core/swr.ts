/**
 * @pkg/core/swr.ts — PR-M Edge Cache · Public RPC SWR helper.
 *
 * 공개 RPC(인증 불필요)의 결과를 localStorage + 인메모리로 SWR 캐싱한다.
 *
 * 절대 금지:
 *  - 인증된 사용자별 RPC (잔액·주문·출금 등) 사용 금지.
 *  - 화이트리스트 키만 허용 (PUBLIC_KEYS) — 실수로 민감 데이터를 캐시하지 못하게 한다.
 *
 * 사용:
 *   const { data, isStale } = useSwr("world_domination_stats",
 *     () => supabase.rpc("get_world_domination_stats").then(r => r.data),
 *     { ttl: 60_000, swr: 300_000 });
 */
import { useEffect, useRef, useState } from "react";

export const PUBLIC_KEYS = [
  "world_domination_stats",
  "recent_payouts_100",
  "whale_strikes_24h",
  "payout_ops_stats_24h",
] as const;
export type PublicKey = (typeof PUBLIC_KEYS)[number];

type Envelope<T> = { v: T; t: number };

const MEM = new Map<string, Envelope<unknown>>();
const INFLIGHT = new Map<string, Promise<unknown>>();
const LS_PREFIX = "phonara:swr:";

function readLs<T>(key: string): Envelope<T> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LS_PREFIX + key);
    return raw ? (JSON.parse(raw) as Envelope<T>) : null;
  } catch {
    return null;
  }
}

function writeLs<T>(key: string, env: Envelope<T>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LS_PREFIX + key, JSON.stringify(env));
  } catch {
    /* quota — ignore */
  }
}

export interface SwrOptions {
  /** Fresh window in ms (default 60s). Within ttl no refetch is triggered. */
  ttl?: number;
  /** Total stale window in ms (default 5min). Beyond swr the cache is dropped. */
  swr?: number;
}

export async function swrFetch<T>(
  key: PublicKey,
  fetcher: () => Promise<T>,
  opts: SwrOptions = {},
): Promise<{ data: T | null; isStale: boolean; fromCache: boolean }> {
  if (!PUBLIC_KEYS.includes(key)) {
    throw new Error(`[swr] key "${key}" is not whitelisted as public.`);
  }
  const ttl = opts.ttl ?? 60_000;
  const swr = opts.swr ?? 300_000;
  const now = Date.now();

  const cached = (MEM.get(key) as Envelope<T> | undefined) ?? readLs<T>(key);
  if (cached) MEM.set(key, cached);

  const age = cached ? now - cached.t : Infinity;
  const fresh = cached && age < ttl;
  const stale = cached && age >= ttl && age < swr;

  if (fresh && cached) {
    return { data: cached.v, isStale: false, fromCache: true };
  }

  // Stale-while-revalidate: return stale immediately + kick BG refetch.
  if (stale && cached) {
    void refresh(key, fetcher);
    return { data: cached.v, isStale: true, fromCache: true };
  }

  // Cache miss or expired beyond swr — await network.
  const data = await refresh(key, fetcher);
  return { data, isStale: false, fromCache: false };
}

async function refresh<T>(key: PublicKey, fetcher: () => Promise<T>): Promise<T> {
  const existing = INFLIGHT.get(key) as Promise<T> | undefined;
  if (existing) return existing;
  const p = (async () => {
    try {
      const v = await fetcher();
      const env: Envelope<T> = { v, t: Date.now() };
      MEM.set(key, env);
      writeLs(key, env);
      return v;
    } finally {
      INFLIGHT.delete(key);
    }
  })();
  INFLIGHT.set(key, p);
  return p;
}

export function useSwr<T>(
  key: PublicKey,
  fetcher: () => Promise<T>,
  opts: SwrOptions = {},
) {
  const [state, setState] = useState<{
    data: T | null;
    isStale: boolean;
    error: Error | null;
    loading: boolean;
  }>({ data: null, isStale: false, error: null, loading: true });

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    let cancelled = false;
    swrFetch<T>(key, () => fetcherRef.current(), opts)
      .then((res) => {
        if (cancelled) return;
        setState({ data: res.data, isStale: res.isStale, error: null, loading: false });
        // If we returned stale data, the BG refresh promise updates MEM; poll once.
        if (res.isStale) {
          const t = window.setTimeout(() => {
            if (cancelled) return;
            const env = MEM.get(key) as Envelope<T> | undefined;
            if (env) setState((s) => ({ ...s, data: env.v, isStale: false }));
          }, 800);
          return () => window.clearTimeout(t);
        }
      })
      .catch((e: Error) => {
        if (cancelled) return;
        setState((s) => ({ ...s, error: e, loading: false }));
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, opts.ttl, opts.swr]);

  return state;
}

export function invalidateSwr(key: PublicKey) {
  MEM.delete(key);
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(LS_PREFIX + key);
    } catch {
      /* ignore */
    }
  }
}
