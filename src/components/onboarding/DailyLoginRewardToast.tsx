import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useImperialOnboarding } from "@/hooks/useImperialOnboarding";
import { notify } from "@/lib/notify";

const LS_KEY = "phonara:imperial_daily_login:v1"; // YYYY-MM-DD

/**
 * Phase 4 P1 — On first auth of UTC day, claim 500 PHON daily login bonus.
 * Server is the source of truth (UTC-day unique index); localStorage just
 * prevents redundant RPC calls within the same day.
 */
export default function DailyLoginRewardToast() {
  const { state, claimDaily } = useImperialOnboarding();
  const firedRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    let authed = false;
    supabase.auth.getSession().then(({ data }) => {
      authed = !!data.session;
      maybeClaim();
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      authed = !!s;
      maybeClaim();
    });

    function maybeClaim() {
      if (!mounted || firedRef.current || !authed || !state) return;
      if (state.daily_claimed_today) return;
      const today = new Date().toISOString().slice(0, 10);
      const last = (() => { try { return localStorage.getItem(LS_KEY); } catch { return null; } })();
      if (last === today) return;
      firedRef.current = true;
      try { localStorage.setItem(LS_KEY, today); } catch {}
      claimDaily()
        .then((res) => {
          if (res.status === "granted") {
            notify.imperial("👑 일일 로그인 +500 PHON", { description: "내일 또 만나요." });
          }
        })
        .catch(() => { firedRef.current = false; });
    }

    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, [state, claimDaily]);

  return null;
}
