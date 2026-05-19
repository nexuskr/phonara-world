import { useEffect } from "react";
import { haptic, isHapticsEnabled, prefersReducedMotion } from "@/lib/haptics";

export interface HapticPulseProps {
  /** Change this value to fire a pulse. */
  triggerKey: number | string;
  /** Pattern in ms; default = single 14ms gentle tap. */
  pattern?: number | number[];
  /** Suppress when reduced-motion is on (default true). */
  respectReducedMotion?: boolean;
}

/**
 * P1-10 HapticPulse — declarative haptic emitter.
 * No-op on iOS Safari / desktop (navigator.vibrate guarded inside `haptic()`).
 */
export function HapticPulse({
  triggerKey,
  pattern = 14,
  respectReducedMotion = true,
}: HapticPulseProps) {
  useEffect(() => {
    if (!isHapticsEnabled()) return;
    if (respectReducedMotion && prefersReducedMotion()) return;
    haptic(pattern);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerKey]);
  return null;
}
