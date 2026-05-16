/**
 * useWalletSnapshot — Sprint 2 wallet read model.
 * available / today / week earn / min withdraw + realtime.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { fetchWallet, TIER_CFG, type Tier, type WalletBalance } from "@/lib/wallet";
import { useWalletChannel } from "@pkg/realtime";

const EARN_KINDS = [
  "mission_win",
  "mission_loss_recovery",
  "profit_share",
  "jackpot_win",
  "package_settle",
] as const;
type EarnKind = (typeof EARN_KINDS)[number];

export interface WalletSnapshot {
  loading: boolean;
  available: number;
  total: number;
  todayEarn: number;
  weekEarn: number;
  minWithdraw: number;
  tier: Tier;
  wallet: WalletBalance | null;
}

export function useWalletSnapshot() {
  const user = useRequireAuth();
  const userId = user?.id;
  const [wallet, setWallet] = useState<WalletBalance | null>(null);
  const [weekEarn, setWeekEarn] = useState(0);
  const [tier, setTier] = useState<Tier>("normal");
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!userId) return;
    const sinceIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const [w, p, txRes] = await Promise.all([
      fetchWallet(userId),
      supabase.from("profiles").select("tier").eq("id", userId).maybeSingle(),
      supabase
        .from("transactions")
        .select("amount,kind,direction,created_at")
        .eq("user_id", userId)
        .eq("direction", "credit")
        .in("kind", EARN_KINDS as unknown as EarnKind[])
        .gte("created_at", sinceIso)
        .limit(1000),
    ]);
    setWallet(w);
    if (p.data?.tier) setTier(p.data.tier as Tier);
    const sum = (txRes.data ?? []).reduce((acc, r: any) => acc + Number(r.amount || 0), 0);
    setWeekEarn(sum);
    setLoading(false);
  }, [userId]);

  useEffect(() => { void reload(); }, [reload]);

  useWalletChannel({
    key: userId ? `wallet-snapshot:${userId}` : "",
    bindings: userId
      ? [
          { event: "UPDATE", table: "wallet_balances", filter: `user_id=eq.${userId}` },
          { event: "INSERT", table: "transactions", filter: `user_id=eq.${userId}` },
        ]
      : [],
    onEvent: () => { void reload(); },
    enabled: !!userId,
    pollMs: 30_000,
    onPoll: () => { void reload(); },
    resumeOnFocus: true,
  });

  const minWithdraw = TIER_CFG[tier]?.withdraw_min ?? TIER_CFG.normal.withdraw_min;

  return {
    loading,
    available: wallet?.available_balance ?? 0,
    total: wallet?.total_balance ?? 0,
    todayEarn: wallet?.today_earned ?? 0,
    weekEarn,
    minWithdraw,
    tier,
    wallet,
    reload,
  } satisfies WalletSnapshot & { reload: () => Promise<void> };
}
