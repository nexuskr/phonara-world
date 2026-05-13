/**
 * useMyPower — Cosmic Emperor V3
 * Returns { phon, nfts, boostPct, maxLeverage, nextThreshold } with realtime
 * updates on phon_balances and nft_collection.
 */
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

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

export function useMyPower(): PowerState {
  const [phon, setPhon] = useState(0);
  const [nfts, setNfts] = useState<NFTRow[]>([]);
  const [boostPct, setBoostPct] = useState(0);
  const [maxLeverage, setMaxLeverage] = useState(10);
  const [nextThreshold, setNextThreshold] = useState<NextThreshold | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    const { data: ses } = await supabase.auth.getSession();
    const uid = ses?.session?.user?.id ?? null;
    setUserId(uid);
    if (!uid) {
      setPhon(0); setNfts([]); setBoostPct(0); setMaxLeverage(10); setNextThreshold(null);
      setLoading(false);
      return;
    }
    const [{ data: bal }, { data: nftRows }, { data: boost }, { data: lev }, { data: nx }] = await Promise.all([
      supabase.rpc("get_phon_balance"),
      supabase.rpc("get_my_nft_collection"),
      supabase.rpc("get_my_total_boost_pct"),
      supabase.rpc("get_my_max_leverage"),
      supabase.rpc("get_next_nft_threshold"),
    ]);
    setPhon(Number(bal ?? 0));
    setNfts((nftRows as any) || []);
    setBoostPct(Number(boost ?? 0));
    setMaxLeverage(Number(lev ?? 10));
    setNextThreshold((nx as any) ?? null);
    setLoading(false);
  }, []);

  useEffect(() => { void fetchAll(); }, [fetchAll]);

  // Realtime: phon_balances + nft_collection
  useEffect(() => {
    if (!userId) return;
    const ch = supabase
      .channel(`my-power:${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "phon_balances", filter: `user_id=eq.${userId}` },
        () => { void fetchAll(); },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "nft_collection", filter: `user_id=eq.${userId}` },
        () => { void fetchAll(); },
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId, fetchAll]);

  return { phon, nfts, boostPct, maxLeverage, nextThreshold, loading, refresh: fetchAll };
}
