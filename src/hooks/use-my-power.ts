/**
 * useMyPower — Cosmic Emperor V3
 * Returns { phon, nfts, boostPct, maxLeverage, nextThreshold } with realtime
 * updates on phon_balances and nft_collection.
 *
 * 통합 후: 채널 dedup/StrictMode/재연결은 `useRealtimeChannel`에 위임.
 * 본 훅은 모듈-레벨 snapshot 캐시(8s TTL)와 RPC 5종 묶음 fetch만 담당.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWalletChannel } from "@pkg/realtime";
import { type ChannelBinding } from "@pkg/realtime";

export interface NFTRow {
  id: string;
  type: "crown" | "emperor" | "founder";
  level: "bronze" | "gold" | "diamond";
  boost_pct: number;
  source: string;
  created_at: string;
}

export interface NextThreshold {
  next_level: "gold" | "diamond" | null;
  usdt_needed: number;
  krw_needed: number;
}

export interface PowerState {
  phon: number;
  nfts: NFTRow[];
  boostPct: number;
  maxLeverage: number;
  nextThreshold: NextThreshold | null;
  loading: boolean;
  refresh: () => void;
}

const TIER_RANK: Record<NFTRow["level"], number> = { bronze: 1, gold: 2, diamond: 3 };

export function topNftLevel(nfts: NFTRow[]): NFTRow["level"] | null {
  if (!nfts.length) return null;
  return nfts.reduce((acc, n) => (TIER_RANK[n.level] > TIER_RANK[acc] ? n.level : acc), nfts[0].level);
}

// ---------- shared snapshot cache (dedupe RPC across consumers) ----------
interface Snapshot {
  uid: string | null;
  phon: number;
  nfts: NFTRow[];
  boostPct: number;
  maxLeverage: number;
  nextThreshold: NextThreshold | null;
  loaded: boolean;
}
let SNAPSHOT: Snapshot = { uid: null, phon: 0, nfts: [], boostPct: 0, maxLeverage: 10, nextThreshold: null, loaded: false };
let INFLIGHT: Promise<void> | null = null;
let SNAP_FETCHED_AT = 0;
const SNAP_TTL_MS = 8_000;
const SUBS = new Set<() => void>();
function emit() { SUBS.forEach((fn) => { try { fn(); } catch {} }); }

async function refreshSnapshot(force = false): Promise<void> {
  if (INFLIGHT) return INFLIGHT;
  if (!force && SNAPSHOT.loaded && Date.now() - SNAP_FETCHED_AT < SNAP_TTL_MS) return;
  INFLIGHT = (async () => {
    try {
      const { data: ses } = await supabase.auth.getSession();
      const uid = ses?.session?.user?.id ?? null;
      if (!uid) {
        SNAPSHOT = { uid: null, phon: 0, nfts: [], boostPct: 0, maxLeverage: 10, nextThreshold: null, loaded: true };
        SNAP_FETCHED_AT = Date.now();
        emit();
        return;
      }
      const [{ data: bal }, { data: nftRows }, { data: boost }, { data: lev }, { data: nx }] = await Promise.all([
        supabase.rpc("get_phon_balance"),
        supabase.rpc("get_my_nft_collection"),
        supabase.rpc("get_my_total_boost_pct"),
        supabase.rpc("get_my_max_leverage"),
        supabase.rpc("get_next_nft_threshold"),
      ]);
      SNAPSHOT = {
        uid,
        phon: Number(bal ?? 0),
        nfts: (nftRows as any) || [],
        boostPct: Number(boost ?? 0),
        maxLeverage: Number(lev ?? 10),
        nextThreshold: (nx as any) ?? null,
        loaded: true,
      };
      SNAP_FETCHED_AT = Date.now();
      emit();
    } finally {
      INFLIGHT = null;
    }
  })();
  return INFLIGHT;
}

// ---------- hook ----------
export function useMyPower(): PowerState {
  const [, force] = useState(0);
  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    return () => { aliveRef.current = false; };
  }, []);

  // Subscribe to shared snapshot cache
  useEffect(() => {
    const fn = () => { if (aliveRef.current) force((n) => n + 1); };
    SUBS.add(fn);
    void refreshSnapshot();
    return () => { SUBS.delete(fn); };
  }, []);

  const uid = SNAPSHOT.uid;
  const bindings = useMemo<ChannelBinding[]>(
    () => uid ? [
      { event: "*", table: "phon_balances", filter: `user_id=eq.${uid}` },
      { event: "INSERT", table: "nft_collection", filter: `user_id=eq.${uid}` },
    ] : [],
    [uid],
  );

  useWalletChannel({
    key: uid ? `my-power:${uid}` : "",
    bindings,
    onEvent: () => { void refreshSnapshot(true); },
    enabled: !!uid,
  });

  return {
    phon: SNAPSHOT.phon,
    nfts: SNAPSHOT.nfts,
    boostPct: SNAPSHOT.boostPct,
    maxLeverage: SNAPSHOT.maxLeverage,
    nextThreshold: SNAPSHOT.nextThreshold,
    loading: !SNAPSHOT.loaded,
    refresh: () => { void refreshSnapshot(true); },
  };
}
