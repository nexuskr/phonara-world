// Phase 5-E + Phase 6 — Emperor voice with auto-trigger via `phonara:bigwin` event.
import { useCallback, useEffect, useRef } from "react";

export const EMPEROR_VOICE_MANIFEST: Record<string, string> = {
  "ko/win_big":      "/audio/emperor/ko/win_big.mp3",
  "ko/cup_champion": "/audio/emperor/ko/cup_champion.mp3",
  "ko/loss_protect": "/audio/emperor/ko/loss_protect.mp3",
  "ko/streak":       "/audio/emperor/ko/streak.mp3",
  "ko/welcome":      "/audio/emperor/ko/welcome.mp3",
  "ko/farewell":     "/audio/emperor/ko/farewell.mp3",
  "en/win_big":      "/audio/emperor/en/win_big.mp3",
  "en/cup_champion": "/audio/emperor/en/cup_champion.mp3",
  "en/loss_protect": "/audio/emperor/en/loss_protect.mp3",
  "en/streak":       "/audio/emperor/en/streak.mp3",
  "en/welcome":      "/audio/emperor/en/welcome.mp3",
  "en/farewell":     "/audio/emperor/en/farewell.mp3",
};

const COOLDOWN_MS = 8_000;
const MUTE_KEY = "apex:voice:muted:v1";

function isMuted(): boolean {
  try { return localStorage.getItem(MUTE_KEY) === "1"; } catch { return false; }
}

interface Props {
  slot: keyof typeof EMPEROR_VOICE_MANIFEST | string;
  volume?: number;
  /** When provided, the player listens to a window CustomEvent and auto-plays once per cooldown. */
  autoEvent?: string;
  /** Threshold the event's `detail.payout` must exceed to trigger (visual-only). */
  autoThreshold?: number;
  /** When true renders no UI (pure listener). */
  silent?: boolean;
}

export function EmperorVoicePlayer({ slot, volume = 0.8, autoEvent, autoThreshold = 0, silent = false }: Props) {
  const ref = useRef<HTMLAudioElement | null>(null);
  const lastPlayed = useRef<number>(0);

  const play = useCallback(() => {
    if (isMuted()) return;
    const now = Date.now();
    if (now - lastPlayed.current < COOLDOWN_MS) return;
    const src = EMPEROR_VOICE_MANIFEST[slot as string];
    if (!src) return;
    try {
      if (!ref.current) ref.current = new Audio(src);
      ref.current.volume = Math.max(0, Math.min(1, volume));
      ref.current.currentTime = 0;
      void ref.current.play().catch(() => {});
      lastPlayed.current = now;
    } catch { /* swallow autoplay errors */ }
  }, [slot, volume]);

  useEffect(() => {
    if (!autoEvent) return;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ payout?: number }>).detail ?? {};
      if ((detail.payout ?? 0) >= autoThreshold) play();
    };
    window.addEventListener(autoEvent, handler as EventListener);
    return () => window.removeEventListener(autoEvent, handler as EventListener);
  }, [autoEvent, autoThreshold, play]);

  if (silent) return null;
  return (
    <button type="button" onClick={play} className="rounded border border-primary/30 px-2 py-1 text-xs text-primary hover:bg-primary/10">
      🔊 황제의 음성
    </button>
  );
}

export default EmperorVoicePlayer;
