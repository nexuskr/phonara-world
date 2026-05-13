import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNowTick } from "@/hooks/use-now-tick";

export type ImperialState = {
  total_is: number;
  daily_is: number;
  weekly_is: number;
  season_is: number;
  booster_active: boolean;
  booster_expires_at: string | null;
  booster_hours_accumulated: number;
  today_deposit_krw: number;
  lifetime_deposit_krw: number;
  trading_position_cap_krw: number;
  next_milestone: null | {
    key: string;
    label: string;
    threshold_krw: number;
    threshold_window: "daily" | "lifetime";
    remaining_krw: number;
    reward_json: { perks?: string[] };
  };
  whale_rank_today: number | null;
};

const EMPTY: ImperialState = {
  total_is: 0,
  daily_is: 0,
  weekly_is: 0,
  season_is: 0,
  booster_active: false,
  booster_expires_at: null,
  booster_hours_accumulated: 0,
  today_deposit_krw: 0,
  lifetime_deposit_krw: 0,
  trading_position_cap_krw: 0,
  next_milestone: null,
  whale_rank_today: null,
};

const DASHBOARD_STATE_DISABLED_KEY = "phonara_disable_dashboard_state_rpc";

export function useImperialState() {
  const [state, setState] = useState<ImperialState>(EMPTY);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (typeof window !== "undefined" && sessionStorage.getItem(DASHBOARD_STATE_DISABLED_KEY) === "1") {
      setLoading(false);
      return;
    }
    try {
      const { data: auth } = await supabase.auth.getSession();
      if (!auth.session?.user) {
        setLoading(false);
        return;
      }
      const { data, error } = await supabase.rpc("get_my_dashboard_state" as any);
      if (error) {
        if ((error as { code?: string }).code === "PGRST301" || /401|400|unauthorized|bad request/i.test(error.message ?? "")) {
          try { sessionStorage.setItem(DASHBOARD_STATE_DISABLED_KEY, "1"); } catch { /* noop */ }
        }
        setLoading(false);
        return;
      }
      if (data && typeof data === "object") {
        setState({ ...EMPTY, ...(data as any) });
      }
    } catch { /* silent — keep last state */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    let alive = true;
    refresh();
    const t = window.setInterval(() => { if (alive) refresh(); }, 30_000);
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => { alive = false; window.clearInterval(t); window.removeEventListener("focus", onFocus); };
  }, [refresh]);

  return { state, loading, refresh };
}

/** Returns "HH:MM:SS" remaining string, or null if expired/none. */
export function useBoosterCountdown(expiresAt: string | null) {
  const now = useNowTick(2000);
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - now;
  if (ms <= 0) return null;
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}
