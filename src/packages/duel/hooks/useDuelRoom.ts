/**
 * useDuelRoom — 클라 전용 데모 룸. realtime/RPC 의존 0.
 * spectators / heat 자연 인플레이션 (cosmetic 카테고리).
 */
import { useEffect, useMemo, useState } from "react";
import type { DuelObjectKind, DuelRoom, Duelist } from "../types";

const EMOJIS = ["💎", "🐉", "🦅", "🦁", "🐺", "🦊", "🐅", "🐻"];
const PALETTE = ["#F5C518", "#FF8A3D", "#F472B6", "#A78BFA", "#60A5FA", "#34D399", "#FB7185", "#C084FC"];
const NAMES = ["황제#7821", "황제#3094", "황제#5527", "황제#1148", "황제#9013", "황제#4402", "황제#6675", "황제#2289"];

function seedDuelist(seed: number, side: "left" | "right"): Duelist {
  const i = (seed * (side === "left" ? 13 : 29)) % EMOJIS.length;
  const t = Math.max(1, Math.min(10, Math.floor(((seed * 17) % 100) / 10) + 1));
  return {
    id: `${side}-${seed}`,
    nickname: NAMES[i],
    tier: t,
    emoji: EMOJIS[i],
    color: PALETTE[i],
    winRate: 0.42 + ((seed * 7) % 30) / 100,
    streak: ((seed * 3) % 6) - 2,
  };
}

const OBJECTS: DuelObjectKind[] = ["wheel", "card", "dice"];
const TITLES = [
  "황금 옥좌의 결투",
  "장미 황궁의 대전",
  "쌍룡 황좌 전당",
  "별빛 황실 대결",
  "신성 대관 결투",
];

function seedRoom(idx: number): DuelRoom {
  const heat = (Math.max(1, Math.min(5, Math.floor((idx * 7) % 5) + 1))) as 1 | 2 | 3 | 4 | 5;
  return {
    id: `room-${idx}`,
    title: TITLES[idx % TITLES.length],
    object: OBJECTS[idx % OBJECTS.length],
    stake: [100, 500, 1200, 5000][idx % 4],
    spectators: 180 + ((idx * 91) % 740),
    jackpotPct: Math.min(99, 12 + ((idx * 13) % 80)),
    heat,
    left: seedDuelist(idx * 11 + 1, "left"),
    right: seedDuelist(idx * 11 + 2, "right"),
    startsInSec: 6 + ((idx * 5) % 18),
  };
}

export function useDuelRooms(count = 4) {
  const initial = useMemo(() => Array.from({ length: count }, (_, i) => seedRoom(i + 1)), [count]);
  const [rooms, setRooms] = useState<DuelRoom[]>(initial);

  useEffect(() => {
    const id = window.setInterval(() => {
      setRooms((prev) =>
        prev.map((r) => ({
          ...r,
          spectators: Math.max(60, r.spectators + Math.floor((Math.random() - 0.45) * 22)),
          jackpotPct: Math.min(99, Math.max(8, r.jackpotPct + (Math.random() - 0.45) * 1.6)),
          startsInSec: r.startsInSec > 1 ? r.startsInSec - 1 : 6 + Math.floor(Math.random() * 18),
        })),
      );
    }, 1500);
    return () => window.clearInterval(id);
  }, []);

  return rooms;
}

export function useDuelRoom(roomId: string | undefined): DuelRoom {
  const idx = Math.max(1, parseInt(roomId?.replace(/[^0-9]/g, "") || "1", 10) || 1);
  const base = useMemo(() => seedRoom(idx), [idx]);
  const [room, setRoom] = useState<DuelRoom>(base);
  useEffect(() => setRoom(base), [base]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setRoom((r) => ({
        ...r,
        spectators: Math.max(120, r.spectators + Math.floor((Math.random() - 0.4) * 14)),
        jackpotPct: Math.min(99, Math.max(10, r.jackpotPct + (Math.random() - 0.4) * 1.4)),
      }));
    }, 1800);
    return () => window.clearInterval(id);
  }, []);

  return room;
}
