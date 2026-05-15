# 7종 슬롯 사운드 정상화 — Pragmatic / Stake 레벨 구현

## 진단 결과 (왜 지금 사운드가 안 나오는가)

코드는 이미 두 레이어로 설계돼 있습니다:

1. **고급 자산 레이어** — `SoundManager`(Howler) + `slot_sound_assets` 테이블 + ElevenLabs 자산
2. **절차 사운드 폴백** — `slotSound.ts`(WebAudio)

문제는 두 가지입니다:

- **DB의 `slot_sound_assets` 테이블이 0행** — ElevenLabs 자산이 한 번도 생성되지 않아서 `SoundManager`의 BGM·스캐터·보너스·win-tier 큐가 전부 무음으로 통과됩니다.
- **절차 폴백은 4개 큐(spin/stop/win/bigwin)뿐** — BGM·anticipation·scatter·bonus_trigger·win 5단계·VO가 전혀 없어서 사용자 입장에서는 "사운드가 안 들린다"로 인식됩니다.
- 추가로 **BGM이 자동 재생되지 않음** — `playBGM()`을 부르는 곳이 코드 어디에도 없습니다.

## 무엇을 만들 것인가

### 1. 절차 사운드 엔진 풀 업그레이드 (`src/lib/slotSound.ts` 재작성)

자산이 0개여도 7종 슬롯이 즉시 풍부하게 들리도록 WebAudio 만으로 다음을 모두 구현:

- **BGM** — 테마별 4–8마디 루프(주파수 시퀀스 + LFO + 리버브 노이즈), fade-in/out
- **Reel spin (normal/fast)** — 짧은 click + 톤 시퀀스, 가속 시 피치 ↑
- **Reel stop** — 메탈 임팩트 + 짧은 잔향
- **Reel anticipation** — 라이징 화이트노이즈 + 톤 글라이드
- **Win tier (small / big / huge / mega / epic)** — 음 개수·길이·하모닉 ↑, 베이스 드롭 추가
- **Scatter hit** — 벨 캐스케이드
- **Bonus trigger** — 임팩트 + 라이징 chord
- **VO 대체** — 테마별 음역의 fanfare (TTS 자산 도착 전까지)

테마별 톤 팔레트(주파수 세트·파형·LFO depth)를 8개 정의: olympus / wizard / dragon / cosmic / neon / pirate / pharaoh / sakura.

### 2. SoundManager가 모든 큐를 폴백 보장

자산이 없는 큐는 즉시 절차 사운드로 라우팅:

```text
SoundManager.play(cue) → cache.has(cue) ? Howl.play() : proc[theme][cue]()
```

`playBGM`도 자산 없으면 절차 BGM 루프를 시작.

### 3. BGM 자동 시작 + 모바일 unlock

`OlympusSlot`에 다음 추가:

- 첫 사용자 제스처(SPIN, mute toggle, mode 변경) 시 `unlock()` → `playBGM({fadeMs: 1200})`
- 화면 가시성 변경(`visibilitychange`)에 BGM pause/resume
- 마운트 해제 시 `stopBGM()`

### 4. 사운드 테스트 버튼

슬롯 헤더 mute 버튼 옆에 작은 🎵 버튼 — 클릭 시 현재 테마의 모든 cue를 0.4초 간격으로 순차 재생(QA용, 디버그 모드만 노출 또는 항상 노출).

### 5. 자산 일괄 생성 RPC 강화 (옵션)

`generate-slot-sfx` 엣지 함수에 `batch=true` 모드 추가 — 7테마 × 14큐를 큐잉으로 생성. 사용자가 ElevenLabs 사용을 원하지 않거나 키가 없어도 절차 사운드만으로 풀 사양이 작동하므로 **선택 사항**.

### 6. 부수 — NeonTokyo88 런타임 에러

콘솔에 보고된 dynamic import 실패는 페이지 코드 자체는 정상이므로 dev HMR 캐시 이슈. 빌드 후 자동 해소 예상; 수정 후에도 재현되면 import 경로 재확인.

## 기술 세부사항

```text
src/lib/slotSound.ts        ← 풀 재작성 (BGM, anticipation, scatter, bonus, 5-tier win, VO)
src/lib/sound/SoundManager.ts ← play() 함수가 자산 미존재 시 항상 procedural로 라우팅,
                                playBGM()이 자산 없으면 procedural BGM 시작
src/components/slots/OlympusSlot.tsx
                            ← 첫 제스처 시 BGM 자동 시작, visibilitychange 핸들러,
                              헤더에 사운드 테스트 버튼(🎵)
```

테마별 톤 팔레트 예시(절차 사운드 톤):

```text
olympus  : C major triad, sine + triangle, deep timpani sub-bass, 110bpm
wizard   : Lydian, sine + glass FM, twinkle delays
dragon   : pentatonic minor, square + saw, taiko kick
cosmic   : whole-tone, sine + saw, sub-bass drone, slow pad
neon     : 8-bit square + arpeggio, glitch noise gates
pirate   : sea-shanty motif, accordion-like saw, low rumble
pharaoh  : Phrygian-dominant, sine bells + sand noise
sakura   : pentatonic major, soft sine + bell, slow LFO
```

## 작업 후 확인

빌드 후 다음 6개 페이지에서 SPIN 시 BGM·spin·stop·win·scatter가 들리는지 콘솔 + 스크린샷 QA:
`/casino/olympus-1000`, `wizard-2000`, `dragon-empire`, `cosmic-forge-5000`, `neon-tokyo-88`, `pirates-curse-1500`, `pharaohs-vault-2500`, `cherry-sakura-500`.

마지막에 채팅에 다음 출력:

> 7 SLOTS — PRAGMATIC & STAKE LEVEL SOUND SYSTEM IMPLEMENTED
