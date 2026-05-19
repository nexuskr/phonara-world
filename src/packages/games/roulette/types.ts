/** Imperial Roulette — types (European single-zero, 0..36). */
import { z } from "zod";

export type RoulettePhase = "idle" | "spinning" | "settled";

export const ROULETTE_NUMBERS = Array.from({ length: 37 }, (_, i) => i);
export const RED_SET = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);

export function colorOf(n: number): "red" | "black" | "green" {
  if (n === 0) return "green";
  return RED_SET.has(n) ? "red" : "black";
}

// Wheel order (European):
export const WHEEL_ORDER = [
  0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26,
];

export type RouletteBetKind =
  | { kind: "straight"; number: number; amount: number }
  | { kind: "red"; amount: number }
  | { kind: "black"; amount: number }
  | { kind: "even"; amount: number }
  | { kind: "odd"; amount: number }
  | { kind: "low"; amount: number }   // 1-18
  | { kind: "high"; amount: number }; // 19-36

export const RouletteBet = z.array(z.any());
export type RouletteBets = RouletteBetKind[];

export function payoutFor(bet: RouletteBetKind, result: number): number {
  if (result === 0) {
    if (bet.kind === "straight" && bet.number === 0) return bet.amount * 36;
    return 0;
  }
  switch (bet.kind) {
    case "straight": return bet.number === result ? bet.amount * 36 : 0;
    case "red":   return colorOf(result) === "red"   ? bet.amount * 2 : 0;
    case "black": return colorOf(result) === "black" ? bet.amount * 2 : 0;
    case "even":  return result % 2 === 0 ? bet.amount * 2 : 0;
    case "odd":   return result % 2 === 1 ? bet.amount * 2 : 0;
    case "low":   return result >= 1 && result <= 18 ? bet.amount * 2 : 0;
    case "high":  return result >= 19 && result <= 36 ? bet.amount * 2 : 0;
  }
}
