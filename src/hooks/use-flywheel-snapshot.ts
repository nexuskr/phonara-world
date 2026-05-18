// IMPERIAL-SINGULARITY v3.5: 30s SWR for public get_flywheel_snapshot RPC.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { setVisibleInterval } from "@/lib/util/visible-interval";
import type { VolatilityTier } from "@/lib/flywheel";

export type FlywheelSnapshot = {
  tier: VolatilityTier;
  scale_factor: number;
  last_injection_at: string | null;
  updated_at: string;
};

const DEFAULT: FlywheelSnapshot = {
  tier: "calm", scale_factor: 1, last_injection_at: null, updated_at: new Date().toISOString(),
};

export function useFlywheelSnapshot() {
  const [data, setData] = useState<FlywheelSnapshot>(DEFAULT);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function refresh() {
      try {
        const { data: snap, error } = await supabase.rpc("get_flywheel_snapshot");
        if (error || cancelled || !snap) return;
        setData(snap as FlywheelSnapshot);
        setLoaded(true);
      } catch { /* keep last */ }
    }
    refresh();
    const stop = setVisibleInterval(refresh, 30_000, { meta: { owner: "useFlywheelSnapshot", category: "cosmetic" } });
    return () => { cancelled = true; stop(); };
  }, []);

  return { snapshot: data, loaded };
}
