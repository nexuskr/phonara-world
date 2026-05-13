import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

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

export function useImperialState() {
  const [state, setState] = useState<ImperialState>(EMPTY);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data } = await supabase.rpc("get_my_dashboard_state" as any);
    if (data && typeof data === "object") {
      setState({ ...EMPTY, ...(data as any) });
    }
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
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    if (!expiresAt) { setText(null); return; }
    function tick() {
      const ms = new Date(expiresAt!).getTime() - Date.now();
      if (ms <= 0) { setText(null); return; }
      const s = Math.floor(ms / 1000);
      const h = Math.floor(s / 3600);
      const m = Math.floor((s % 3600) / 60);
      const sec = s % 60;
      setText(`${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`);
    }
    tick();
    const id = window.setInterval(tick, 2000);
    return () => window.clearInterval(id);
  }, [expiresAt]);
  return text;
}
