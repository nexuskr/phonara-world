import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const PERSONA_MISSIONS_DISABLED_KEY = "phonara_disable_persona_missions_rpc";

export type Persona = "gen20" | "gen30" | "gen40" | "gen5060" | "gen6070" | "freelancer";

export const PERSONA_LABEL: Record<Persona, string> = {
  gen20: "20대 Speed Cash",
  gen30: "30대 Lunch Income",
  gen40: "40대 Empire Builder",
  gen5060: "50–60대 Safe Steady",
  gen6070: "60–70대 Trust Path",
  freelancer: "프리랜서 Flex Pro",
};

/**
 * P1 — 본인 페르소나 + 페르소나에 추천된 미션 ID 목록.
 * 추천 미션은 priority desc 순. 실패 시 빈 배열.
 */
export function usePersonaMissions() {
  const [persona, setPersona] = useState<Persona | null>(null);
  const [recommended, setRecommended] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (typeof window !== "undefined" && sessionStorage.getItem(PERSONA_MISSIONS_DISABLED_KEY) === "1") {
        if (!cancelled) setLoading(false);
        return;
      }
      try {
        const [{ data: prof }, { data: recs, error: recsError }] = await Promise.all([
          supabase.from("profiles").select("persona").maybeSingle(),
          supabase.rpc("get_recommended_missions" as any),
        ]);
        if (cancelled) return;
        if (recsError) {
          if ((recsError as { code?: string }).code === "PGRST301" || /401|400|unauthorized|bad request/i.test(recsError.message ?? "")) {
            try { sessionStorage.setItem(PERSONA_MISSIONS_DISABLED_KEY, "1"); } catch { /* noop */ }
          }
          setRecommended(new Set());
        }
        const p = ((prof as any)?.persona ?? null) as Persona | null;
        setPersona(p);
        const ids = !recsError && Array.isArray(recs) ? (recs as any[]).map((r) => r.mission_id as string) : [];
        setRecommended(new Set(ids));
      } catch {
        // silent — 추천은 부가 기능
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  return { persona, recommended, loading };
}
