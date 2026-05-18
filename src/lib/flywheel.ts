// IMPERIAL-SINGULARITY v3.5: client-side mirror of Deflationary Flywheel formulas.
// Single source of truth for slippage/volatility/treasury display. DB-side is authoritative.

export type VolatilityTier = "calm" | "warm" | "hot" | "surge" | "extreme";

export const VOLATILITY_MULT: Record<VolatilityTier, number> = {
  calm: 1.0, warm: 1.08, hot: 1.18, surge: 1.30, extreme: 1.45,
};

export const TIER_LABEL_KO: Record<VolatilityTier, string> = {
  calm: "고요", warm: "온화", hot: "가열", surge: "폭주", extreme: "극한",
};

export const SLIPPAGE = { exponent: 1.75, scale: 1.85, cap: 0.42 } as const;
export const SPLIT = { burn: 0.45, treasury: 0.35, reward: 0.15, liquidity: 0.05 } as const;
export const EMISSION_BOUNDS = { min: 0.4, max: 1.6 } as const;

/** slippage = min(cap, (bet / pool)^exponent * scale) */
export function expectedSlippage(bet: number, liquidityPool: number): number {
  if (!Number.isFinite(bet) || bet <= 0 || liquidityPool <= 0) return 0;
  const ratio = Math.max(0, bet / liquidityPool);
  return Math.min(SLIPPAGE.cap, Math.pow(ratio, SLIPPAGE.exponent) * SLIPPAGE.scale);
}

/** color token for a slippage value (0..cap) */
export function slippageTone(slip: number): "good" | "warn" | "danger" {
  if (slip < 0.05) return "good";
  if (slip < 0.18) return "warn";
  return "danger";
}

export function clampEmission(scale: number): number {
  return Math.max(EMISSION_BOUNDS.min, Math.min(EMISSION_BOUNDS.max, scale));
}

/** Warm King messages — i18n-ready (keys + ko default). */
export const WARM_KING_MESSAGES = {
  imperial_support: { ko: "황실이 풀을 지원하고 있습니다." },
  market_heating:   { ko: "시장이 가열되고 있습니다. 신중히 출진하십시오." },
  empire_stable:    { ko: "제국 경제가 안정적으로 흐르고 있습니다." },
  storm_alert:      { ko: "폭풍 경보 — 슬리피지가 급등할 수 있습니다." },
  reward_boost:     { ko: "보상이 강화되었습니다. 지금이 절호의 기회입니다." },
} as const;
export type WarmKingKey = keyof typeof WARM_KING_MESSAGES;

export function pickWarmKingMessage(tier: VolatilityTier): WarmKingKey {
  switch (tier) {
    case "calm":    return "empire_stable";
    case "warm":    return "imperial_support";
    case "hot":     return "market_heating";
    case "surge":   return "reward_boost";
    case "extreme": return "storm_alert";
  }
}
