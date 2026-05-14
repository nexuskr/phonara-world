import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const INACTIVITY_MS = 60 * 60 * 1000; // 1 hour
const STORAGE_KEY = "pm_last_activity";

/**
 * Tracks user activity and auto-logs out after 1 hour of inactivity.
 * Mount once at the App root.
 *
 * Performance: no setInterval. Checks only fire on user activity events
 * (debounced) or when the tab regains visibility. Background tabs cost zero.
 */
export function useSessionGuard() {
  useEffect(() => {
    const update = () => localStorage.setItem(STORAGE_KEY, String(Date.now()));
    update();

    let lastCheckAt = 0;
    const MIN_CHECK_GAP_MS = 60 * 1000; // never run more than once per minute

    async function maybeCheck() {
      const now = Date.now();
      if (now - lastCheckAt < MIN_CHECK_GAP_MS) return;
      lastCheckAt = now;
      const { data } = await supabase.auth.getSession();
      if (!data.session) return;
      const last = Number(localStorage.getItem(STORAGE_KEY) || now);
      if (now - last > INACTIVITY_MS) {
        await supabase.auth.signOut();
        toast({ title: "자동 로그아웃", description: "1시간 이상 활동이 없어 보안을 위해 로그아웃되었습니다." });
        localStorage.removeItem(STORAGE_KEY);
        window.location.href = "/secure-auth";
      }
    }

    const onActivity = () => { update(); };
    const onVisibility = () => { if (document.visibilityState === "visible") void maybeCheck(); };

    const events: Array<keyof WindowEventMap> = ["mousedown", "keydown", "touchstart"];
    events.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      events.forEach((e) => window.removeEventListener(e, onActivity));
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);
}
