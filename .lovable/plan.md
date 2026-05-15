# Audio Production Package — ElevenLabs Prompts & Upload Guide

## Scope
Replace `docs/audio/elevenlabs-prompts.md` with a final, production-ready audio package covering:

1. **Common SFX (8)** — spin_start, reel_stop, button_click, coin_drop, big_win_trigger, mega_win, epic_win, legendary_win
2. **Per-slot SFX + Voice** for all 7 signature slots (matches `SLOT_SOUND_MAP` in `src/lib/sounds/soundConfig.ts`)
   - cosmic_forge, neon_tokyo_88, wizard_2000, dragon_empire, pirate_curse, pharaoh_vault, cherry_sakura
3. For each sound: ElevenLabs prompt (English + Korean for cherry_sakura voice), recommended Voice ID (only from approved roster: George/Jessica/Daniel/Brian/Callum/Eric/Sarah/Charlie/Matilda), stability/similarity/style values, duration, LUFS, fade-out
4. **Upload directory layout & file conventions** — exact paths matching `SOUND_PATHS` in `soundConfig.ts`, format spec (mp3 44.1kHz / 128–192 kbps / -14 LUFS / -1 dBFS true peak), seamless BGM loop instructions
5. **Production priority** — Top 5 first (Legendary tier → Cherry Sakura → Cosmic/Neon → rest)
6. **Mapping verification table** — show every prompt cell maps to an actual file path the runtime expects, so QA can drag-drop without breaking `loadCommonSounds()` / `loadSlotSounds()`

## Files Touched
- `docs/audio/elevenlabs-prompts.md` — full rewrite (~600 lines, was a 116-line draft)

No code changes. Documentation only — Audio Director can hand this directly to ElevenLabs and the resulting MP3s drop into `public/sounds/**` paths the SlotSoundManager already expects.

## Out of Scope
- Generating audio files (this package is the input spec, not the output)
- Modifying SlotSoundManager / soundConfig (mapping already correct from Phase 2)
