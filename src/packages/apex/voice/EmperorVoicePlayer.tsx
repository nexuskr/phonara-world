import { useCallback, useRef } from "react";

// P5-E placeholder manifest. Replace with real R2 CDN URLs in Phase 6.
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

interface Props { slot: keyof typeof EMPEROR_VOICE_MANIFEST | string; volume?: number; }

export function EmperorVoicePlayer({ slot, volume = 0.8 }: Props) {
  const ref = useRef<HTMLAudioElement | null>(null);
  const play = useCallback(() => {
    const src = EMPEROR_VOICE_MANIFEST[slot as string];
    if (!src) return;
    try {
      if (!ref.current) ref.current = new Audio(src);
      ref.current.volume = Math.max(0, Math.min(1, volume));
      ref.current.currentTime = 0;
      void ref.current.play().catch(() => {});
    } catch (_) { /* swallow autoplay errors */ }
  }, [slot, volume]);
  return (
    <button type="button" onClick={play} className="rounded border border-primary/30 px-2 py-1 text-xs text-primary hover:bg-primary/10">
      🔊 황제의 음성
    </button>
  );
}
