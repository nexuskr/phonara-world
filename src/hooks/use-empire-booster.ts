// PR-12: Empire Booster (Baron 24h) — current user's active booster + countdown.
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNowTick } from "@/hooks/use-now-tick";
import { useWalletChannel } from "@pkg/realtime";

export type EmpireBooster = {
  id: number;
  kind: string;
  fee_discount: number;
  crown_multiplier: number;
  leverage: number;
  granted_at: string;
  expires_at: string;
};

export function useEmpireBooster() {
  const [booster, setBooster] = useState<EmpireBooster | null>(null);
  const [loading, setLoading] = useState(true);
  const [uid, setUid] = useState<string | null>(null);
  const now = useNowTick(2000);

  const load = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUid(user?.id ?? null);
      if (!user) { setBooster(null); setLoading(false); return; }
      const { data } = await (supabase.rpc as any)("get_active_empire_booster");
      const row = Array.isArray(data) && data.length > 0 ? (data[0] as EmpireBooster) : null;
      setBooster(row);
    } catch {
      setBooster(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  // Idempotent realtime: shared channel, StrictMode-safe, refcounted teardown.
  useWalletChannel({
    key: uid ? `empire-booster:${uid}` : "",
    bindings: uid
      ? [{ event: "INSERT", table: "empire_boosters", filter: `user_id=eq.${uid}` }]
      : [],
    onEvent: () => void load(),
    enabled: !!uid,
  });

  const remainingMs = booster ? Math.max(0, new Date(booster.expires_at).getTime() - now) : 0;
  const expired = !!booster && remainingMs <= 0;
  const active = !!booster && !expired;

  // Auto-clear when expired (one-shot)
  useEffect(() => {
    if (expired) setBooster(null);
  }, [expired]);

  return { booster, active, remainingMs, loading, reload: load };
}

export function formatHMS(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
