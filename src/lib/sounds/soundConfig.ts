// Sound facade configuration — paths, slot→theme mapping, win-tier thresholds.
import type { SlotThemeKey } from "@/lib/sound/themes";

export const SOUND_PATHS = {
  common: {
    spin_start: "/sounds/common/sfx/spin_start.mp3",
    reel_stop: "/sounds/common/sfx/reel_stop.mp3",
    button_click: "/sounds/common/sfx/button_click.mp3",
    coin_drop: "/sounds/common/sfx/coin_drop.mp3",
    big_win_trigger: "/sounds/common/sfx/big_win_trigger.mp3",
    mega_win: "/sounds/common/sfx/mega_win.mp3",
    epic_win: "/sounds/common/sfx/epic_win.mp3",
    legendary_win: "/sounds/common/sfx/legendary_win.mp3",
  },
  slot: (slotId: string) => ({
    bgm: `/sounds/${slotId}/bgm/main.mp3`,
    sfxDir: `/sounds/${slotId}/sfx/`,
    voiceDir: `/sounds/${slotId}/voice/`,
  }),
} as const;

/** slotId(URL slug) → 기존 SoundManager 테마 키. */
export const SLOT_ID_TO_THEME: Record<string, SlotThemeKey> = {
  olympus_1000: "olympus",
  olympus: "olympus",
  wizard_2000: "wizard",
  wizard: "wizard",
  dragon_empire: "dragon",
  dragon: "dragon",
  cosmic_forge: "cosmic",
  cosmic_forge_5000: "cosmic",
  neon_tokyo_88: "neon",
  neon: "neon",
  pirates_curse_1500: "pirate",
  pirate: "pirate",
  pharaohs_vault_2500: "pharaoh",
  pharaoh: "pharaoh",
  viking_thunder_4000: "viking",
  viking: "viking",
  aztec_sun_1200: "aztec",
  aztec: "aztec",
  cherry_sakura_500: "sakura",
  sakura: "sakura",
};

export type WinTier = "big" | "mega" | "epic" | "legendary";

/** 베팅 대비 멀티플라이어 컷오프 (포함 이상). */
export const WIN_TIER_THRESHOLDS: Record<WinTier, number> = {
  big: 10,
  mega: 50,
  epic: 200,
  legendary: 500,
};

export function classifyWinTier(multiplier: number): WinTier | null {
  if (multiplier >= WIN_TIER_THRESHOLDS.legendary) return "legendary";
  if (multiplier >= WIN_TIER_THRESHOLDS.epic) return "epic";
  if (multiplier >= WIN_TIER_THRESHOLDS.mega) return "mega";
  if (multiplier >= WIN_TIER_THRESHOLDS.big) return "big";
  return null;
}
