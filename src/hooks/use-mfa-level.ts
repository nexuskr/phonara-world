import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Returns the current Authenticator Assurance Level for the session.
 * - aal1 = password / magic link only
 * - aal2 = MFA verified (TOTP / WebAuthn)
 *
 * Use to guard sensitive actions (admin, withdraw) and prompt MFA when missing.
 */
export function useMfaLevel() {
  const [loading, setLoading] = useState(true);
  const [currentLevel, setCurrentLevel] = useState<"aal1" | "aal2" | null>(null);
  const [nextLevel, setNextLevel] = useState<"aal1" | "aal2" | null>(null);
  const [hasFactor, setHasFactor] = useState(false);

  useEffect(() => {
    let active = true;
    async function refresh() {
      try {
        const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (!active || error) return;
        setCurrentLevel((data?.currentLevel as any) ?? null);
        setNextLevel((data?.nextLevel as any) ?? null);
        const { data: factors } = await supabase.auth.mfa.listFactors();
        if (!active) return;
        setHasFactor(((factors?.totp?.length ?? 0) + ((factors as any)?.phone?.length ?? 0)) > 0);
      } finally {
        if (active) setLoading(false);
      }
    }
    refresh();
    const { data: sub } = supabase.auth.onAuthStateChange(() => refresh());
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return {
    loading,
    currentLevel,
    nextLevel,
    hasFactor,
    /** True when user has a factor registered but hasn't challenged it yet. */
    needsMfaStep: !!currentLevel && !!nextLevel && currentLevel === "aal1" && nextLevel === "aal2",
    /** True when session is fully authenticated at AAL2. */
    isAal2: currentLevel === "aal2",
  };
}
