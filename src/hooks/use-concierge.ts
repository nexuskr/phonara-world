// PR-A: Empire AI Concierge — context-aware suggestion lifecycle.
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ConciergeSuggestion = {
  message: string;
  tone: "hype" | "warm" | "urgent" | string;
  cta: "practice" | "baron" | "packages" | "missions" | "wallet" | "guild";
  route: string;
  ctx: {
    level: number;
    crown: number;
    crownToNext: number;
    nextLevelName: string;
    boosterActive: boolean;
    boosterRemMin: number;
  };
};

const COOLDOWN_MS = 25 * 60 * 1000; // 25 min between auto-fetches
const FIRST_DELAY_MS = 18 * 1000;   // 18s after mount
const STORAGE_KEY = "concierge_last_fetch";
const DISMISS_KEY = "concierge_dismissed_until";

export function useConcierge() {
  const [suggestion, setSuggestion] = useState<ConciergeSuggestion | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const fetchedRef = useRef(false);

  const isDismissed = useCallback(() => {
    try {
      const until = Number(localStorage.getItem(DISMISS_KEY) ?? "0");
      return until > Date.now();
    } catch { return false; }
  }, []);

  const fetchSuggestion = useCallback(async (manual = false) => {
    if (loading) return;
    if (!manual) {
      try {
        const last = Number(localStorage.getItem(STORAGE_KEY) ?? "0");
        if (Date.now() - last < COOLDOWN_MS) return;
        if (isDismissed()) return;
      } catch {}
    }
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }
      const { data, error } = await supabase.functions.invoke("concierge-suggest", { body: {} });
      if (error || !data || (data as any).error || (data as any).skip) {
        setLoading(false);
        return;
      }
      setSuggestion(data as ConciergeSuggestion);
      setOpen(true);
      try { localStorage.setItem(STORAGE_KEY, String(Date.now())); } catch {}
      // log view
      await supabase.from("concierge_events").insert({
        user_id: session.user.id,
        kind: "view",
        cta: (data as any).cta,
        route: (data as any).route,
        message: (data as any).message,
        empire_level: (data as any).ctx?.level ?? null,
        crown_score: (data as any).ctx?.crown ?? null,
        booster_active: (data as any).ctx?.boosterActive ?? null,
      } as any);
    } finally {
      setLoading(false);
    }
  }, [loading, isDismissed]);

  // Auto-fire once after mount delay
  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    const t = setTimeout(() => { void fetchSuggestion(false); }, FIRST_DELAY_MS);
    return () => clearTimeout(t);
  }, [fetchSuggestion]);

  const dismiss = useCallback(async (long = false) => {
    setOpen(false);
    try {
      const until = Date.now() + (long ? 24 * 3600_000 : 60 * 60_000);
      localStorage.setItem(DISMISS_KEY, String(until));
    } catch {}
    if (suggestion) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase.from("concierge_events").insert({
          user_id: session.user.id,
          kind: "dismiss",
          cta: suggestion.cta,
          route: suggestion.route,
          empire_level: suggestion.ctx.level,
          crown_score: suggestion.ctx.crown,
          booster_active: suggestion.ctx.boosterActive,
          payload: { long },
        } as any);
      }
    }
  }, [suggestion]);

  const click = useCallback(async () => {
    if (!suggestion) return;
    setOpen(false);
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await supabase.from("concierge_events").insert({
        user_id: session.user.id,
        kind: "click",
        cta: suggestion.cta,
        route: suggestion.route,
        empire_level: suggestion.ctx.level,
        crown_score: suggestion.ctx.crown,
        booster_active: suggestion.ctx.boosterActive,
      } as any);
    }
  }, [suggestion]);

  return { suggestion, open, setOpen, loading, fetchSuggestion, dismiss, click };
}
