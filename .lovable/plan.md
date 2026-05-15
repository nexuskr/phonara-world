# Phase 2 — 음원 통합 (Sound Unification)

목표: `SlotSoundManager` Facade를 중심으로 7개 Signature Slot의 사운드 키를 일원화하고, Win Celebration ↔ BGM ducking ↔ reduced-motion 정책을 한 곳에서 결정한다. 기존 인프라(Supabase pack 로더 + procedural fallback + volumeStore)를 깨지 않고 **얇은 확장**으로 마무리한다.

## 1. soundConfig 확장 (단일 진실원)

`src/lib/sounds/soundConfig.ts`에 슬롯별 SFX / Voice 키 매핑 테이블을 추가한다. `SOUND_PATHS.common`은 그대로 두고, 슬롯별 키는 `slotId/sfx/{key}.mp3`, `slotId/voice/{key}.mp3` 규약으로 자동 해석.

```ts
SLOT_SOUND_MAP: Record<string, { sfx: string[]; voice: string[]; legendary: { primary: string; voice?: string } }>
```

| Slot | SFX 키 | Voice 키 | Legendary primary | Voice |
|---|---|---|---|---|
| cosmic_forge | cosmic_explosion | emperor_voice | legendary_win | emperor_voice |
| neon_tokyo_88 | neon_jingle | cyber_announce | legendary_win | cyber_announce |
| wizard_2000 | wizard_spell, magic_chime | wizard_decree | legendary_win | wizard_decree |
| dragon_empire | flame_whoosh | dragon_roar | legendary_win | dragon_roar |
| pirates_curse_1500 | cannon_fire, treasure_open | pirate_laugh | legendary_win | pirate_laugh |
| pharaohs_vault_2500 | ankh_chime, sand_wind | pharaoh_voice | legendary_win | pharaoh_voice |
| cherry_sakura_500 | sakura_petal_fall, lantern_glow | cherry_blessing(KO) | legendary_win | (생략 — 우아하게) |

## 2. SlotSoundManager 확장

`src/lib/sounds/SlotSoundManager.ts`:
- `loadSlotSounds(slotId)` 내부에서 `SLOT_SOUND_MAP[slotId]`의 sfx/voice를 자동으로 `registerHowl` (lazy, slotHowls 맵).
- 신규 메서드 `duckBgm(targetDb=-6, rampMs=400)` / `restoreBgm(rampMs=400)` — Howler `volume()` + `tween` 으로 fade. `playWinSound("legendary", …)` 호출 시 자동으로 800ms ducking → restore.
- 신규 `setReducedMotionMute(boolean)` — true일 때 voice 채널만 mute (sfx/bgm은 유지). `BaseMaxWinOverlay`가 현재 reduced-motion을 보면 자동 호출.
- `play(key, vol, opts?: { channel?: "sfx"|"voice" })` — voice 채널이면 reduced-motion mute 가드.

## 3. BaseMaxWinOverlay 연동 강화

`soundKeys.primary` + `soundKeys.voice`를 그대로 사용 (스키마 변경 X). 내부 로직만 보강:
- legendary 트리거 시 `soundManager.duckBgm()` → `durationMs - 200ms` 후 `restoreBgm()`.
- reduced-motion 환경에서는 voice를 호출하지 않음 (이미 일부 구현, 정책 일원화).
- 7개 overlay의 `soundKeys` 값만 새 키로 교체 (cosmic→`emperor_voice`, neon→`cyber_announce` 등). cinematic/팔레트는 변경 없음.

## 4. volumeStore + Persistence

`src/lib/sounds/volumeStore.ts` 확인 후, `voice` 채널 볼륨과 `reducedMotionRespect` 플래그를 추가 (localStorage `phonara:audio:v2`). 기존 `master/sfx/bgm/muted`는 유지.

## 5. Common 사운드 preload 정책

- 앱 시작 시 (App.tsx 마운트) `soundManager.loadCommonSounds()` 1회 호출.
- 슬롯 진입 시 `loadSlotSounds(slotId)` — 이미 SlotSignatureWrapper에 있음 (확인 후 누락 시 추가).

## 6. ElevenLabs 프롬프트 패키지

`docs/audio/elevenlabs-prompts.md` 신규 — 슬롯별 voice/SFX마다 ElevenLabs 프롬프트, 추천 voice ID, duration, 출력 포맷(mp3_44100_128) 정리. 한국어 라인은 `voice_id: SAhdygBsjizE9aIj39dz` 류 + 명확한 발음 가이드 포함. 실제 생성/업로드는 별도 단계.

## 7. 신규/수정 파일

신규
- `docs/audio/elevenlabs-prompts.md`

수정
- `src/lib/sounds/soundConfig.ts` (+ SLOT_SOUND_MAP, SLOT_LEGENDARY_KEYS)
- `src/lib/sounds/SlotSoundManager.ts` (+ ducking, reduced-motion mute, slot-key auto register)
- `src/lib/sounds/volumeStore.ts` (+ voice 채널, reducedMotionRespect)
- `src/components/celebration/BaseMaxWinOverlay.tsx` (ducking 트리거)
- `src/components/celebration/{Cosmic,Neon,Wizard,Dragon,Pirate,Pharaoh,Sakura}MaxWinOverlay.tsx` (soundKeys 값만 교체)
- `src/App.tsx` (1회 `loadCommonSounds()`)

불변 (확인만)
- `src/lib/sound/SoundManager.ts`, `src/lib/slotSound.ts`, themes.ts — procedural fallback이 그대로 동작해야 함.

## 8. 검증

- 7개 슬롯에 진입 → 콘솔 `soundManager.slotHowls` 키 확인.
- 자산 미존재 시 procedural 폴백이 그대로 들리는지 확인 (현재도 동작).
- legendary 트리거 → BGM이 -6dB로 부드럽게 떨어지고 800ms 후 복귀.
- prefers-reduced-motion=on → voice 라인 mute, sfx는 유지.

## 9. 다음 Phase 준비

- 음원 통합이 끝나면 Phase 3 (Empire/Crown 연동) 으로 넘어감 — `playWinSound("legendary")` 후 `award_crown` RPC 호출 훅을 BaseMaxWinOverlay 콜백으로 연결할 것.
