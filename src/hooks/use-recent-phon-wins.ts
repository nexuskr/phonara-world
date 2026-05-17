/**
 * useRecentPhonWins — get_recent_phon_wins() 60초 폴링.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PhonWin {
  masked_nick: string;
  pnl_phon: number;
  closed_at: string;
}

export function useRecentPhonWins(limit = 8) {
  const [rows, setRows] = useState<PhonWin[]>([]);
  useEffect(() => {
    let alive = true;
    const fetchOnce = async () => {
      const { data } = await (supabase as any).rpc("get_recent_phon_wins", { _limit: limit });
      if (alive && Array.isArray(data)) setRows(data as PhonWin[]);
    };
    void fetchOnce();
    const id = setInterval(fetchOnce, 60_000);
    return () => { alive = false; clearInterval(id); };
  }, [limit]);
  return rows;
}
