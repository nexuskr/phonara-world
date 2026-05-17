// Gamification Pass 2 — claim_achievement RPC wrapper with confetti hook.
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notify";

export type ClaimResult =
  | { ok: true; reward_phon: number; achievement_id: string }
  | { ok: false; error: string };

export function useClaimAchievement() {
  const [claiming, setClaiming] = useState<string | null>(null);

  const claim = async (id: string): Promise<ClaimResult> => {
    if (claiming) return { ok: false, error: "in_flight" };
    setClaiming(id);
    try {
      const { data, error } = await supabase.rpc("claim_achievement", { _id: id });
      if (error) {
        notify.error("보상 수령 실패", { description: error.message });
        return { ok: false, error: error.message };
      }
      const r = (data ?? {}) as { ok?: boolean; reward_phon?: number; error?: string };
      if (!r.ok) {
        const msg = r.error ?? "unknown";
        notify.warning("보상을 수령할 수 없습니다", { description: msg });
        return { ok: false, error: msg };
      }
      const reward = Number(r.reward_phon ?? 0);
      notify.success(`🏆 보상 수령 — ${reward.toLocaleString()} PHON 지급됐습니다`);
      return { ok: true, reward_phon: reward, achievement_id: id };
    } finally {
      setClaiming(null);
    }
  };

  return { claim, claiming };
}
