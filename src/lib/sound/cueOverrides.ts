// Cue override table — maps legacy SoundManager cues to uploaded mp3 assets.
// 우선순위: 슬롯별(slotId) override > 공용(common) override > 기존 procedural 폴백.
// 새 mp3가 public/sounds/** 에 존재하면 자동으로 procedural 합성음을 대체한다.

export type CueOverride = {
  /** 실제 재생 경로. public/ 기준 절대경로. */
  url: string;
  /** 디버그 라벨. */
  label: string;
};

/** 공용 mp3 — 모든 슬롯에서 동일하게 사용. */
const COMMON: Record<string, CueOverride> = {
  reel_stop:  { url: "/sounds/common/sfx/coin_drop.mp3",       label: "common/coin_drop" },
  win_big:    { url: "/sounds/common/sfx/big_win_trigger.mp3", label: "common/big_win_trigger" },
  win_huge:   { url: "/sounds/common/sfx/big_win_trigger.mp3", label: "common/big_win_trigger" },
};

/** 슬롯별 spin_start 가 존재하는 slug 화이트리스트.
 *  여기 등재된 slotId 만 /sounds/{slotId}/sfx/spin_start.mp3 로 라우팅된다. */
const SLOT_SPIN_START = new Set<string>([
  "olympus_legacy", "olympus_legacy_5000", "olympus_1000",
  "sugar_fever", "sugar_fever_3000",
  "pharaoh_vault", "pharaohs_vault_2500",
  "dragon_empire",
  "viking_thunder_4000",
  "aztec_sun_1200",
  "cosmic_forge", "cosmic_forge_5000",
  "cherry_sakura", "cherry_sakura_500",
  "neon_tokyo_88",
  "pirate_curse", "pirates_curse_1500",
]);

/** legacy cue + 현재 slotId → 재생할 mp3 (없으면 undefined → procedural 폴백). */
export function resolveCueOverride(
  cue: string,
  slotId: string | null,
): CueOverride | undefined {
  if ((cue === "reel_spin" || cue === "reel_spin_fast") && slotId && SLOT_SPIN_START.has(slotId)) {
    return {
      url: `/sounds/${slotId}/sfx/spin_start.mp3`,
      label: `${slotId}/spin_start`,
    };
  }
  return COMMON[cue];
}
