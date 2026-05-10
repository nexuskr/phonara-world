import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";
import { fetchWallet, type WalletBalance } from "@/lib/wallet";

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false); });
    return () => sub.subscription.unsubscribe();
  }, []);
  return { session, loading };
}

export function useWallet(userId: string | undefined) {
  const [wallet, setWallet] = useState<WalletBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [pulse, setPulse] = useState(0);

  const reload = useCallback(async () => {
    if (!userId) return;
    const w = await fetchWallet(userId);
    setWallet(w);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    reload();
    const ch = supabase.channel(`wallet:${userId}`)
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "wallet_balances", filter: `user_id=eq.${userId}` },
        (payload) => {
          const next = payload.new as WalletBalance;
          setWallet(prev => {
            if (prev && next.available_balance > prev.available_balance) setPulse(p => p + 1);
            return next;
          });
        })
      // Trade close → wallet update arrives separately, but force-reload as a safety net
      // (covers cases where the wallet UPDATE event arrives before the trade INSERT, or
      // when only a transaction row was inserted without an explicit balance UPDATE).
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "live_trade_history", filter: `user_id=eq.${userId}` },
        () => { reload(); })
      .subscribe();

    // Cross-component manual refresh hook (e.g. after deposit approval, mission claim).
    const onRefresh = () => { reload(); };
    window.addEventListener("wallet:refresh", onRefresh);

    return () => {
      supabase.removeChannel(ch);
      window.removeEventListener("wallet:refresh", onRefresh);
    };
  }, [userId, reload]);

  return { wallet, loading, reload, pulse };
}
