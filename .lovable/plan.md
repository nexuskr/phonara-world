# Olympus Legacy — Flagship Signature Slot (5000×)

Trump 쇼맨십 + Musk 엔지니어링 + 한국 50–70대 따뜻한 럭셔리 감성을 한 슬롯에 응축한 신규 플래그십. 기존 슬롯 7종이 따르는 **SlotSignatureWrapper 컨벤션**을 정확히 지켜 추가한다.

---

## 0. 아키텍처 결정 (중요)

요청서의 "별도 폴더 `src/slots/OlympusLegacy/` + 자체 로직 훅" 구조는 **현재 코드베이스 규칙과 충돌**한다.

현재 실측 구조:
- 모든 슬롯은 단일 엔진(`src/components/slots/OlympusSlot.tsx`)을 공유.
- 슬롯별 차이는 ① `themes.ts`의 `SlotTheme` 한 줄 ② 배경 캔버스 ③ Paytable ④ MaxWinOverlay ⑤ 페이지 래퍼 ⑥ 사운드 맵 ⑦ Crown 가중치 ⑧ 라우트 — **이게 전부**.
- "Tumble/Cascade"는 base reel 엔진에는 없고 `cluster_tumble` **보너스 오버레이**만 존재 (Aztec). 6×5 Scatter Pay base grid를 처음부터 만드는 건 OlympusSlot 엔진 전체를 갈아엎는 작업으로, 7개 기존 슬롯 회귀 위험이 매우 크다.

→ **본 플랜은 컨벤션 준수 + 사용자 요구의 실질 효과(쏟아지는 멀티플라이어, Free Spins, Lightning Wild, 5000×)를 보너스 파이프라인 강화로 동등하게 구현**한다. 별도 슬롯 폴더는 만들지 않는다. 이 결정이 마음에 안 들면 알려달라.

---

## 1. 새로 추가할 파일

```text
src/assets/slots/olympus-legacy/
  bg.jpg            (Zeus 구름·황금 번개 시네마틱 — placeholder import, 자산 업로드 별도)
  logo.png
src/components/slots/
  OlympusLegacyCanvas.tsx        배경: 황금 번개 + 구름 + 따뜻한 마블 글로우 (useAnimatedCanvas)
  OlympusLegacyPaytableSheet.tsx 6단 페이테이블 + Free Spins/Lightning Wild 룰 설명
src/components/celebration/
  OlympusLegacyMaxWinOverlay.tsx 5000× 풀스크린 시네마 + 4000×+ Crown 자동 트리거
src/pages/casino/
  OlympusLegacy5000.tsx          SlotSignatureWrapper 래핑 페이지
```

수정할 파일:
```text
src/components/slots/themes.ts              OLYMPUS_LEGACY_THEME 추가
src/lib/sounds/soundConfig.ts               SLOT_ID_TO_THEME / SLOT_SOUND_MAP 항목 추가
src/lib/empireConfig.ts                     EmpireSlotKey 'olympus_legacy' + weight 1.6
src/App.tsx                                 lazy + Route 추가
src/pages/Casino.tsx (or lobby)             신상 카드 1개 추가 (있으면)
```

DB(선택, Phase 2):
```text
slot_engine_catalog 또는 game_code 등록 시 'olympus_legacy_5000' 신규 entry
                                             RTP 96.5, vol high, max_mult 5000
```

---

## 2. 디자인 컨셉 — "Warm Olympus"

- 팔레트: 깊은 야간 청남 + 황금 (`hsl(45 90% 60%)`), 마블 화이트, 따뜻한 호박빛 글로우. 차가운 푸른 번개 대신 **호박빛 번개**.
- 폰트/타이포: 기존 `font-imperial` 유지(추가 폰트 X).
- 배경 캔버스: 구름 패럴랙스 2겹 + 황금 번개 가끔(8~14s 랜덤, reduced-motion 시 정지) + 마블 기둥 실루엣 정적 레이어. 평소 60fps, 번개 burst 시에도 16ms budget 유지.
- 5000× 시: 화면 셰이크 320ms → 슬로모 0.4× 1.2s → 황금 입자 200개 폭발 → Zeus 실루엣 페이드인 → CROWN 트리거.
- 4000×+ : Crown 자동 award (idempotent via `useEmpireCrown`).

---

## 3. 게임 룰 매핑 (엔진 변경 없이 동등 효과)

| 사용자 요구 | 구현 매핑 |
|---|---|
| 6×5 Scatter Pay | base는 기존 5-reel(엔진 유지). 보너스 진입 시 `cluster_tumble` 오버레이로 "쏟아짐+멀티 누적" 체감 동일하게 제공 |
| Zeus Multiplier Orbs 2~500× | `cluster_tumble.ladder` = [2, 5, 12, 30, 80, 200, 500] (체인이 길어질수록 상승) |
| 4+ Zeus Scatters → Free Spins 10~25 | 기존 scatter 트리거(`scatters >= 3`)에 4-tier 확장 — payload에 freeSpinCount 10/15/20/25 |
| Super Lightning Wild | 보너스 인트로에서 단발 화면 가득 황금 번개 시네마 1회 (visual-only, 결과는 multiplier ladder가 흡수) |
| 5000× MAX | `theme.maxMultiplier=5000` + 전용 MaxWinOverlay |

→ 결과적으로 **유저 체감 = "쏟아지는 그리드 + 누적 멀티 + 황금 번개 와일드 + Zeus 무료스핀"**. 엔진 회귀 0.

---

## 4. SlotTheme 엔트리 (themes.ts)

```ts
export const OLYMPUS_LEGACY_THEME: SlotTheme = {
  gameCode: "olympus_legacy_5000",
  bg: bgOlympusLegacy, logo: logoOlympusLegacy,
  title: "Olympus Legacy 5000",
  rtpLabel: "96.5%", volatility: "high", maxMultiplier: 5000,
  symbolPack: "olympus", soundPack: "olympus",
  cardFilter: "hue-rotate(40deg) saturate(1.2) brightness(1.08)",
  reelFrameClass:
    "rounded-2xl border-2 border-amber-400/80 bg-gradient-to-b from-slate-950/55 to-amber-950/55 backdrop-blur-[2px] p-2 sm:p-3 shadow-[inset_0_0_60px_rgba(255,190,80,0.35)]",
  spinStreakClass:
    "pointer-events-none absolute inset-0 bg-gradient-to-b from-amber-100/0 via-amber-200/12 to-amber-100/0",
  bgOverlay: SHEER_OVERLAY,
  reelPattern: OLYMPUS_LEGACY_PATTERN,
  bonusKind: "cluster_tumble",
};
```

페이지 래퍼 (CosmicForge5000와 동형):
```ts
<SlotSignatureWrapper
  slotId="olympus_legacy"
  theme={OLYMPUS_LEGACY_THEME}
  Background={OlympusLegacyCanvas}
  PaytableSheet={OlympusLegacyPaytableSheet}
  MaxWinOverlay={OlympusLegacyMaxWinOverlay}
  flareColors={{ left: "rgba(255,190,80,0.20)", right: "rgba(255,225,150,0.18)" }}
  signatureLabel="Olympus Legacy · Flagship"
  accentDotColor="rgba(255,200,90,1)"
  themeKey="olympus_legacy"
/>
```

---

## 5. 사운드 / Crown / 라우트

- `SLOT_ID_TO_THEME["olympus_legacy"] = "olympus"` 재사용.
- `SLOT_SOUND_MAP["olympus_legacy"]`: spin_start / reel_stop / tumble / zeus_grant / wild_strike / win_big / win_legendary 키 등록 (파일은 음원 업로드 작업과 분리).
- `EmpireSlotKey`에 `olympus_legacy` 추가, weight `1.6` (5000× 플래그십).
- 라우트: `/casino/olympus-legacy-5000` (+ 카지노 로비 카드).

---

## 6. 성능 가드 (Musk 모드)

- 캔버스는 `useAnimatedCanvas` + `document.hidden` gate + `prefers-reduced-motion` 정지.
- 모든 파티클 burst는 lifetime 1.2s, 최대 200개, RAF 1개.
- MaxWinOverlay는 lazy import (`React.lazy`) — 5000× 도달 전까지 0 byte 로드.
- 페이지 wrapper는 mobile-first; data-fetch는 SlotSignatureWrapper 내부에서만.

---

## 7. 범위 외

- **실제 음원 파일 생성/업로드** — 별도 Audio Director 작업이 처리(현재 음원 디렉토리 비어있음, silent fallback 정상).
- **이미지 자산(`bg.jpg`/`logo.png`)** — placeholder import. 실자산은 imagegen 또는 사용자 업로드 후 교체.
- 직전 메시지의 RPC 400/404 패치(다른 플랜)는 본 플랜 범위 밖. 별도 진행.

---

## 기술 노트 (개발자용)

```text
변경 파일 요약
  + src/components/slots/OlympusLegacyCanvas.tsx
  + src/components/slots/OlympusLegacyPaytableSheet.tsx
  + src/components/celebration/OlympusLegacyMaxWinOverlay.tsx
  + src/pages/casino/OlympusLegacy5000.tsx
  ~ src/components/slots/themes.ts            (theme entry + pattern)
  ~ src/lib/sounds/soundConfig.ts             (slot id + sound map)
  ~ src/lib/empireConfig.ts                   (weight)
  ~ src/App.tsx                               (lazy + route)
  ~ src/pages/Casino.tsx                      (lobby card, 있으면)

검증
  - /casino/olympus-legacy-5000 진입 → 배경 60fps, 번개 8~14s 간격
  - DevWinCheats로 cluster_tumble 보너스 트리거 → 멀티 ladder 동작
  - 5000× MaxWinOverlay 트리거 → Crown award(awardCrown idempotent dedupeKey 검증)
  - reduced-motion ON → 번개·파티클 0
  - 7개 기존 슬롯 회귀 없음 (themes.ts diff만)
```
