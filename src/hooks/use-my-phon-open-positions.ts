/**
 * useMyPhonOpenPositions — live_positions 중 bet_currency='phon' 만 구독.
 * 실시간 fetch + wallet 채널 변경 시 리프레시.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWalletChannel, type ChannelBinding } from "@pkg/realtime";

export interface PhonOpenPosition {
  id: string;
  symbol: string;
  side: "long" | "short";
  leverage: number;
  margin: number;
  size: number;
  entry: number;
  liq_price: number;
  opened_at: string;
}

export function useMyPhonOpenPositions() {
  const [uid, setUid] = useState<string | null>(null);
  const [rows, setRows] = useState<PhonOpenPosition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (alive) setUid(data?.session?.user?.id ?? null);
    });
    return () => { alive = false; };
  }, []);

  const refresh = useCallback(async () => {
    if (!uid) { setRows([]); setLoading(false); return; }
    const { data } = await supabase
      .from("live_positions")
      .select("id,symbol,side,leverage,margin,size,entry,liq_price,opened_at,bet_currency,status")
      .eq("user_id", uid)
      .eq("status", "open")
      .eq("bet_currency", "phon")
      .order("opened_at", { ascending: false });
    setRows((data as PhonOpenPosition[] | null) ?? []);
    setLoading(false);
  }, [uid]);

  useEffect(() => { void refresh(); }, [refresh]);

  const bindings = useMemo<ChannelBinding[]>(
    () => uid ? [{ event: "*", table: "live_positions", filter: `user_id=eq.${uid}` }] : [],
    [uid],
  );
  useWalletChannel({
    key: uid ? `phon-positions:${uid}` : "",
    bindings,
    onEvent: () => { void refresh(); },
    enabled: !!uid,
  });

  return { rows, loading, refresh };
}
