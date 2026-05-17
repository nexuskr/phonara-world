/**
 * Slice 4 — Imperial Betting copy + presets.
 * Warm King 톤, "제국을 확장" 서사. UI/copy only — no money-flow.
 */

export const IMPERIAL_BET_COPY = {
  slipTitle: "폐하의 베팅 카드",
  slipQuestion: "폐하, 이 베팅으로 제국을 확장하시겠습니까?",
  potentialWinLabel: "예상 승전 보상",
  confirmCta: "제국 확장 확정",
  cancelCta: "다시 살피기",
  fairnessBadge: "황제의 공정한 승전보",
  fairnessShort: "공정 검증",
  // History — 승전·패전 메시지
  wonRow: "위대한 승전",
  lostRow: "다음 승부에서 반드시 승리하실 겁니다, 폐하",
  replay: "승부 다시 보기",
  // Cash out
  cashOutTitle: "황제의 전략적 철수",
  cashOutNudge: (phon: number) =>
    `폐하, 지금 철수하시면 +${phon.toLocaleString("ko-KR")} PHON을 확정 지을 수 있습니다`,
  cashOutDangerNudge: "청산이 임박했습니다 — 역전 입금으로 전세를 뒤집으세요",
  // Auto bet
  autoTitle: "황제의 자동 정복",
  phonDiscountRibbon: "PHON 베팅 · 수수료 자동 20% 할인",
} as const;

/** Bet Slip 빠른 금액 — PHON 중심 */
export const IMPERIAL_QUICK_AMOUNTS: Array<{
  label: string;
  /** undefined = full balance / 'free' = 무료 트라이얼 */
  kind: "amount" | "max" | "free" | "comeback";
  value?: number;
}> = [
  { label: "5,000 무료", kind: "free", value: 5000 },
  { label: "10,000", kind: "amount", value: 10_000 },
  { label: "50,000", kind: "amount", value: 50_000 },
  { label: "역전 15,000", kind: "comeback", value: 15_000 },
  { label: "전액", kind: "max" },
];

export type AutoBetPreset = {
  id: "safe" | "comeback" | "frenzy";
  name: string;
  tagline: string;
  // Strategy parameters (read-only — actual execution handled by hook)
  onWin: number; // multiplier
  onLoss: number; // multiplier (e.g., 2 = martingale)
  stopOnProfit?: number; // PHON
  stopOnLoss?: number; // PHON
  maxRounds: number; // -1 = ∞
};

export const AUTO_BET_PRESETS: AutoBetPreset[] = [
  {
    id: "safe",
    name: "안전한 확장",
    tagline: "느리지만 확실하게 제국을 키웁니다",
    onWin: 1,
    onLoss: 1,
    stopOnProfit: 50_000,
    stopOnLoss: 30_000,
    maxRounds: 30,
  },
  {
    id: "comeback",
    name: "영광의 역전",
    tagline: "패배 후 2배 — 한 번에 회복",
    onWin: 1,
    onLoss: 2,
    stopOnProfit: 100_000,
    stopOnLoss: 80_000,
    maxRounds: 20,
  },
  {
    id: "frenzy",
    name: "황제의 광기",
    tagline: "승리 시 2.5배 — 폭주합니다",
    onWin: 2.5,
    onLoss: 1,
    stopOnProfit: 500_000,
    maxRounds: -1,
  },
];
