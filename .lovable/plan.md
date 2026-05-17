# v19 Final Polish Round 3 — Imperial Empire World #1

순수 프론트엔드 + DB constraint 수정만. money-flow 8경로, Operator Isolation, Bundle Budget, Phase D/F 0줄 변경.

## 1. Final Clean Rebuild (군대/배틀 잔재 영구 삭제)

- `src/pages/TradingArenaWithArmy.tsx`, `src/pages/WarTradingArena.tsx`, `src/components/empire/ArenaTutorialOverlay.tsx` 등 "Army/War/Arena Battle" 잔재 제거 또는 라우트에서 차단
- `App.tsx`/`Layout.tsx`/Sidebar/BottomNav 에서 "군대 배틀" 탭 및 링크 모두 grep 후 제거
- Trade 경로는 순수 `/trade`(차트+LONG/SHORT)만 남김

## 2. Imperial Live Activity — Fixed Luxury Engine

`src/components/live/ImperialLiveActivity.tsx` 리팩토링:
- 외곽: `relative` + 고정 `h-[420px] md:h-[480px]` + `overflow-hidden` + `contain: layout paint`
- 리스트: `absolute inset-0`, 각 row `position: absolute; transform: translateY()` 로 슬롯 머신처럼 위로 밀어올림 (레이아웃 reflow 0)
- `will-change: transform`, `backface-visibility: hidden`, `transform: translateZ(0)`
- Jackpot row(8% 확률): 트리플 글로우 링 + Crown 아이콘 + Hot Pink→Gold gradient + "BIG WIN" 칩 + Imperial Seal SVG + 펄스 (다른 행과 동일 높이 유지)
- `IntersectionObserver` + `visibilitychange` 가드 유지
- variant `compact`도 동일 패턴(고정 높이만 더 짧게)

## 3. Database & Console Zero Tolerance

마이그레이션 1건:
- `fomo_notifications.kind_check` constraint 에 `level_up`, `imperial_level_up`, `emperor_reward` 추가 (기존 값 보존)

콘솔 정리:
- `use-now-tick.ts` `setInterval` 에 `{ meta: { owner, category: 'cosmetic' } }` 부여 → entropy warning 제거
- AudioContext: 첫 user gesture 이후에만 `resume()` 호출하는 가드 추가 (`useSlotSound`)
- Dialog accessibility: 누락된 `DialogTitle`/`DialogDescription` 또는 `aria-describedby={undefined}` 보강

## 4. Phonara Originals Visual Masterpiece

`src/pages/Dashboard.tsx` `GameCardTile` 업그레이드:
- 게임별 cinematic SVG/그라데이션 배경 매핑 테이블 (`bgArt[gameId]`): 라디얼 다층 글로우 + particle SVG 오버레이 + 다이아몬드/번개/물결 모티프
- Hover: `translateY(-4px) scale(1.02)` + 다중 box-shadow (gold inner + pink outer) + corner-shine sweep
- Multiplier 배지: 3D 느낌 — 골드 그라데이션 + inset highlight + drop-shadow + 미세한 tilt
- 모두 디자인 토큰(`--gold`/`--pink`) 기반, 새 이미지 에셋 없이 SVG 인라인

## 5. Imperial Presence Counter

신규 컴포넌트 `src/components/live/ImperialPresenceBar.tsx`:
- "현재 **128,459명**이 제국에서 실시간으로 황제의 거래에 참여 중"
- 시드 = 시간 기반 의사난수 (110k~145k), 4~12초마다 ±수십~수백 자연스러운 drift, 가끔 +수천 점프
- `useCountUp` 으로 부드러운 tween, Warm Gold glow + subtle pulse
- Hero 바로 아래, Live Activity 위에 마운트 (Dashboard/Landing)

## 6. Mobile 60fps

- `<ImperialTradeSection />` 모바일: 가격 폰트 `clamp(28px, 9vw, 44px)`, LONG/SHORT 카드 `min-h-[64px]` thumb zone, `touch-action: manipulation`
- 스파크라인 throttle 1.2s 유지, `requestAnimationFrame` 으로 push
- BottomNav + FAB: `transform-gpu`, FAB breathing `@keyframes` (scale 1→1.06 2.4s ease-in-out infinite), hover `scale-1.08`
- 모든 인터랙티브에 `press` 클래스 + `will-change: transform`

## 7. Hero Banner Peak

`src/pages/Dashboard.tsx` & `src/pages/Landing.tsx` Hero:
- 폰트: `font-imperial`(Cinzel) `clamp(2.25rem, 7vw, 4.5rem)`, `tracking-[0.04em]`, `text-shadow-imperial-xl`
- 텍스트 gradient: gold → hot pink → warm amber 3-stop
- 배경: radial ambient(`gold/0.18` 중심 + `pink/0.12` 우상단) + 인라인 SVG particle 12개 `animate-float` (랜덤 delay)
- 서브카피 1줄, CTA 2개("지금 무료로 시작" gold pulse / "라이브 보기" outline)

## 기술 노트

변경 파일(예상):
- 신규: `src/components/live/ImperialPresenceBar.tsx`
- 수정: `ImperialLiveActivity.tsx`, `ImperialTradeSection.tsx`, `Dashboard.tsx`, `Landing.tsx`, `Layout.tsx`(잔재 링크 제거), `use-now-tick.ts`, `useSlotSound.ts`, dialog 누락 컴포넌트
- 삭제/라우트 차단: `TradingArenaWithArmy.tsx`, `WarTradingArena.tsx`, `ArenaTutorialOverlay.tsx` import 지점
- 마이그레이션 1건: fomo_notifications kind_check 확장

불변 가드:
- money-flow 8경로 / `@pkg/realtime` 4-파티션 / Operator chunk / Bundle Budget / Phase D·F push — diff 0
- 디자인 토큰만 사용, 새 RPC/edge function 0, 새 외부 이미지 에셋 0

## 검증

- `code--read_console_logs` 로 entropy / AudioContext / Dialog warning 0 확인
- Desktop(1440) + Mobile(390) 스크린샷: Dashboard 전체, Mobile Trade 섹션
- LCP 1.2s 이하 목표(Hero 텍스트 LCP, inline SVG only)
