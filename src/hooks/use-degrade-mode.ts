/**
 * useDegradeMode — selector hook over useKillSwitches for §14-5 Emergency Degrade Mode.
 * degraded=true 시 DegradeModeBinder가 body[data-degrade="1"] + killCategory("cosmetic") 처리.
 */
import { useKillSwitches } from "@/hooks/use-kill-switches";

export function useDegradeMode() {
  const ks = useKillSwitches();
  return {
    degraded: ks.degrade_mode,
    reason: ks.reasons.degrade_mode ?? null,
    loaded: ks.loaded,
  };
}
