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
    sfx: (key: string) => `/sounds/${slotId}/sfx/${key}.mp3`,
    voice: (key: string) => `/sounds/${slotId}/voice/${key}.mp3`,
  }),
} as const;

/** slotId(URL slug) → 기존 SoundManager 테마 키. */
export const SLOT_ID_TO_THEME: Record<string, SlotThemeKey> = {
  olympus_1000: "olympus",
  olympus: "olympus",
  olympus_legacy: "olympus",
  olympus_legacy_5000: "olympus",
  wizard_2000: "wizard",
  wizard: "wizard",
  dragon_empire: "dragon",
  dragon: "dragon",
  cosmic_forge: "cosmic",
  cosmic_forge_5000: "cosmic",
  neon_tokyo_88: "neon",
  neon: "neon",
  pirates_curse_1500: "pirate",
  pirate_curse: "pirate",
  pirate: "pirate",
  pharaohs_vault_2500: "pharaoh",
  pharaoh_vault: "pharaoh",
  pharaoh: "pharaoh",
  viking_thunder_4000: "viking",
  viking: "viking",
  aztec_sun_1200: "aztec",
  aztec: "aztec",
  cherry_sakura_500: "sakura",
  cherry_sakura: "sakura",
  sakura: "sakura",
};

/** Slot-specific SFX/voice keys. The Facade auto-registers Howls under
 *  /sounds/{slotId}/sfx/{key}.mp3 and /sounds/{slotId}/voice/{key}.mp3.
 *  legendary.primary는 보통 공통 'legendary_win'을 가리킨다. */
export const SLOT_SOUND_MAP: Record<
  string,
  {
    sfx: string[];
    voice: string[];
    legendary: { primary: string; voice?: string };
  }
> = {
  cosmic_forge: {
    sfx: ["cosmic_explosion"],
    voice: ["emperor_voice"],
    legendary: { primary: "legendary_win", voice: "emperor_voice" },
  },
  neon_tokyo_88: {
    sfx: ["neon_jingle"],
    voice: ["cyber_announce"],
    legendary: { primary: "legendary_win", voice: "cyber_announce" },
  },
  wizard_2000: {
    sfx: ["wizard_spell", "magic_chime"],
    voice: ["wizard_decree"],
    legendary: { primary: "legendary_win", voice: "wizard_decree" },
  },
  dragon_empire: {
    sfx: ["flame_whoosh"],
    voice: ["dragon_roar"],
    legendary: { primary: "legendary_win", voice: "dragon_roar" },
  },
  pirate_curse: {
    sfx: ["cannon_fire", "treasure_open"],
    voice: ["pirate_laugh"],
    legendary: { primary: "legendary_win", voice: "pirate_laugh" },
  },
  pharaoh_vault: {
    sfx: ["ankh_chime", "sand_wind"],
    voice: ["pharaoh_voice"],
    legendary: { primary: "legendary_win", voice: "pharaoh_voice" },
  },
  cherry_sakura: {
    sfx: ["sakura_petal_fall", "lantern_glow"],
    voice: [], // 우아하게 voice 생략 — Low volatility 정책
    legendary: { primary: "legendary_win" },
  },
  olympus_legacy: {
    // Reuses olympus voice/sfx pack. zeus_decree is the legendary voice line.
    sfx: ["zeus_strike", "marble_chime"],
    voice: ["zeus_decree"],
    legendary: { primary: "legendary_win", voice: "zeus_decree" },
  },
};

/** URL slug aliases → canonical SLOT_SOUND_MAP key. */
export const SLOT_ID_TO_SOUND_KEY: Record<string, keyof typeof SLOT_SOUND_MAP> = {
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
};

export type WinTier = "big" | "mega" | "epic" | "legendary";

/** 베팅 대비 멀티플라이어 컷오프 (포함 이상). */
export const WIN_TIER_THRESHOLDS: Record<WinTier, number> = {
  big: 50,
  mega: 150,
  epic: 500,
  legendary: 1500,
};

export function classifyWinTier(multiplier: number): WinTier | null {
  if (multiplier >= WIN_TIER_THRESHOLDS.legendary) return "legendary";
  if (multiplier >= WIN_TIER_THRESHOLDS.epic) return "epic";
  if (multiplier >= WIN_TIER_THRESHOLDS.mega) return "mega";
  if (multiplier >= WIN_TIER_THRESHOLDS.big) return "big";
  return null;
}

export const TIER_DURATION_MS: Record<WinTier, number> = {
  big: 2500,
  mega: 3500,
  epic: 4000,
  legendary: 4500,
};

export const TIER_LABEL: Record<WinTier, string> = {
  big: "BIG WIN",
  mega: "MEGA WIN",
  epic: "EPIC WIN",
  legendary: "LEGENDARY WIN",
};
