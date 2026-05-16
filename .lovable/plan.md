# Sugar Fever 3000 — 마무리 작업 계획

이미 캔디 캔버스/오버레이/심볼/테마 토큰은 적용되어 있어, 이번 라운드는 **"진짜 캔디 사운드 팩 + 정확성 검증 + 카드 톤 미세보정 + 성능 가드"** 4가지에만 집중합니다. 게임 로직(엔진/페이테이블/RNG)은 변경하지 않습니다.

---

## 1. 캔디 전용 사운드/음성 팩

`SLOT_ID_TO_THEME`와 `SLOT_SOUND_MAP`이 현재 `sugar_fever → olympus`(zeus_strike, marble_chime, zeus_decree)로 placeholder 상태. 캔디 답게 재배선:

- `src/lib/sound/themes.ts`: `SlotThemeKey`에 `"sugar_fever"` 추가, 기존 olympus와 동일한 BGM 톤 매핑(파일 미존재 fallback 허용).
- `src/lib/sounds/soundConfig.ts`
  - `SLOT_ID_TO_THEME.sugar_fever` / `sugar_fever_3000` → `"sugar_fever"`.
  - `SLOT_SOUND_MAP.sugar_fever`:
    - `sfx: ["candy_pop", "chocolate_splash", "lollipop_chime"]`
    - `voice: ["sugar_announce"]`
    - `legendary: { primary: "legendary_win", voice: "sugar_announce" }`
  - 파일 미존재 시 SlotSoundManager가 silent fallback 하므로 누락 mp3는 console warn만 남고 게임은 동작.
- `src/components/celebration/SugarFeverMaxWinOverlay.tsx`: `soundKeys`를 `{ primary: "legendary_win", voice: "sugar_announce" }`로 갱신, 주석에 "올림푸스 voice 폴백 제거" 명시.
- `docs/audio/elevenlabs-prompts.md`에 캔디 voice 4종 프롬프트 블록 추가(SUGAR FEVER · CANDY POP · CHOCOLATE SPLASH · LOLLIPOP CHIME, 한/영 가이드).

> 실제 mp3는 추후 업로드. 디렉토리 자동 등록 경로:
> `/public/sounds/sugar_fever/{sfx,voice,bgm}/*.mp3`

---

## 2. 심볼 번호 매핑 정합성 시뮬레이션 검증

매핑 사실관계 재확인 후 단발 시뮬레이션으로 게임 결과 ↔ paytable 일치 검증:

```text
index  symbol               paytable rank
0..4   10/J/Q/K/A           low
5      Mint Macaron         premium1 (×90)
6      Rainbow Swirl        premium2 (×140)
7      Chocolate Bar        premium3 (×180)
8      Strawberry           premium4 (×300, top)
9      Multiplier Bomb      WILD
10     Golden Lollipop      SCATTER
```

- `scripts/slot-sim.ts`는 `GAMES` 기반인데 sugar_fever는 GAMES에 미등록 → 검증용 임시 게임 코드를 sim용으로만 인라인 추가하지 않고, `scripts/check-sugar-fever-mapping.ts`(신규, run-once)를 추가:
  1. `SYMBOL_PACKS.sugar_fever` 길이 11 + 9=WILD/10=SCATTER 자산명(`sym_wild`, `sym_scatter`) 단언.
  2. `SugarFeverPaytableSheet` HIGH 배열 순서 = `["Strawberry","Chocolate Bar","Rainbow Swirl Candy","Mint Macaron"]` (×300→×90 내림차순) 단언 — paytable index 8→7→6→5 매핑과 정확히 일치.
  3. olympus_legacy_5000 가중치(W_HIGH)로 50,000 라운드 돌려 5..8 프리미엄 hit rate가 5→8로 단조감소함을 확인(=engine이 premium4를 가장 희소+고배당으로 취급).
  4. 통과 시 콘솔에 `✔ sugar_fever symbol map ↔ paytable consistent` 출력.
- 결과를 `.lovable/sim-report.md` 상단에 추가 기록.

엔진/RNG/페이테이블 어떤 코드도 수정하지 않음.

---

## 3. 캔버스/오버레이 성능 가드 강화

현재 이미 `useAnimatedCanvas`(DPR cap, 가시성 일시정지, mobile throttle, `prefers-reduced-motion` → `drawStaticFn`) 사용. 누락된 가드만 추가:

- `SugarFeverCanvas.tsx`
  - `ctx.filter = blur(...)` 사용 부분: Safari/모바일에서 무거우므로 `isMobile`이면 blur 절반(`CLOUD_FAR.blur=20`, `CLOUD_NEAR.blur=12`)로 자동 축소.
  - 캔디 개수 상한: `Math.min(window.devicePixelRatio ?? 1, 2)` 기반 추가 throttle — 고DPR + 작은 뷰포트 콤보에서 candies/sparkles 25% 추가 감산.
  - draw loop 진입부에 `if (state.candies.length === 0) return;` early-out 가드(useAnimatedCanvas 재시드 직후 1프레임 보호).
- `SugarFeverMaxWinOverlay.tsx`
  - cinematic `<style>` 블록에 `* { will-change: transform, opacity; }` 제한 — 이미 부분 적용, 누락된 chocolate splash svg에도 동일 적용.
  - 이미 있는 `@media (prefers-reduced-motion: reduce)` 블록을 hero/halo/choc 3종 모두 커버하도록 selector 보강(`svg, [data-sugar-halo]`).
- `dev` 환경에서만 동작하는 1회성 측정 hook 추가하지 않음(이미 useAnimatedCanvas 내장 가시성 가드로 충분, 추가 계측은 over-engineering).

> 회귀 방지: 다른 8개 슬롯의 캔버스는 손대지 않음. useAnimatedCanvas는 read-only로 활용.

---

## 4. cardFilter 적용 범위 확인 + 톤 미세 보정

`SlotSignatureWrapper` / `OlympusSlot`에서 `cardFilter`는 **모든 심볼 `<img>`**에 적용되어 카드(0..4)뿐 아니라 캔디 프리미엄(5..8) + WILD/SCATTER까지 영향을 줄 위험이 있습니다. 실제로는 캔디 프리미엄 PNG는 이미 채도 높은 컬러라 hue-rotate(310°)가 들어가면 색이 어긋납니다.

대응:
- `src/components/slots/OlympusSlot.tsx` (또는 심볼 렌더링 셀): `style={{ filter: idx < 5 ? theme.cardFilter : undefined }}` 처럼 **인덱스<5인 카드 심볼에만** filter 적용하도록 가드. 이미 가드가 있으면 코드 확인만 하고 변경 없음(`grep cardFilter`로 1차 확인 후 수정).
- `SUGAR_FEVER_THEME.cardFilter`를 톤 다운: `hue-rotate(310deg) saturate(1.20) brightness(1.10)` → `hue-rotate(335deg) saturate(1.15) brightness(1.08) contrast(1.02)`로 보정(붉은 자홍 대신 부드러운 살구-핑크). 캔디 프리미엄과의 경계 부드럽게.
- 브라우저 프리뷰로 `/casino/sugar-fever-3000` 진입해 카드(10/J/Q/K/A)와 macaron/rainbow/chocolate/strawberry가 같은 행에 섞여 있을 때 색 충돌 없는지 screenshot QA.

---

## 변경 파일 요약

기능 코드:
- `src/lib/sound/themes.ts` — `sugar_fever` 키 추가
- `src/lib/sounds/soundConfig.ts` — 캔디 SFX/voice 매핑 교체
- `src/components/celebration/SugarFeverMaxWinOverlay.tsx` — soundKeys + reduced-motion selector
- `src/components/slots/SugarFeverCanvas.tsx` — mobile blur/candy throttle + early-out
- `src/components/slots/themes.ts` — `SUGAR_FEVER_THEME.cardFilter` 톤 보정
- `src/components/slots/OlympusSlot.tsx` — cardFilter를 idx<5에만 적용(이미 그러면 no-op)

문서/검증:
- `docs/audio/elevenlabs-prompts.md` — sugar_fever voice 프롬프트 4종
- `scripts/check-sugar-fever-mapping.ts` (신규)
- `.lovable/sim-report.md` — sugar_fever mapping 통과 로그 1줄

DB/Edge/엔진/RNG/페이테이블/8개 기존 슬롯 **변경 없음**.
