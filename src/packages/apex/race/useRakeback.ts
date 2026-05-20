/**
 * P3-D — Rakeback claim wrapper.
 * Dynamic 0.1~5% by tier (server-computed). Client only triggers claim.
 */
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notify";

export function useRakeback() {
  const [busy, setBusy] = useState(false);
  const claim = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("apex_claim_rakeback" as never);
      if (error) throw error;
      const result = data as { ok: boolean; claimed_phon: number } | null;
      const amt = result?.claimed_phon ?? 0;
      if (amt > 0) notify.success(`Rakeback +${amt.toLocaleString()} PHON 지급`);
      else notify.info("지급 가능한 rakeback이 없습니다.");
      return amt;
    } catch (e) {
      notify.error(`Rakeback 지급 실패: ${(e as Error).message}`);
      return 0;
    } finally { setBusy(false); }
  };
  return { busy, claim };
}

/** Tier × wager 기반 동적 rate (서버 동결값 미러). */
export const RAKEBACK_TABLE = {
  bronze: 0.001, silver: 0.005, gold: 0.015, platinum: 0.030, diamond: 0.050,
} as const;
