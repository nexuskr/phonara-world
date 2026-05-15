// React hook — 슬롯 페이지 mount 시 사운드 자동 부트.
import { useEffect } from "react";
import { soundManager } from "@/lib/sounds/SlotSoundManager";

export function useSlotSound(slotId: string) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;

    soundManager.loadCommonSounds();
    void soundManager.loadSlotSounds(slotId);

    // 첫 사용자 제스처에서 unlock + BGM
    const arm = () => {
      if (cancelled) return;
      soundManager.unlock();
      soundManager.playBGM();
      window.removeEventListener("pointerdown", arm);
      window.removeEventListener("touchstart", arm);
      window.removeEventListener("keydown", arm);
    };
    window.addEventListener("pointerdown", arm, { once: true });
    window.addEventListener("touchstart", arm, { once: true, passive: true });
    window.addEventListener("keydown", arm, { once: true });

    // 모바일/Howler ctx가 이미 살아있으면 즉시 시도
    soundManager.unlock();
    soundManager.playBGM();

    return () => {
      cancelled = true;
      window.removeEventListener("pointerdown", arm);
      window.removeEventListener("touchstart", arm);
      window.removeEventListener("keydown", arm);
      soundManager.stopBGM();
      soundManager.unloadSlot();
    };
  }, [slotId]);
}

export default useSlotSound;
