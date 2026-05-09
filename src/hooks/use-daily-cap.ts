import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Tier = Database["public"]["Enums"]["user_tier"];

export interface DailyCap {
  cap: number;
  used: number;
  remaining: number;
  /** 0..100, used / cap. */
  pct: number;
  loading: boolean;
}

/**
 * useDailyCap — reads tier_daily_cap RPC + wallet_balances.today_earned and
 * subscribes to realtime updates so the cap meter stays in sync after claims.
 */
export function useDailyCap(userId: string | undefined, tier: Tier | undefined): DailyCap & { reload: () => Promise<void> } {
  const [cap, setCap] = useState<number>(0);
  const [used, setUsed] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!userId || !tier) return;
    const [{ data: capData }, { data: wb }] = await Promise.all([
      supabase.rpc("tier_daily_cap", { t: tier }),
      supabase.from("wallet_balances").select("today_earned, last_reset_date").eq("user_id", userId).maybeSingle(),
    ]);
    const today = new Date().toISOString().slice(0, 10);
    const todayEarned = wb?.last_reset_date === today ? Number(wb?.today_earned ?? 0) : 0;
    setCap(Number(capData ?? 0));
    setUsed(todayEarned);
    setLoading(false);
  }, [userId, tier]);

  useEffect(() => {
    if (!userId || !tier) return;
    setLoading(true);
    reload();
    const ch = supabase
      .channel(`daily-cap:${userId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "wallet_balances", filter: `user_id=eq.${userId}` },
        () => reload(),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId, tier, reload]);

  const remaining = Math.max(0, cap - used);
  const pct = cap > 0 ? Math.min(100, Math.round((used / cap) * 100)) : 0;
  return { cap, used, remaining, pct, loading, reload };
}
