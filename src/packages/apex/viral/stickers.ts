/**
 * ApexForge 12-sticker viral pack.
 * Procedural SVG — zero asset deps, html2canvas-capturable.
 */
export type StickerCategory = "bigwin" | "jackpot" | "milestone" | "streak";

export interface StickerMeta {
  index: number;
  category: StickerCategory;
  label: string;
  emoji: string;
  gradient: [string, string];
  caption: string;
}

export const STICKERS: StickerMeta[] = [
  { index: 1, category: "bigwin", label: "MEGA WIN", emoji: "💥", gradient: ["#ff5e3a", "#ffb347"], caption: "10× 폭발!" },
  { index: 2, category: "bigwin", label: "GIGA WIN", emoji: "⚡", gradient: ["#f72585", "#7209b7"], caption: "20× 추월!" },
  { index: 3, category: "bigwin", label: "ULTRA WIN", emoji: "🌟", gradient: ["#ffd60a", "#ff006e"], emoji_alt: "💫" as any, caption: "50× 황제 등극" } as any,
  { index: 4, category: "jackpot", label: "JACKPOT", emoji: "🎰", gradient: ["#fde047", "#f59e0b"], caption: "잭팟 적중!" },
  { index: 5, category: "jackpot", label: "ROYAL JACKPOT", emoji: "👑", gradient: ["#facc15", "#dc2626"], caption: "ROYAL 100×" },
  { index: 6, category: "jackpot", label: "COSMIC JACKPOT", emoji: "🌌", gradient: ["#8b5cf6", "#06b6d4"], caption: "COSMIC 500×" },
  { index: 7, category: "milestone", label: "FIRST WIN", emoji: "🎉", gradient: ["#34d399", "#06b6d4"], caption: "첫 승리!" },
  { index: 8, category: "milestone", label: "100 ROLLS", emoji: "🎲", gradient: ["#60a5fa", "#a78bfa"], caption: "100판 돌파" },
  { index: 9, category: "milestone", label: "EMPEROR", emoji: "👑", gradient: ["#fbbf24", "#9333ea"], caption: "황제 입성" },
  { index: 10, category: "streak", label: "3X STREAK", emoji: "🔥", gradient: ["#f97316", "#ef4444"], caption: "3연승!" },
  { index: 11, category: "streak", label: "7X STREAK", emoji: "🔥🔥", gradient: ["#dc2626", "#f59e0b"], caption: "7연승 폭주" },
  { index: 12, category: "streak", label: "LEGEND STREAK", emoji: "🐉", gradient: ["#7c3aed", "#dc2626"], caption: "전설의 10연승" },
];

export function pickStickerForResult(opts: {
  multiplier: number;
  payoutPhonEq: number;
  streak?: number;
}): StickerMeta {
  const { multiplier, payoutPhonEq, streak = 0 } = opts;
  if (multiplier >= 500) return STICKERS[5];
  if (multiplier >= 100) return STICKERS[4];
  if (multiplier >= 50) return STICKERS[2];
  if (multiplier >= 20) return STICKERS[1];
  if (streak >= 10) return STICKERS[11];
  if (streak >= 7) return STICKERS[10];
  if (streak >= 3) return STICKERS[9];
  if (multiplier >= 10) return STICKERS[0];
  if (payoutPhonEq >= 100_000) return STICKERS[3];
  return STICKERS[6];
}
