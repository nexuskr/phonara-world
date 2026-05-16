/**
 * Main NFT API wrappers + LRU cache for batch lookups (chat avatars).
 * Cache: LRU 200, invalidated on `profiles.main_nft_id` realtime UPDATE.
 */
import { supabase } from "@/integrations/supabase/client";
import { setVisibleInterval } from "@/lib/util/visible-interval";

export interface MainNftRow {
  user_id: string;
  nft_id: string | null;
  type: string | null;
  level: string | null;
  boost_pct: number | null;
  external_image_url: string | null;
}

export interface MainNftStatus {
  main_nft_id: string | null;
  change_count: number;
  free_remaining: number;
  next_cost_phon: number;
  cooldown_until: string | null;
}

// ---------- LRU cache ----------
const LRU_MAX = 200;
const cache = new Map<string, MainNftRow | null>();
function lruGet(uid: string): MainNftRow | null | undefined {
  if (!cache.has(uid)) return undefined;
  const v = cache.get(uid)!;
  cache.delete(uid);
  cache.set(uid, v);
  return v;
}
function lruSet(uid: string, v: MainNftRow | null) {
  if (cache.has(uid)) cache.delete(uid);
  cache.set(uid, v);
  if (cache.size > LRU_MAX) {
    const firstKey = cache.keys().next().value;
    if (firstKey) cache.delete(firstKey);
  }
}
export function invalidateMainNftCache(uid?: string) {
  if (uid) cache.delete(uid);
  else cache.clear();
}

// ---------- batch fetch ----------
const inflight = new Map<string, Promise<MainNftRow | null>>();
const queue = new Set<string>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;

async function flush() {
  flushTimer = null;
  const ids = Array.from(queue);
  queue.clear();
  if (ids.length === 0) return;
  const { data, error } = await supabase.rpc("get_main_nft_batch", { _user_ids: ids });
  if (error) {
    ids.forEach((id) => {
      const p = inflight.get(id);
      if (p) inflight.delete(id);
    });
    return;
  }
  const found = new Map<string, MainNftRow>();
  ((data as any[]) || []).forEach((r) => found.set(r.user_id, r as MainNftRow));
  ids.forEach((id) => {
    const row = found.get(id) ?? null;
    lruSet(id, row);
    inflight.delete(id);
  });
}

export function getMainNft(uid: string): Promise<MainNftRow | null> {
  if (!uid) return Promise.resolve(null);
  const cached = lruGet(uid);
  if (cached !== undefined) return Promise.resolve(cached);
  if (inflight.has(uid)) return inflight.get(uid)!;
  const p = new Promise<MainNftRow | null>((resolve) => {
    queue.add(uid);
    if (!flushTimer) flushTimer = setTimeout(flush, 30);
    const check = setVisibleInterval(() => {
      if (!queue.has(uid) && !inflight.has(uid)) {
        check();
        resolve(lruGet(uid) ?? null);
      }
    }, 40 , { meta: { owner: "mainNft", category: "cosmetic" } });
  });
  inflight.set(uid, p);
  return p;
}

// ---------- self ----------
export async function getMainNftStatus(): Promise<MainNftStatus | null> {
  const { data, error } = await supabase.rpc("get_my_main_nft_status");
  if (error) return null;
  return data as unknown as MainNftStatus;
}

export async function adminGrantSelfNft(
  type: "crown" | "emperor" | "founder",
  level: "bronze" | "gold" | "diamond",
): Promise<{ ok: boolean; error?: string; nft_id?: string }> {
  const { data, error } = await supabase.rpc("admin_grant_self_nft", { _type: type, _level: level });
  if (error) return { ok: false, error: error.message };
  const r = data as any;
  return { ok: true, nft_id: r?.nft_id };
}

export async function setMainNft(nftId: string | null): Promise<{ ok: boolean; error?: string; cost?: number; free_remaining?: number }> {
  const { data, error } = await supabase.rpc("set_main_nft", { _nft_id: nftId });
  if (error) return { ok: false, error: error.message };
  const r = data as any;
  return { ok: true, cost: Number(r?.cost ?? 0), free_remaining: Number(r?.free_remaining ?? 0) };
}
