import { useEffect, useState } from "react";
import { setVisibleInterval } from "@/lib/util/visible-interval";

/**
 * Fake "live players" counter — drifts ±1~3 every 30s in [180,320].
 * Replaced by Supabase Realtime presence in Phase 2.
 */
export function useFakePlayerCount(seedMin = 200, seedMax = 300) {
  const [count, setCount] = useState(
    () => seedMin + Math.floor(Math.random() * (seedMax - seedMin))
  );
  useEffect(() => {
    const i = setVisibleInterval(() => {
      setCount((p) =>
        Math.max(180, Math.min(320, p + (Math.random() < 0.5 ? -1 : 1) * Math.floor(Math.random() * 4)))
      );
    }, 30_000 , { meta: { owner: "use-fake-player-count", category: "cosmetic" } });
    return () => i();
  }, []);
  return count;
}
