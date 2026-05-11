/**
 * P8-B: Reviewer Mode 도박성 용어 마스킹.
 *
 * App Store / Play Store 리뷰어 모드(`?reviewer=1`)가 활성화되면
 * 도박·당첨 뉘앙스 단어를 중립 표현으로 일괄 치환한다.
 *
 * Bot 시딩은 별도로 admin_set_bot_strength + Reviewer Mode 감지 시
 * 자동 0%로 강제되어 있음 (BotStrengthAdmin 참조).
 */
import { isReviewerMode, useReviewerMode } from "@/lib/reviewerMode";

const TERM_MAP: Record<string, string> = {
  룰렛: "시뮬레이션 챌린지",
  잭팟: "시즌 리워드",
  Jackpot: "Seasonal Reward",
  대박: "큰 보상",
  당첨: "획득",
  베팅: "참여",
  도박: "게임",
  배당: "보상",
  Conquest: "Expansion",
  정복: "확장",
  Raid: "Quest",
  약탈: "탐험",
  Recovery: "Comeback",
  회복: "재도전",
  "근접 실패": "아쉬운 시도",
  "Near Miss": "Close Try",
};

const PATTERN = new RegExp(
  `(${Object.keys(TERM_MAP)
    .sort((a, b) => b.length - a.length)
    .map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|")})`,
  "g",
);

/** Imperative one-shot mask. Use when not in a React render path. */
export function maskTerm(input: string): string {
  if (!input || !isReviewerMode()) return input;
  return input.replace(PATTERN, (m) => TERM_MAP[m] ?? m);
}

/** Hook variant — reactive to reviewer-mode toggles. */
export function useMaskedTerm(input: string): string {
  const on = useReviewerMode();
  if (!input || !on) return input;
  return input.replace(PATTERN, (m) => TERM_MAP[m] ?? m);
}
