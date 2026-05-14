/**
 * useVipPass — current user's VIP Empire Pass status.
 * Polls every 60s; refresh() triggers manual refetch.
 */
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type VipPassStatus = {
  active: boolean;
  expires_at: string | null;
  days_remaining: number;
  renewals: number;
  last_paid_phon?: number | null;
  started_at?: string | null;
};

const DEFAULT: VipPassStatus = {
  active: false,
  expires_at: null,
  days_remaining: 0,
  renewals: 0,
};

export function useVipPass() {
  const [status, setStatus] = useState<VipPassStatus>(DEFAULT);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        setStatus(DEFAULT);
        setLoading(false);
        return;
      }
      const { data, error } = await supabase.rpc("get_my_vip_pass");
      if (error) throw error;
      setStatus({ ...DEFAULT, ...(data as any) });
    } catch {
      setStatus(DEFAULT);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, [load]);

  return { ...status, loading, refresh: load };
}
