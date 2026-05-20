/**
 * ApexForge Tier S — frozen RTP/edge constants.
 * Source of truth: docs/apex/house-edge.md §6 (Phase 3 reservation).
 * DO NOT mutate at runtime. Any change must update the bible first.
 */
import type { ApexGameCode } from "../useApexGame";

export type TierSCode = "pump" | "wheel" | "limbo" | "keno" | "hilo";

export interface TierSpec {
  code: TierSCode;
  /** Server-side RPC code used for the actual money flow. */
  backing: ApexGameCode;
  rtp: number;
  houseEdge: number;
  variance: "low" | "med" | "high" | "med-high" | "low-high" | "low-med";
  maxMult: number;
  minBet: number;
  maxBet: number;
  label: string;
}

export const TIER_S: Record<TierSCode, TierSpec> = {
  pump:  { code: "pump",  backing: "crash",      rtp: 0.99, houseEdge: 0.01, variance: "med-high", maxMult: 25_000, minBet: 100, maxBet: 1_000_000, label: "Pump" },
  wheel: { code: "wheel", backing: "slots_lite", rtp: 0.99, houseEdge: 0.01, variance: "low-high", maxMult: 50,     minBet: 50,  maxBet: 500_000,   label: "Wheel" },
  limbo: { code: "limbo", backing: "crash",      rtp: 0.99, houseEdge: 0.01, variance: "high",     maxMult: 1_000_000, minBet: 10, maxBet: 1_000_000, label: "Limbo" },
  keno:  { code: "keno",  backing: "slots_lite", rtp: 0.95, houseEdge: 0.05, variance: "high",     maxMult: 10_000, minBet: 100, maxBet: 250_000,   label: "Keno" },
  hilo:  { code: "hilo",  backing: "dice",       rtp: 0.99, houseEdge: 0.01, variance: "low-med",  maxMult: 10_000, minBet: 50,  maxBet: 500_000,   label: "HiLo" },
};

export function multFromTarget(target: number, rtp = 0.99): number {
  // crash / limbo closed form: payout = rtp / (1/c) = c, win prob = rtp/c
  return Math.max(1.01, +target.toFixed(2));
}

export function bigWinThreshold(): number { return 10; }
