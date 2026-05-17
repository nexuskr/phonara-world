/**
 * FOMO Engine — Adaptive Global + Personalized + Spectator Pressure + Pool Imbalance.
 * Variable Reward Tier 분포 재튜닝 (House Edge 6.2% 보존).
 */
import type { FomoSignals, PersonalizedTrigger, RewardTier } from "../types";

export interface FomoInput {
  spectators: number;
  jackpotPct: number;
  recentNearMisses: number;
  consecutiveLosses: number;
  royalPassProgress: number;
  minutesSinceLastVisit: number;
  dynamicOffset: number;
  nearMissFlag: boolean;
  threshold: number;
  /** 한쪽 풀 점유율 0..1 (poolImbalance) */
  poolImbalance?: number;
}

export function computeFomo(input: FomoInput): FomoSignals {
  const triggers: PersonalizedTrigger[] = [];
  if (input.recentNearMisses >= 2) triggers.push("near_miss_streak");
  if (input.consecutiveLosses >= 5) triggers.push("win_drought");
  if (input.royalPassProgress >= 90) triggers.push("royal_pass_milestone");
  if (input.minutesSinceLastVisit >= 30) triggers.push("session_resurrection");

  const globalRaw =
    Math.min(1, input.spectators / 1200) * 0.55 +
    Math.min(1, input.jackpotPct / 100) * 0.45;
  const heatVal = Math.min(5, Math.max(1, Math.ceil(globalRaw * 5))) as 1 | 2 | 3 | 4 | 5;
  if (heatVal >= 4) triggers.push("heat_surge");

  const imbalance = input.poolImbalance ?? 0;
  if (imbalance >= 0.30) triggers.push("pool_imbalance");

  const spectatorPressure =
    Math.min(40, input.spectators / 25) +
    Math.min(35, imbalance * 70);

  const personalScore = Math.min(
    100,
    Math.round(
      input.recentNearMisses * 9 +
        input.consecutiveLosses * 4 +
        Math.max(0, input.royalPassProgress - 50) * 0.6 +
        Math.min(60, input.minutesSinceLastVisit) * 0.35 +
        heatVal * 6 +
        spectatorPressure * 0.35,
    ),
  );

  return {
    globalHeat: heatVal,
    personalScore,
    triggers,
    dynamicOffset: input.dynamicOffset,
    nearMissFlag: input.nearMissFlag,
    threshold: input.threshold,
  };
}

/**
 * Variable Reward 5단계.
 * Base 64% / Surge 23% / Crown 8.5% / Empyrean 3.2% / Divine 1.3%
 * (꼬리 두텁게 — 잭팟 체감 유지, expected payout ≈ 0.938)
 */
export function rewardTierFromRoll(roll: number): RewardTier {
  if (roll < 0.640) return "base";
  if (roll < 0.870) return "surge";
  if (roll < 0.955) return "crown";
  if (roll < 0.987) return "empyrean";
  return "divine";
}

export const REWARD_LABEL: Record<RewardTier, string> = {
  base: "황실의 영광",
  surge: "황금이 끓습니다",
  crown: "왕관이 빛납니다",
  empyrean: "천계가 열립니다",
  divine: "신성한 대관식입니다 — JACKPOT",
};

export const HEAT_LABEL: Record<number, string> = {
  1: "고요한 황궁",
  2: "활기찬 알현실",
  3: "뜨거운 대전",
  4: "황실이 끓어오릅니다",
  5: "황좌가 진동합니다",
};
