/**
 * P3-D — Race RPC wrappers (read-only on client).
 * 머니플로 8경로 무변경.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ApexRace {
  race_id: string; kind: "daily" | "weekly";
  starts_at: string; ends_at: string;
  prize_pool_phon: number; my_wagered: number;
  my_rank: number | null; total_entries: number;
}

export interface RaceLeaderRow {
  rank: number; masked_nick: string; wagered_phon: number; prize_phon: number;
}

export function useCurrentRaces() {
  const [data, setData] = useState<ApexRace[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      const { data: rows } = await supabase.rpc("apex_get_current_races" as never);
      if (alive) { setData((rows as ApexRace[]) ?? []); setLoading(false); }
    };
    load();
    const t = setInterval(load, 30_000);
    return () => { alive = false; clearInterval(t); };
  }, []);
  return { data, loading };
}

export function useRaceLeaderboard(raceId: string | null, limit = 50) {
  const [data, setData] = useState<RaceLeaderRow[]>([]);
  useEffect(() => {
    if (!raceId) return;
    let alive = true;
    const load = async () => {
      const { data: rows } = await supabase.rpc(
        "apex_get_race_leaderboard" as never,
        { _race_id: raceId, _limit: limit } as never,
      );
      if (alive) setData((rows as RaceLeaderRow[]) ?? []);
    };
    load();
    const t = setInterval(load, 15_000);
    return () => { alive = false; clearInterval(t); };
  }, [raceId, limit]);
  return data;
}
