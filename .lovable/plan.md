# Phase 4 Slice 2 — Imperial Gold Empire 7-Game Suite 완성

## 목표
Slice 1(Plinko/Roulette/Blackjack) 위에 Baccarat / Powerball / Wheel 3종을 완성하고, 공통 시네마틱 코어와 카지노 로비 진입을 마무리한다. 머니플로 8경로는 git diff = 0.

## 작업 순서

### 1. Shared Cinematic Core (`src/packages/games/core/imperial/`)
- `useSlowMotion.ts` — 글로벌 time-scale store, `kickSlowMotion(150ms, 0.35x)` 머니샷.
- `useExplosionBurst.ts` — 256 입자 GC-free 1회성 폭발 풀, gold HSL jitter + gravity.
- `ImperialBigWinOverlay.tsx` — 전체화면 reveal: 회전 conic 골드 빔 + Crown + 스프링 타이포.
- `index.ts` 재수출.

### 2. Baccarat 패키지
- `types.ts` — Card / Hand / BetSpot(player/banker/tie/pPair/bPair) + 페이아웃 테이블.
- `engine/baccaratEngine.ts` — 8-deck Fisher–Yates 셔플, 3rd-card 규칙, total mod 10.
- `store/useBaccaratStore.ts` — bets, balance, history, phase.
- `components/ImperialBaccaratTable.tsx` — 4-zone 드롭 + 카드 0.6s easeOutQuint 슬라이드 + squeeze hold 0.9s + 골드 헤일로.
- `components/ImperialBaccaratBetPanel.tsx` — 칩 + 5존 베팅 + DEAL CTA.
- `index.ts` + `src/pages/games/BaccaratImperial.tsx`.

### 3. Powerball 패키지
- `types.ts` — 6 메인볼(1~45) + 1 파워볼(1~10) 페이아웃 사다리.
- `engine/powerballEngine.ts` — PF 시드 → 7 unique balls, 매치 카운트.
- `store/usePowerballStore.ts` — picks, powerball pick, bet, history.
- `components/ImperialPowerballCanvas.tsx` — 토네이도 회전 풀 → 중력 드롭 (6+1), 매치 펄스, 5+1 시 256-pool 폭발.
- `components/ImperialPowerballBetPanel.tsx` — 번호 선택 그리드 + 퀵픽 + DRAW CTA.
- `index.ts` + `src/pages/games/PowerballImperial.tsx`.

### 4. Wheel 패키지
- `types.ts` — 세그먼트 10/20/30/50 + risk(low/med/high) → mult 분포.
- `engine/wheelEngine.ts` — 8~10s easeOutQuart, 슬로우-스톱 ticker, PF로 winning segment.
- `store/useWheelStore.ts`.
- `components/ImperialWheelCanvas.tsx` — 골드 림, 회전 + tick 효과, 정지 시 폭발/근접 강조.
- `components/ImperialWheelBetPanel.tsx`.
- `index.ts` + `src/pages/games/WheelImperial.tsx`.

### 5. Crash 폴리시
- `useNearMissThreshold` 훅(0.5s 안에 cashout 가능했던 한도) — 색상 150ms gold→hot pink.
- 광선 8→16, cashout 시 `kickSlowMotion(150,0.4)` 트리거.

### 6. Casino 로비 통합
- `src/pages/Casino.tsx`에 "Imperial Originals" 섹션 추가: 7개 카드 (Crash/Plinko/Roulette/Blackjack/Baccarat/Powerball/Wheel) — 기존 `imperial-card`/`imperial-pulse-dot` 활용, "IMPERIAL" 뱃지, CTA → `/games/<g>/imperial`(crash는 `/crash/imperial`).

### 7. 라우트 등록 (`src/App.tsx`)
- 3개 lazy import + 3개 Route: `/games/baccarat/imperial`, `/games/powerball/imperial`, `/games/wheel/imperial`.

### 8. 통합 폴리시
- 모든 게임 페이지: `prefers-reduced-motion` 시 회전/blur 감소, `haptics.select/win`, `notify` 토스트 톤 통일.

## 기술 가이드라인
- Canvas 2D + Framer Motion + Zustand + Zod 만 사용. WebGL/Three.js 금지.
- DPR cap 2, `useViewportPause`, 60fps 목표.
- PF: 기존 `imperial_pf_commit`/`imperial_pf_reveal` RPC + `useFairnessBadge`.
- 머니플로: Plinko/Roulette/Blackjack과 동일하게 **데모 잔액 표시만**, 실 RPC 호출 변경 없음 → 8경로 git diff = 0.
- 색상 토큰: `hsl(var(--gold))`, `hsl(var(--pink))`, `hsl(var(--background))`. 하드코딩 hex 금지.

## 비범위
신규 머니 RPC, 신규 테이블, WebGL, 실시간 멀티플레이어 동기화.
