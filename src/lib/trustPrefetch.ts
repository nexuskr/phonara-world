// Prefetch Trust page data and cache briefly so navigation feels instant.
import { supabase } from "@/integrations/supabase/client";

type Cache = {
  ts: number;
  days: 7 | 30;
  metrics: any;
  uptime: any;
  heatmap: any;
  chaos: any;
  history: any[];
};

let CACHE: Cache | null = null;
let INFLIGHT: Promise<Cache | null> | null = null;
const TTL = 30_000;

export function getTrustCache(days: 7 | 30): Cache | null {
  if (!CACHE) return null;
  if (CACHE.days !== days) return null;
  if (Date.now() - CACHE.ts > TTL) return null;
  return CACHE;
}

export function prefetchTrust(days: 7 | 30 = 30): Promise<Cache | null> {
  const fresh = getTrustCache(days);
  if (fresh) return Promise.resolve(fresh);
  if (INFLIGHT) return INFLIGHT;
  const sb: any = supabase;
  INFLIGHT = (async () => {
    try {
      // Priority 1: hero metrics + uptime — small, render first
      const [md, ud] = await Promise.all([
        sb.rpc("public_trust_metrics"),
        sb.rpc("public_uptime_summary"),
      ]);
      // Priority 2: heatmap + chaos + history (heavier)
      const [hd, cd, histD] = await Promise.all([
        sb.rpc("public_uptime_heatmap_90d"),
        sb.rpc("latest_chaos_run"),
        sb.rpc("public_trust_history", { _days: days }),
      ]);
      CACHE = {
        ts: Date.now(),
        days,
        metrics: md.data ?? null,
        uptime: ud.data ?? null,
        heatmap: ((hd.data as any)?.days ?? []),
        chaos: cd.data ?? null,
        history: (histD.data as any[]) ?? [],
      };
      return CACHE;
    } catch {
      return null;
    } finally {
      INFLIGHT = null;
    }
  })();
  return INFLIGHT;
}

export function invalidateTrustCache() { CACHE = null; }
