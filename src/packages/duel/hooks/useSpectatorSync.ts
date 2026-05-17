/**
 * useSpectatorSync — 관중 수 ±1~4명 매 2.5s, heat 기반 cap.
 * 마스킹 닉네임 합류 토스트용 stream 제공.
 */
import { useEffect, useState } from "react";

const NICK_PREFIXES = ["황제", "공작", "백작", "기사단장", "황실 수호자", "용병왕", "광휘"];

function randomNick() {
  const p = NICK_PREFIXES[Math.floor(Math.random() * NICK_PREFIXES.length)];
  return `${p}#${1000 + Math.floor(Math.random() * 8999)}`;
}

export interface Arrival {
  id: number;
  nick: string;
  side: "left" | "right";
  ts: number;
}

export function useSpectatorSync(initial: number, heat: number) {
  const [count, setCount] = useState(initial);
  const [arrivals, setArrivals] = useState<Arrival[]>([]);

  useEffect(() => {
    const cap = 600 + heat * 480;
    const id = window.setInterval(() => {
      setCount((c) => {
        const dir = Math.random() < 0.72 ? 1 : -1;
        const delta = dir * (1 + Math.floor(Math.random() * 4));
        return Math.max(40, Math.min(cap, c + delta));
      });
    }, 2500);
    return () => window.clearInterval(id);
  }, [heat]);

  // 합류 토스트 6초 폴링
  useEffect(() => {
    let n = 0;
    const id = window.setInterval(() => {
      n++;
      setArrivals((prev) =>
        [
          ...prev,
          {
            id: Date.now() + n,
            nick: randomNick(),
            side: Math.random() < 0.5 ? "left" : "right",
            ts: Date.now(),
          },
        ].slice(-6),
      );
    }, 6000);
    return () => window.clearInterval(id);
  }, []);

  return { spectators: count, arrivals };
}
