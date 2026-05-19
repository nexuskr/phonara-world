import { useEffect } from "react";
import { useSlotSound } from "@/hooks/useSlotSound";
import { useImperialThunderWithReverb } from "@/hooks/useImperialThunderWithReverb";

export interface SoundDeckProps {
  /** Logical sound bank id. */
  bankId: string;
  /** Enable imperial thunder reverb layer (for high-tier games). */
  thunder?: boolean;
}

/**
 * P1-09 SoundDeck — single sanctioned entry point for game audio.
 * Wraps the two project-approved hooks; never instantiate AudioContext
 * directly inside a game.
 */
export function SoundDeck({ bankId, thunder = false }: SoundDeckProps) {
  useSlotSound(bankId);
  const fireThunder = useImperialThunderWithReverb?.();
  useEffect(() => {
    if (!thunder || !fireThunder) return;
    // surfaces via window event so any child can trigger
    const onFire = () => {
      try {
        (fireThunder as any).fire?.();
      } catch {
        /* noop */
      }
    };
    window.addEventListener("phonara:thunder", onFire);
    return () => window.removeEventListener("phonara:thunder", onFire);
  }, [thunder, fireThunder]);
  return null;
}
