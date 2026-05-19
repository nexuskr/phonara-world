/** Imperial Plinko — domain types. */
import { z } from "zod";

export const PlinkoRisk = z.enum(["low", "medium", "high"]);
export type PlinkoRisk = z.infer<typeof PlinkoRisk>;

export const PlinkoRow = z.union([
  z.literal(8), z.literal(12), z.literal(16),
]);
export type PlinkoRow = z.infer<typeof PlinkoRow>;

export type PlinkoPhase = "idle" | "dropping" | "settled";

/** Multipliers per row × risk, ordered outer→center→outer. */
export const PLINKO_MULTIPLIERS: Record<PlinkoRow, Record<PlinkoRisk, number[]>> = {
  8: {
    low:    [5.6, 2.1, 1.1, 1.0, 0.5, 1.0, 1.1, 2.1, 5.6],
    medium: [13,  3,   1.3, 0.7, 0.4, 0.7, 1.3, 3,   13],
    high:   [29,  4,   1.5, 0.3, 0.2, 0.3, 1.5, 4,   29],
  },
  12: {
    low:    [10,  3,   1.6, 1.4, 1.1, 1.0, 0.5, 1.0, 1.1, 1.4, 1.6, 3,   10],
    medium: [33,  11,  4,   2,   1.1, 0.6, 0.3, 0.6, 1.1, 2,   4,   11,  33],
    high:   [76,  18,  6,   2.0, 0.4, 0.2, 0.2, 0.2, 0.4, 2.0, 6,   18,  76],
  },
  16: {
    low:    [16,  9,   2,   1.4, 1.4, 1.2, 1.1, 1.0, 0.5, 1.0, 1.1, 1.2, 1.4, 1.4, 2,   9,   16],
    medium: [110, 41,  10,  5,   3,   1.5, 1.0, 0.5, 0.3, 0.5, 1.0, 1.5, 3,   5,   10,  41,  110],
    high:   [420, 130, 26,  9,   4,   2,   0.2, 0.2, 0.2, 0.2, 0.2, 2,   4,   9,   26,  130, 420],
  },
};

export interface PlinkoBall {
  id: number;
  x: number; y: number;
  vx: number; vy: number;
  bin: number;
  row: number;
  done: boolean;
  trail: Array<[number, number]>;
}
