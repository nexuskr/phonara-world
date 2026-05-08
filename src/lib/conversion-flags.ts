/**
 * Conversion feature flags — 결제 전환 패턴 토글.
 * 기본값 ALL ON (단기 매출 우선). A/B 테스트 시 hash(user_id) 기반 분기.
 */
export const CONVERSION_FLAGS = {
  sixtySecondFlow: true,
  livePurchaseTicker: true,
  tierBadge: true,
  tierComparisonCard: true,
  hallOfFame: true,
  // Paywall patterns
  anchorPrice: true,
  countdownLossAversion: true,
  liveSocialProof: true,
  scarcityBar: true,
  reciprocityBonus: true,
  riskReversal: true,
  progressLockIn: true,
  singleDecision: true,
  exitIntentModal: true,
  frictionZeroPay: true,
  // Funnel
  withdrawIntercept: true,
  winbackPush: true,
  streakLossAversion: true,
} as const;

export function isFlagOn(key: keyof typeof CONVERSION_FLAGS): boolean {
  return CONVERSION_FLAGS[key];
}
