/**
 * Near-Miss 판정 — Strong Zone [0.46 .. 0.54] 진입 시 intensity 기반 동적 효과.
 */
const STRONG_LO = 0.46;
const STRONG_HI = 0.54;
const NEAR_MISS_BAND = 0.018;

export function detectNearMiss(roll: number, threshold: number) {
  const margin = Math.abs(roll - threshold);
  return { nearMiss: margin <= NEAR_MISS_BAND, margin };
}

/**
 * Strong Near-Miss intensity (0..1).
 * roll 이 [0.46, 0.54] 안에 있을수록 1 에 가까움 — 슬로우다운, glow, particle, 진동 모두 이 값으로 스케일.
 */
export function strongNearMissIntensity(roll: number): number {
  if (roll < STRONG_LO || roll > STRONG_HI) return 0;
  const dist = Math.abs(roll - 0.5);
  // 0.04 가 max distance — 0이면 1, 0.04이면 0
  return Math.max(0, Math.min(1, 1 - dist / 0.04));
}

/** 시각용 slow-down 커브 — 0..1 진행률 → 0..1 eased. intensity 가 높을수록 후반부가 더 끈적해짐. */
export function nearMissEase(t: number, intensity = 1): number {
  const x = Math.min(1, Math.max(0, t));
  const power = 3.4 + intensity * 1.8; // 3.4 .. 5.2
  return 1 - Math.pow(1 - x, power);
}
