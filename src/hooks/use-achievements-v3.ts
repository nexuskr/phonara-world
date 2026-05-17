// Gamification Pass 2 — read user achievements via get_my_achievements RPC.
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWalletChannel } from "@pkg/realtime";

export type AchievementRow = {
  id: string;
  category: string;
  parent_id: string | null;
  tier: number;
  sort: number;
  icon: string;
  title: string;
  description: string;
  reward_phon: number;
  target: number;
  progress: number;
  unlocked_at: string | null;
  claimed_at: string | null;
};

export type CategoryKey = "trade" | "stake" | "empire" | "social" | "daily";

export function useAchievementsV3() {
  const [rows, setRows] = useState<AchievementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc("get_my_achievements");
    if (!error && Array.isArray(data)) {
      setRows(data as AchievementRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    void load();
  }, [load]);

  useWalletChannel({
    key: userId ? `achv-progress:${userId}` : "achv-progress:anon",
    enabled: !!userId,
    bindings: userId
      ? [{ event: "*", schema: "public", table: "achievement_progress", filter: `user_id=eq.${userId}` }]
      : [],
    onEvent: () => {
      void load();
    },
  });

  const byCategory = (cat: CategoryKey) =>
    rows.filter((r) => r.category === cat).sort((a, b) => a.sort - b.sort);

  const unlockedCount = rows.filter((r) => r.unlocked_at).length;
  const claimableCount = rows.filter((r) => r.unlocked_at && !r.claimed_at).length;
  const completion = rows.length > 0 ? Math.round((unlockedCount / rows.length) * 100) : 0;

  return { rows, loading, byCategory, unlockedCount, claimableCount, completion, reload: load };
}
