/**
 * claim-result — pure classification helpers used by the claim flow + tests.
 *
 * 백엔드 `claim_ai_bot_run` RPC가 일일 한도(`tier_daily_cap`)를 적용해
 * 부분 지급 또는 0원 응답을 줄 수 있으므로, 프론트는 (기대 reward, 실제 reward,
 * cap_left) 조합을 정확히 분류해 사용자에게 다른 메시지/모달을 띄워야 한다.
 */

export type ClaimOutcome = "success" | "partial" | "cap_reached";

export interface ClaimInput {
  /** Frontend-computed expected reward (base * tier_boost). */
  expected: number;
  /** Server-returned reward (final, post-cap). */
  actual: number;
  /** Daily cap remaining BEFORE the claim was applied; pass null if unknown. */
  capLeftBefore?: number | null;
}

const EPSILON = 1; // sub-원 noise tolerance

export function classifyClaim({ expected, actual }: ClaimInput): ClaimOutcome {
  const a = Math.max(0, Math.floor(actual ?? 0));
  const e = Math.max(0, Math.floor(expected ?? 0));
  if (a <= 0) return "cap_reached";
  if (e > 0 && a + EPSILON < e) return "partial";
  return "success";
}

/** Localized i18n key for a claim outcome (suffix only — namespaced by caller). */
export function outcomeI18nKey(o: ClaimOutcome): string {
  switch (o) {
    case "success": return "claimed";
    case "partial": return "partialClaim";
    case "cap_reached": return "capReached";
  }
}

/** Telemetry meta for unified logging across all claim handlers. */
export function buildClaimTelemetry(
  kind: string,
  i: ClaimInput,
  outcome: ClaimOutcome,
  extra?: Record<string, unknown>,
): Record<string, unknown> {
  return {
    surface: "ai_bot_claim",
    bot_kind: kind,
    outcome,
    expected: Math.floor(i.expected),
    actual: Math.floor(i.actual),
    cap_left_before: i.capLeftBefore ?? null,
    ts: new Date().toISOString(),
    ...extra,
  };
}
