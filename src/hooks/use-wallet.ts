import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";
import { fetchWallet, type WalletBalance } from "@/lib/wallet";
import { useRealtimeChannel } from "@/hooks/use-realtime-channel";

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
    void reload();
    const onRefresh = () => { void reload(); };
    window.addEventListener("wallet:refresh", onRefresh);
    return () => window.removeEventListener("wallet:refresh", onRefresh);
  }, [userId, reload]);

  // Idempotent shared channel — multiple <useWallet> consumers fan out from one socket.
  useRealtimeChannel({
    key: userId ? `wallet:${userId}` : "",
    bindings: userId
      ? [
          { event: "UPDATE", table: "wallet_balances", filter: `user_id=eq.${userId}` },
          // Trade close safety net: wallet UPDATE may race the trade INSERT, or only a
          // transaction row may be inserted without an explicit balance UPDATE.
          { event: "INSERT", table: "live_trade_history", filter: `user_id=eq.${userId}` },
        ]
      : [],
    onEvent: (payload) => {
      if (payload.table === "wallet_balances") {
        const next = payload.new as unknown as WalletBalance;
        setWallet((prev) => {
          if (prev && next.available_balance > prev.available_balance) setPulse((p) => p + 1);
          return next;
        });
      } else {
        void reload();
      }
    },
    enabled: !!userId,
  });

  return { wallet, loading, reload, pulse };
}

