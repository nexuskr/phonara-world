// Slot sound theme packs — 8개 테마 (Olympus base + 7 신규).
// 각 테마는 동일한 cue 키 세트를 가지고, ElevenLabs SFX/Music으로 렌더된 자산을
// `slot_sound_assets` 테이블에서 받아온다. 자산이 없으면 자동으로 절차 사운드(`slotSound.ts`)로 폴백.

export type SlotThemeKey =
  | "olympus" | "wizard" | "dragon"
  | "cosmic" | "neon" | "pirate" | "pharaoh" | "viking" | "aztec" | "sakura";

// 모든 메커닉 cue 합집합 (메커닉 미사용 슬롯은 자산을 비워두면 됨)
export type MechCue =
  | "sticky_lock" | "multi_tick" | "respin_start"
  | "coin_drop" | "coin_lock" | "respin_reset" | "grid_full"
  | "crash_tick" | "crash_boom" | "cannon_load"
  | "card_flip" | "prize_reveal" | "bomb_fail" | "jackpot_chime"
  | "path_choose" | "path_walk" | "realm_arrive"
  | "tumble_cascade" | "multi_step_up" | "cluster_pop"
  | "trail_step" | "checkpoint" | "mission_clear";

export type StandardCue =
  | "bgm"
  | "reel_spin" | "reel_spin_fast" | "reel_stop" | "reel_anticipation"
  | "win_small" | "win_big" | "win_huge" | "win_mega" | "win_epic"
  | "vo_bigwin" | "vo_megawin" | "vo_epic"
  | "scatter_hit" | "bonus_trigger";

export type CueKey = StandardCue | MechCue;

// ElevenLabs prompt 매트릭스. SFX는 sound-generation, "bgm"/"vo_*"는 music/tts로 분기.
export const PROMPT_MATRIX: Record<SlotThemeKey, Partial<Record<CueKey, string>>> = {
  olympus: {
    bgm: "epic orchestral cinematic loop, golden lyres and timpani, heroic Greek gods theme, 30 seconds seamless loop, no vocals",
    reel_spin: "fast spinning chimes with subtle thunder rumble, slot machine reel, 1.2s",
    reel_spin_fast: "accelerated bright bell spin with crackling lightning, 0.8s",
    reel_stop: "metallic golden coin clink stop, sharp percussive, 0.2s",
    reel_anticipation: "rising suspense strings + thunder build, 1.5s",
    win_small: "bright pleasant golden chime, short fanfare, 0.6s",
    win_big: "triumphant brass + harp glissando, 1.2s",
    win_huge: "epic Olympus fanfare with choir hit, thunder strike, 2s",
    win_mega: "massive cinematic Zeus thunder + choir explosion + brass crescendo, 3s",
    win_epic: "legendary divine fanfare, full orchestra, choir, lightning, glory, 4s",
    scatter_hit: "shimmering golden scatter chime, harp + bell, 0.8s",
    bonus_trigger: "dramatic Olympus bonus trigger, lightning crack + horn fanfare, 2s",
    vo_bigwin: "BIG WIN",
    vo_megawin: "MEGA WIN",
    vo_epic: "EPIC WIN",
  },
  wizard: {
    bgm: "mystical fantasy wizard music, glass harmonica, magical bells, ethereal pads, 30s loop",
    reel_spin: "magical sparkling spin sound, glass shimmers, 1.2s",
    reel_spin_fast: "fast arcane whoosh, magic crystals, 0.8s",
    reel_stop: "soft rune click chime, 0.2s",
    reel_anticipation: "rising mysterious whistle + magical hum, 1.5s",
    win_small: "tinkling magic chime, 0.6s",
    win_big: "magical arpeggio harp + bell, 1.2s",
    win_huge: "powerful spell cast + choir whisper, 2s",
    win_mega: "mega magical explosion, glass shimmer, choir, 3s",
    win_epic: "legendary arcane finale, ethereal choir + crystal cascade, 4s",
    scatter_hit: "sparkling rune appears, magical shimmer, 0.8s",
    bonus_trigger: "dramatic spell unlock, deep magical bass + bells, 2s",
    vo_bigwin: "BIG WIN",
    vo_megawin: "MEGA WIN",
    vo_epic: "EPIC WIN",
  },
  dragon: {
    bgm: "epic oriental dragon theme, taiko drums, erhu, brass, dark and powerful, 30s loop",
    reel_spin: "deep oriental drum spin, gong undertone, 1.2s",
    reel_spin_fast: "rapid taiko + dragon roar undertone, 0.8s",
    reel_stop: "metallic gong tap stop, 0.2s",
    reel_anticipation: "low dragon breath rising rumble, 1.5s",
    win_small: "oriental bell triad, 0.6s",
    win_big: "imperial brass + erhu flourish, 1.2s",
    win_huge: "dragon roar + taiko explosion, 2s",
    win_mega: "massive dragon roar + imperial fanfare, 3s",
    win_epic: "legendary dragon ascension, full eastern orchestra, 4s",
    scatter_hit: "oriental gong + spark, 0.8s",
    bonus_trigger: "dragon awakens roar + taiko slam, 2s",
  },
  cosmic: {
    bgm: "deep cinematic space ambient, sub-bass drones, ethereal pads, sci-fi mystery, 30s loop",
    reel_spin: "cosmic whoosh + low frequency hum, sci-fi forge, 1.2s",
    reel_spin_fast: "warp drive accelerating hum, 0.8s",
    reel_stop: "sharp synth blip, 0.2s",
    reel_anticipation: "rising cosmic synth pad + warble, 1.5s",
    win_small: "crystalline space chime, 0.6s",
    win_big: "synth fanfare + cosmic shimmer, 1.2s",
    win_huge: "cosmic explosion + reverberant choir pad, 2s",
    win_mega: "supernova synth + sub-bass drop, 3s",
    win_epic: "legendary cosmic forge ignition, full sci-fi orchestra, 4s",
    scatter_hit: "twinkling cosmic stars chime, 0.8s",
    bonus_trigger: "deep space portal opens, low hum + chime, 2s",
  },
  neon: {
    bgm: "cyberpunk Tokyo neon synthwave, retro arcade, glitch, 30s loop",
    reel_spin: "8-bit retro arcade spin + neon glitch, 1.2s",
    reel_spin_fast: "rapid arcade synth spin, 0.8s",
    reel_stop: "glitchy square wave click, 0.2s",
    reel_anticipation: "rising chiptune arpeggio + glitch, 1.5s",
    win_small: "retro arcade coin sound, 0.6s",
    win_big: "synthwave win arpeggio, 1.2s",
    win_huge: "huge arcade jackpot synth + glitch, 2s",
    win_mega: "massive cyberpunk synth crescendo, 3s",
    win_epic: "legendary retro arcade championship fanfare, 4s",
    scatter_hit: "scattered neon glitch beep, 0.8s",
    bonus_trigger: "arcade bonus level unlocked, retro fanfare, 2s",
  },
  pirate: {
    bgm: "swashbuckling pirate adventure, accordion, drums, sea shanty, 30s loop",
    reel_spin: "wooden ship creak spin + ocean waves, 1.2s",
    reel_spin_fast: "fast cannon roll + waves, 0.8s",
    reel_stop: "wooden plank thud, 0.2s",
    reel_anticipation: "rising drum + ship horn, 1.5s",
    win_small: "treasure coin clink, 0.6s",
    win_big: "pirate accordion fanfare, 1.2s",
    win_huge: "cannon fire + crew cheer, 2s",
    win_mega: "massive treasure chest reveal + crew cheer, 3s",
    win_epic: "legendary pirate king victory anthem, 4s",
    scatter_hit: "scattered gold coins falling, 0.8s",
    bonus_trigger: "cannons fire + pirate yell, 2s",
  },
  pharaoh: {
    bgm: "Egyptian mystical theme, ney flute, harp, oud, sand winds, 30s loop",
    reel_spin: "metallic Egyptian shimmer + sand whisper, 1.2s",
    reel_spin_fast: "rapid sand storm + chime, 0.8s",
    reel_stop: "stone slab tap, 0.2s",
    reel_anticipation: "rising mystical Egyptian drone, 1.5s",
    win_small: "golden Egyptian bell, 0.6s",
    win_big: "Egyptian harp + ney fanfare, 1.2s",
    win_huge: "pharaoh tomb reveal + choir, 2s",
    win_mega: "massive ancient Egyptian crescendo, 3s",
    win_epic: "legendary pharaoh ascension, full ancient orchestra, 4s",
    scatter_hit: "shimmering scarab chime, 0.8s",
    bonus_trigger: "tomb door opens, sand + low rumble + chime, 2s",
  },
  viking: {
    bgm: "epic Norse viking theme, war drums, horns, choir chants, 30s loop",
    reel_spin: "thunder rumble + war drum spin, 1.2s",
    reel_spin_fast: "rapid war drums + thunder, 0.8s",
    reel_stop: "axe hit metal, 0.2s",
    reel_anticipation: "rising thunder + horn build, 1.5s",
    win_small: "viking horn short call, 0.6s",
    win_big: "thunder + horn fanfare, 1.2s",
    win_huge: "Thor thunder strike + choir chant, 2s",
    win_mega: "massive Ragnarok thunder + war horns, 3s",
    win_epic: "legendary Asgard ascension, full Norse choir, 4s",
    scatter_hit: "rune stone hit chime, 0.8s",
    bonus_trigger: "Mjolnir lightning strike + war horn, 2s",
  },
  aztec: {
    bgm: "ancient Aztec tribal music, wooden flute, ritual drums, jungle ambience, 30s loop",
    reel_spin: "tribal drum spin + jungle birds, 1.2s",
    reel_spin_fast: "rapid tribal drums + flute, 0.8s",
    reel_stop: "stone idol click, 0.2s",
    reel_anticipation: "rising tribal chant + drums, 1.5s",
    win_small: "wooden flute short trill, 0.6s",
    win_big: "Aztec drums + ritual horn fanfare, 1.2s",
    win_huge: "sun god awakens + choir chant, 2s",
    win_mega: "massive Aztec ritual crescendo, 3s",
    win_epic: "legendary sun god ascension, full tribal orchestra, 4s",
    scatter_hit: "golden idol chime, 0.8s",
    bonus_trigger: "ancient temple unlocks + drums, 2s",
  },
  sakura: {
    bgm: "traditional Japanese koto, shamisen, gentle sakura wind, peaceful, 30s loop",
    reel_spin: "soft koto pluck spin + cherry petals, 1.2s",
    reel_spin_fast: "rapid koto spin + bamboo, 0.8s",
    reel_stop: "soft shakuhachi tap, 0.2s",
    reel_anticipation: "rising koto + shamisen build, 1.5s",
    win_small: "delicate Japanese bell, 0.6s",
    win_big: "koto fanfare + shamisen, 1.2s",
    win_huge: "Japanese drums + choir + bell, 2s",
    win_mega: "massive Japanese festival crescendo, 3s",
    win_epic: "legendary samurai victory anthem, full Japanese orchestra, 4s",
    scatter_hit: "cherry blossom shimmer chime, 0.8s",
    bonus_trigger: "temple gates open, taiko slam + bell, 2s",
  },
};

// 게임 코드 → 테마 키 매핑 (Olympus base 엔진 + theme pack 교체 구조)
export const GAME_TO_THEME: Record<string, SlotThemeKey> = {
  olympus_1000: "olympus",
  wizard_2000: "wizard",
  dragon_empire: "dragon",
  cosmic_forge_5000: "cosmic",
  neon_tokyo_88: "neon",
  pirates_curse_1500: "pirate",
  pharaohs_vault_2500: "pharaoh",
  viking_thunder_4000: "viking",
  aztec_sun_1200: "aztec",
  cherry_sakura_500: "sakura",
};
