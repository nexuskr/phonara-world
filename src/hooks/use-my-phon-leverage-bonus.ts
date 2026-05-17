/**
 * useMyPhonLeverageBonus — PHON 보너스 시각화용 훅.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PhonLeverageBonus {
  active: boolean;
  base: number;
  bonus_pct: number;
  effective: number;
}

const DEFAULT: PhonLeverageBonus = { active: false, base: 10, bonus_pct: 0, effective: 10 };

export function useMyPhonLeverageBonus() {
  const [state, setState] = useState<PhonLeverageBonus>(DEFAULT);
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await (supabase as any).rpc("get_my_phon_leverage_bonus");
      if (alive && data) setState(data as PhonLeverageBonus);
    })();
    return () => { alive = false; };
  }, []);
  return state;
}
