/** Imperial Blackjack — types. */
import { z } from "zod";

export type Suit = "♠" | "♥" | "♦" | "♣";
export type Rank = "A" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K";
export interface Card { suit: Suit; rank: Rank }

export type BlackjackPhase = "idle" | "dealing" | "player" | "dealer" | "settled";
export type Outcome = "win" | "lose" | "push" | "blackjack";

export const SUITS: Suit[] = ["♠", "♥", "♦", "♣"];
export const RANKS: Rank[] = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

export function newDeck(): Card[] {
  const d: Card[] = [];
  for (const s of SUITS) for (const r of RANKS) d.push({ suit: s, rank: r });
  return d;
}

export function shuffle<T>(arr: T[], seedHash?: string): T[] {
  // Optional seeded shuffle (Fisher-Yates with hash-derived RNG when seed given).
  const a = arr.slice();
  let rng = mulberry32(seedHash ? hashStr(seedHash) : (Math.random() * 2 ** 32) >>> 0);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function hashStr(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return h >>> 0;
}
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function handValue(cards: Card[]): { total: number; soft: boolean } {
  let total = 0;
  let aces = 0;
  for (const c of cards) {
    if (c.rank === "A") { total += 11; aces++; }
    else if (c.rank === "K" || c.rank === "Q" || c.rank === "J" || c.rank === "10") total += 10;
    else total += Number(c.rank);
  }
  let soft = aces > 0 && total <= 21;
  while (total > 21 && aces > 0) {
    total -= 10; aces--;
    soft = aces > 0 && total <= 21;
  }
  return { total, soft };
}

export function isBlackjack(cards: Card[]): boolean {
  return cards.length === 2 && handValue(cards).total === 21;
}
