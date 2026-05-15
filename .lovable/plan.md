# Sound System 통합 계획

## 현재 상태 (먼저 알아두실 것)

이 프로젝트에는 이미 풀스펙 사운드 시스템이 살아있습니다.

- `src/lib/sound/SoundManager.ts` — Howler 기반 싱글톤. 테마별 자산 로딩(`get_slot_sound_pack` RPC) + 자산 0개여도 들리는 절차(procedural) 폴백, 모바일 unlock, mute persistence, BGM fade, win-tier 자동 분기, `visibilitychange` 백그라운드 일시정지까지 구현됨.
- `src/lib/slotSound.ts` — 10개 테마용 Web Audio 절차 엔진(팔레트/스케일/드럼/BGM 루프).
- 7개 슬롯 모두 `OlympusSlot.tsx`를 베이스 엔진으로 사용하고 있어, 그곳에서 `SoundManager.loadPack(theme.key)` + 첫 제스처 unlock + `playBGM()` 트리거가 이미 동작.
- Howler 설치 완료(`^2.2.4`). `/public/sounds/` 디렉토리는 **존재하지 않음** — 사용자가 보낸 코드대로 그대로 깔면 모든 mp3가 404가 나서 오히려 현재 들리는 절차 사운드까지 같이 죽습니다.

따라서 "보내주신 코드를 그대로 새로 만든다"가 아니라, **요청하신 API 표면(`soundManager`, `useSlotSound`, `SoundController`, 볼륨 persistence)을 기존 엔진 위에 얇게 얹는** 방향으로 통합합니다. 자산이 나중에 `/sounds/...`에 올라오면 자동으로 그쪽을 우선 사용하도록 라우팅도 같이 넣습니다.

## 만들/바꿀 것

### 신규 파일

1. **`src/lib/sounds/SlotSoundManager.ts`** — 요청하신 API를 가진 싱글톤 facade.
   - `getInstance()`, `loadCommonSounds()`, `loadSlotSounds(slotId)`, `play(key, mult)`, `playWinSound(tier, mult)`, `playBGM/pause/resume/stop`, `unloadAll()`, `setMasterVolume/setSfxVolume/setBgmVolume`, `mute/unmute`.
   - 내부 구현은 기존 `SoundManager`로 위임 + Cosmic 같은 슬롯 전용 voice/sfx만 자체 Howl 캐시로 보유.
   - `slotId → SlotThemeKey` 매핑 테이블 포함(`cosmic_forge → cosmic` 등).
   - 자산 로딩 실패(`onloaderror`) 시 자동으로 procedural cue로 폴백 — 404 나도 무음 안 됨.

2. **`src/lib/sounds/soundConfig.ts`** — `SOUND_PATHS` 상수 + `SLOT_ID_TO_THEME` 매핑 + `WIN_TIER_THRESHOLDS`(big/mega/epic/legendary 멀티플라이어 컷).

3. **`src/hooks/useSlotSound.ts`** — 요청하신 시그니처(`useSlotSound(slotId)`).
   - mount: `loadCommonSounds()` + `loadSlotSounds()` + 첫 제스처 unlock 후 `playBGM()`.
   - unmount: `stopBGM()` + 슬롯 전용 캐시 unload(공통은 유지). 메모리 누수 방지를 위해 effect deps 정리.

4. **`src/components/sound/SoundController.tsx`** — 마스터/SFX/BGM 슬라이더 + 음소거 토글 UI. 디자인 토큰(`bg-card`, `text-foreground`)만 사용, 작은 floating panel 형태(우상단 토글 버튼 → drawer). Layout이나 Slot wrapper 어디든 1줄로 마운트 가능.

5. **`src/lib/sounds/volumeStore.ts`** — localStorage persistence.
   - 키: `phonara:sound_volume:v1` → `{ master, sfx, bgm, muted }`.
   - 변경 시 `Howler.volume()` + `SoundManager` 채널 게인 동기화. 다른 탭 동기화를 위해 `storage` 이벤트 구독.

### 수정 파일

6. **`src/lib/sound/SoundManager.ts`** — 채널 볼륨을 외부에서 조정 가능하도록 `setChannelVolume(ch, v)` + `setMasterVolume(v)` 메서드 노출. 기존 동작은 유지.

7. **`src/pages/casino/CosmicForge5000.tsx`** — `useSlotSound("cosmic_forge")` 호출 추가(데모 + 실제로 Cosmic 전용 voice 트리거 가능하게). 기존 `OlympusSlot` 마운트는 유지.

8. **`src/App.tsx` 또는 `src/components/casino/CasinoLayout.tsx`** — `<SoundController />`를 카지노 레이아웃에만 마운트(전역 노출 X — 다른 페이지 노이즈 방지).

## 기술 디테일

- **싱글톤 안전성**: `SlotSoundManager`는 SSR 가드(`typeof window`) 후 인스턴스 생성. 두 entry(facade vs 기존 SoundManager) 사이 mute/volume은 항상 `volumeStore`를 단일 소스로 사용해 분기 동기화.
- **모바일 최적화**:
  - 모든 Howl `html5: false`(Web Audio 사용) 유지 → iOS Safari에서도 sprite/미세 cue 안정.
  - `pointerdown`/`touchstart` 한 번에 `Howler.ctx.resume()` + procedural `AudioContext.resume()` 동시 호출(이미 구현됨, 재확인).
  - `loadCommonSounds()`는 lazy — 첫 슬롯 진입 시 1회. 페이지 전환 시 슬롯 전용만 unload, 공통은 캐시.
- **메모리 누수 방지**: `useSlotSound` cleanup에서 슬롯 전용 sounds만 `unload()`. 라우트 변경 시 BGM stop. `visibilitychange` 핸들러는 SoundManager가 이미 보유 — 중복 등록 금지.
- **TypeScript strict**: `WinTier` 유니온, `as const` config, Howl 옵셔널 체이닝 일관 적용. `noUncheckedIndexedAccess` 안전.
- **자산 라우팅 우선순위**: ① Supabase `get_slot_sound_pack` 결과 → ② `/sounds/{slotId}/...` → ③ procedural cue(`slotSound.ts`). 어느 한 단계가 실패해도 다음으로 자동 폴백.

## 마감 후 답변에 포함할 것

- 수정/추가 파일 목록
- `useSlotSound` + `SoundController` 사용 예시(Cosmic Forge 코드 스니펫)
- 추가 개선 제안: (a) `/public/sounds/` 자산 업로드 가이드(파일명 규칙·코덱·길이), (b) Supabase Storage CDN 라우팅, (c) Howler 대신 `AudioWorklet` 기반 ducking — BGM이 win cue 동안 자동 -6dB
