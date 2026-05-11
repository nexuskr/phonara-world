import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * P7-B: stable A/B variant resolver.
 * Returns the persisted variant for the current user, lazily assigning
 * via weighted random on first call. Defaults to "control" when unauthenticated
 * or when the experiment is inactive.
 */
export function useAbVariant(experimentKey: string): string {
  const [variant, setVariant] = useState<string>("control");

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data, error } = await supabase.rpc("get_ab_variant", {
        p_experiment_key: experimentKey,
      });
      if (!alive) return;
      if (!error && typeof data === "string") setVariant(data);
    })();
    return () => {
      alive = false;
    };
  }, [experimentKey]);

  return variant;
}
