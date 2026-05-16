// PR-C: Crown Wars — live snapshot hook (poll + realtime).
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNowTick } from "@/hooks/use-now-tick";
import { subscribePostgres } from "@/lib/realtime-bus";
import { setVisibleInterval } from "@/lib/util/visible-interval";

export type CrownWarLeader = {
  rnk: number;
  score: number;
  nick: string;
  level: number;
  is_me: boolean;
};

export type CrownWarSnapshot = {
  war: {
    id: number;
    started_at: string;
    ends_at: string;
    status: "active" | "settling" | "done";
    total_participants: number;
  } | null;
  me: { score: number; rank: number | null };
  leaderboard: CrownWarLeader[];
};

export function useCrownWar(pollMs = 15000) {
  const [snap, setSnap] = useState<CrownWarSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const now = useNowTick(2000);
  const lastFetch = useRef(0);

  const load = useCallback(async () => {
    lastFetch.current = Date.now();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setSnap(null); setLoading(false); return; }
      const { data, error } = await (supabase.rpc as any)("get_crown_war_snapshot");
      if (!error && data && !data.error) setSnap(data as CrownWarSnapshot);
    } catch {
      /* backend unreachable — keep prior snap so UI renders fallback */
    }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  // Poll
  useEffect(() => {
    const t = setVisibleInterval(() => {
      if (Date.now() - lastFetch.current > pollMs - 100) void load();
    }, pollMs , { meta: { owner: "use-crown-war", category: "cosmetic" } });
    return () => t();
  }, [load, pollMs]);

  // Realtime: refresh on any war/crown state change (deduped via realtime bus)
  useEffect(() => {
    const offWars = subscribePostgres(
      { key: "crown-wars-live", table: "crown_wars", event: "*" },
      () => void load(),
    );
    const offEvents = subscribePostgres(
      { key: "crown-events-live", table: "crown_events", event: "INSERT" },
      () => void load(),
    );
    return () => { offWars(); offEvents(); };
  }, [load]);

  const endsAt = snap?.war ? new Date(snap.war.ends_at).getTime() : 0;
  const remainingMs = endsAt ? Math.max(0, endsAt - now) : 0;
  const ended = !!snap?.war && remainingMs <= 0;
  const isFinaleWindow = !!snap?.war && remainingMs > 0 && remainingMs <= 5 * 60_000;

  return { snap, loading, remainingMs, ended, isFinaleWindow, reload: load };
}

export function formatMSS(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
