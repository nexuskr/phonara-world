import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { data, error } = await supabase.rpc("check_achievements", { _user_id: user.id });
      if (error || !data) return;
      const unlocked: string[] = ((data as any)?.unlocked ?? []).filter(Boolean);
      for (const key of unlocked) {
        if (seen.current.has(key)) continue;
        seen.current.add(key);
        toast.success("🏆 업적 달성!", {
          description: key,
          duration: 5000,
        });
      }
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
