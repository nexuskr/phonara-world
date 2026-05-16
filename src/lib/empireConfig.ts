// Empire/Crown 연동용 슬롯별 가중치 + 베이스 보상 정책.
// award_crown('big_win', base, …) 의 base 값을 weight 로 스케일.
// Mobile-friendly — 순수 데이터, 사이드 이펙트 없음.

export type EmpireSlotKey =
  | "cosmic_forge"
  | "neon_tokyo_88"
  | "wizard_2000"
  | "dragon_empire"
  | "pirate_curse"
  | "pharaoh_vault"
  | "cherry_sakura"
  | "olympus_legacy"
  | "sugar_fever";

/** Legendary 발동 시 base Crown 에 곱하는 가중치.
 *  Olympus Legacy 5000 = 1.6 (flagship, highest). Cherry Sakura(Low-vol) → 0.8x. */
export const SLOT_CROWN_WEIGHT: Record<EmpireSlotKey, number> = {
  olympus_legacy: 1.6,
  cosmic_forge: 1.5,
  neon_tokyo_88: 1.4,
  wizard_2000: 1.2,
  dragon_empire: 1.3,
  pirate_curse: 1.1,
  pharaoh_vault: 1.25,
  cherry_sakura: 0.8,
  sugar_fever: 1.4,
};

/** URL slug 별칭 → canonical key (soundConfig.SLOT_ID_TO_SOUND_KEY 와 일치). */
const ALIAS: Record<string, EmpireSlotKey> = {
  cosmic_forge: "cosmic_forge",
  cosmic_forge_5000: "cosmic_forge",
  neon_tokyo_88: "neon_tokyo_88",
  wizard_2000: "wizard_2000",
  dragon_empire: "dragon_empire",
  pirate_curse: "pirate_curse",
  pirates_curse_1500: "pirate_curse",
  pharaoh_vault: "pharaoh_vault",
  pharaohs_vault_2500: "pharaoh_vault",
  cherry_sakura: "cherry_sakura",
  cherry_sakura_500: "cherry_sakura",
  olympus_legacy: "olympus_legacy",
  olympus_legacy_5000: "olympus_legacy",
  sugar_fever: "sugar_fever",
  sugar_fever_3000: "sugar_fever",
};

/** Legendary base — 멀티플라이어에 따른 로그 스케일. ≈80~180 사이. */
export function legendaryBaseCrown(multiplier: number): number {
  if (!Number.isFinite(multiplier) || multiplier <= 0) return 80;
  // 1500x → 80, 2500x → 100, 5000x → 130, 10000x+ → 180 (soft cap)
  const v = 80 + Math.log10(Math.max(multiplier, 1)) * 30;
  return Math.max(80, Math.min(180, Math.round(v)));
}

export function resolveCrownWeight(slotId: string): number {
  const k = ALIAS[slotId];
  return k ? SLOT_CROWN_WEIGHT[k] : 1.0;
}

export function computeLegendaryCrown(slotId: string, multiplier: number): number {
  return Math.round(legendaryBaseCrown(multiplier) * resolveCrownWeight(slotId));
}
