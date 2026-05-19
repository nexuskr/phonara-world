/**
 * ProximityFomoToast — 주변 황제 중 나보다 강한 자가 등장하면 Warm King 토스트.
 * 1/8s throttle, 최대 분당 3회.
 */
import { useEffect, useRef } from "react";
import { notify } from "@/lib/notify";
import type { LobbyEmperor } from "./types";

const COPY = [
  (e: LobbyEmperor) => `${e.nickname} 폐하의 왕관이 당신을 노려보고 있습니다…`,
  (e: LobbyEmperor) => `${e.nickname} 폐하가 로비에 입장하셨습니다. 모두 길을 비키세요.`,
  (e: LobbyEmperor) => `이 모습은 오직 ${e.nickname} 폐하만의 것 — 당신도 가질 수 있습니다.`,
  (e: LobbyEmperor) => `${e.nickname}의 PHON 군대가 당신을 압도하고 있습니다.`,
];

export function ProximityFomoToast({
  emperors,
  myPhon = 0,
}: {
  emperors: LobbyEmperor[];
  myPhon?: number;
}) {
  const lastFire = useRef(0);
  const minuteWindow = useRef<number[]>([]);

  useEffect(() => {
    if (!emperors.length) return;
    const id = window.setInterval(() => {
      const now = performance.now();
      if (now - lastFire.current < 8000) return;
      // prune minute window
      minuteWindow.current = minuteWindow.current.filter((t) => now - t < 60_000);
      if (minuteWindow.current.length >= 3) return;

      // pick a stronger emperor
      const stronger = emperors.filter((e) => e.phon > myPhon * 1.5 || e.tier >= 8);
      if (!stronger.length) return;
      const pick = stronger[Math.floor(Math.random() * stronger.length)];
      const line = COPY[Math.floor(Math.random() * COPY.length)](pick);

      toast(line, {
        description: `폐하의 PHON: ${pick.phon.toLocaleString()} · 티어 ${pick.tier}`,
        duration: 4200,
      });
      lastFire.current = now;
      minuteWindow.current.push(now);
    }, 4000);
    return () => window.clearInterval(id);
  }, [emperors, myPhon]);

  return null;
}
