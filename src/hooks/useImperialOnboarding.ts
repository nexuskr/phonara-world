import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type OnboardingState = {
  signup_claimed: boolean;
  daily_claimed_today: boolean;
  next_reset_at?: string;
  total_granted_phon?: number;
};

export function useImperialOnboarding() {
  const [state, setState] = useState<OnboardingState | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc("imperial_get_onboarding_state");
      if (error) throw error;
      setState((data as unknown as OnboardingState) ?? null);
    } catch {
      setState(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const claimSignup = useCallback(async () => {
    const { data, error } = await supabase.rpc("imperial_claim_signup_bonus");
    if (error) throw error;
    await refresh();
    return data as { status: string; amount_phon?: number; new_balance?: number };
  }, [refresh]);

  const claimDaily = useCallback(async () => {
    const { data, error } = await supabase.rpc("imperial_claim_daily_login_bonus");
    if (error) throw error;
    await refresh();
    return data as { status: string; amount_phon?: number; new_balance?: number };
  }, [refresh]);

  return { state, loading, refresh, claimSignup, claimDaily };
}
