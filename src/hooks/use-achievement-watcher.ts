import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notify";
import { shouldTripCircuit, tripCircuit, isCircuitTripped } from "@/lib/rpc-circuit";
import { getVerifiedUser } from "@/lib/auth-recovery";

const ACHIEVEMENT_RPC_DISABLED_KEY = "phonara_disable_achievement_rpc";

/**
 * Calls check_achievements after key user actions and toasts any newly
 * unlocked badges. Pass `trigger` (e.g. timestamp) to re-run on demand,
 * or rely on the focus/visibility hooks for ambient checks.
 */
export function useAchievementWatcher(trigger?: unknown) {
  const seen = useRef<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    async function check() {
      if (isCircuitTripped(ACHIEVEMENT_RPC_DISABLED_KEY)) return;
      if (typeof window !== "undefined" && window.location.pathname.startsWith("/guide")) return;
      try {
        const user = await getVerifiedUser();
        if (!user || cancelled) return;
        const { data, error } = await supabase.rpc("check_achievements", { _user_id: user.id });
        if (error || !data) {
          if (error && shouldTripCircuit(error)) tripCircuit(ACHIEVEMENT_RPC_DISABLED_KEY);
          return;
        }
        const unlocked: string[] = ((data as any)?.unlocked ?? []).filter(Boolean);
        for (const key of unlocked) {
          if (seen.current.has(key)) continue;
          seen.current.add(key);
          notify.success("🏆 업적 달성!", {
            description: key,
            duration: 5000,
          });
        }
      } catch { /* silent — endpoint unreachable */ }
    }
    void check();
    const onFocus = () => { void check(); };
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
    };
  }, [trigger]);
}
