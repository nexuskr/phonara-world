import { supabase } from "@/integrations/supabase/client";

const SESSION_KEY = "phonara:inbound_press_logged_v1";

/**
 * Fire-and-forget capture of the original referrer for this session.
 * Runs once per session. Server-side filters self/internal hosts.
 */
export async function captureInboundReferrerOnce() {
  try {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(SESSION_KEY)) return;
    const ref = document.referrer;
    if (!ref) {
      sessionStorage.setItem(SESSION_KEY, "1");
      return;
    }
    sessionStorage.setItem(SESSION_KEY, "1");
    await supabase.rpc("log_inbound_press" as any, { _referrer: ref });
  } catch {
    // silent
  }
}

export type PressSource = {
  domain: string;
  display_name: string;
  logo_url: string | null;
  rank: number;
};

export async function getActivePressSources(): Promise<PressSource[]> {
  const { data, error } = await supabase.rpc("get_active_press_sources" as any);
  if (error) return [];
  return (data ?? []) as PressSource[];
}
