# 7-슬롯 고유 심볼 + 사운드 재생 확정

## 문제 진단

### 1) 심볼이 모든 슬롯에서 같아 보이는 이유 (확정)
`src/components/slots/themes.ts`:
- Cosmic / Neon / Sakura → `symbolPack: "wizard"` 재사용
- Pirate / Viking → `symbolPack: "dragon"` 재사용
- Pharaoh / Aztec → `symbolPack: "olympus"` 재사용

`src/assets/slots/{cosmic,neon,pirate,pharaoh,viking,aztec,sakura}/` 폴더에는 `bg.jpg` + `logo.png` 만 있고 프리미엄 심볼 이미지가 없음. 그래서 7개 신규 슬롯은 전부 기존 3종 심볼 팩을 빌려 쓰는 상태.

### 2) 사운드가 안 들리는 가능성
이전 턴에 procedural BGM/SFX를 넣었지만 실제 preview에서 한 번도 들리지 않음. 가장 흔한 원인:
- `unlock()`은 `pointerdown`에서 호출되나 `playBGM()`은 SPIN 시점에만 트리거 → 첫 진입 화면에서 BGM 무음
- `Howler.ctx`가 자산 0건 상태에서 만들어지지 않아 `Howler.mute(false)` 효과 없음
- procedural AudioContext가 mobile autoplay-policy로 `suspended` 상태에서 `start()` 됨

## 작업 (한 번에 실행)

### A. 7종 슬롯 고유 심볼 팩 생성 (각 6장 × 7테마 = 42 이미지)
각 테마별로 인덱스 5-10에 해당하는 프리미엄 6심볼을 `imagegen` (premium 품질, transparent PNG) 으로 생성하고 `src/assets/slots/<theme>/sym_*.png` 로 저장.

| 테마 | 5 (low premium) | 6 | 7 | 8 (top) | 9 (WILD) | 10 (SCATTER) |
|---|---|---|---|---|---|---|
| cosmic | 플라즈마 코어 | 행성 링 | 우주 여신 | 코스믹 엠퍼러 | WILD 블랙홀 | SCATTER 초신성 |
| neon | 사이버 도시락 | 네온 토리 | 사이버펑크 게이샤 | 메카 쇼군 | WILD 글리치 88 | SCATTER 한자 福 |
| pirate | 럼주 | 보물 지도 | 인어 | 해적왕 | WILD 해골 | SCATTER 황금 동전 |
| pharaoh | 앙크 | 풍뎅이 | 이시스 | 파라오 | WILD 호루스의 눈 | SCATTER 피라미드 |
| viking | 룬돌 | 망치 | 발키리 | 토르 | WILD 까마귀 | SCATTER 천둥번개 |
| aztec | 옥수수 | 재규어 가면 | 태양 사제 | 아즈텍 황제 | WILD 깃털뱀 | SCATTER 태양석 |
| sakura | 등불 | 부채 | 게이샤 | 사무라이 군주 | WILD 사쿠라 가지 | SCATTER 코이 |

### B. `symbolMap.ts` 확장
- `SymbolPack` 타입에 `cosmic | neon | pirate | pharaoh | viking | aztec | sakura` 추가
- 7개 신규 팩을 `SYMBOL_PACKS` 에 등록 (카드 0-4는 기존 공유, 5-10은 신규 import)

### C. `themes.ts` 매핑 교정
모든 테마의 `symbolPack` 을 본인 코드(`cosmic`, `neon`, …)로 변경.

### D. 사운드 강제 재생 보증
`OlympusSlot.tsx`:
- 컴포넌트 mount 시 첫 user gesture(`pointerdown`/`touchstart`/`click`) 한 번에 `await SoundManager.unlock(); SoundManager.playBGM();` 실행하는 단일 래퍼 추가 (현재는 두 곳에 분산)
- 헤더 🎵 버튼 클릭 시 `SoundManager.testAll()` 호출 — QA용
- mute 토글 OFF 시 즉시 `playBGM()` 재호출

`SoundManager.ts`:
- `unlock()` 직후 `Howler.ctx`가 없으면 빈 `new Howl({src:[silent.mp3]})` 우회 대신, procedural AudioContext도 `await ctx.resume()` 명시
- `setMuted(false)` 시 BGM 자동 재시작 보장 (현재는 `if (this.bgm)` 가드 때문에 procedural BGM이 한 번도 시작 안 했으면 무음)

### E. 검증
- preview 콘솔에서 `SoundManager.testAll()` 가능하도록 `window.__sm = SoundManager` 디버그 노출 (개발 모드만)
- 7개 슬롯 각 페이지 진입 시 BGM 시작 + SPIN 시 reel/stop/win cue 들리는지 사용자 확인 요청

## 비범위
- Pragmatic급 마스터링된 실제 mp3 자산은 ElevenLabs API 키 + `slot_sound_assets` 시드가 있어야 가능. 이번 단계는 procedural 풀백을 확실히 동작시키는 데 집중.
- Win Celebration tier 시각 연출 추가는 다음 라운드.

## 산출물
- 42장 PNG (`src/assets/slots/<theme>/sym_*.png`)
- 수정: `symbolMap.ts`, `themes.ts`, `OlympusSlot.tsx`, `SoundManager.ts`
