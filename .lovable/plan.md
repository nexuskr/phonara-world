# Sprint 3 — Mobile Native Feel (v20.4)

목표: Stake.com 수준의 모바일 네이티브 감각을 웹에서 재현. 60fps transform-only, 회귀 0, 머니플로 0바이트.

## Scope (신규 파일 위주, 기존 페이지는 최소 마운트만)

### 1. Native Gesture Primitives (신규 패키지 `@pkg/native`)
- `src/packages/native/usePullToRefresh.ts` — `touchstart/move/end` 기반, `transform: translate3d` only, 임계값 도달 시 `navigator.vibrate(10)` + 콜백, `overscroll-behavior: contain` 자동 적용
- `src/packages/native/useSwipeGesture.ts` — 좌/우/상/하 스와이프 감지, threshold/velocity 옵션, passive listener
- `src/packages/native/useHaptic.ts` — light(10) / medium(20) / heavy(35) / success([10,40,10]) / warning / error / impact 7종. iOS Safari는 `navigator.vibrate` 미지원이므로 silent no-op (graceful)
- `src/packages/native/useDynamicIsland.ts` — 상단 pill 상태 머신(idle/loading/success/error), `safe-area-inset-top` 존중

### 2. Dynamic Island UI (신규 컴포넌트)
- `src/packages/native/components/DynamicIslandPill.tsx` — 화면 상단 중앙 캡슐, framer-motion `layout` 애니메이션, glass blur 배경, 60fps transform-only
- `src/packages/native/components/PullToRefreshIndicator.tsx` — 회전 스피너 + 진행도, transform/opacity only

### 3. Glassmorphism Tokens (CSS만, 신규 토큰)
- `src/index.css` 에 `.glass-card-imperial` / `.glass-card-imperial-strong` 유틸 추가 (backdrop-blur + 반투명 + warm-gold ring). 기존 토큰 무수정.

### 4. Worker 연결 (Sprint 2 워커 → 시각 효과만)
- `src/packages/native/components/NearMissOverlay.tsx` — `getNearMissIntensity()` 호출 → transform: scale + opacity only, Worker 실패 시 main thread fallback 자동
- `src/packages/native/components/MultiplierCountUp.tsx` — `getMultiplierFrames()` Float32Array transferable, requestAnimationFrame 으로 transform: scale 만 적용

### 5. 최소 마운트 (회귀 위험 최소)
- `src/App.tsx` — `<DynamicIslandPill />` 루트 1줄 마운트 (idle 상태 default, store 미사용 시 invisible)
- `src/pages/Dashboard.tsx` — 최상단 wrapper 에 `usePullToRefresh` 1줄 (refetch 트리거만)
- 기타 페이지는 이번 스프린트에서 건드리지 않음

## 불변 가드 (git diff = 0 보장)

- Money-flow 8경로 전체: `_apply_house_edge_split`, `imperial_place_phon_bet`, `_settle`, `imperial_swap_*`, `request_withdrawal`, `credit_crypto_deposit`, `subscribe_vip_pass_phon`, `award_crown`
- Operator 청크: `src/pages/admin/**`, `src/components/admin/**`, `src/packages/operator/**`
- `imperial_*` RPC / Edge function 본문
- `supabase/migrations/**` 변경 없음 (DB 마이그레이션 0건)

## 성능 규칙

- 모든 애니메이션: `transform` + `opacity` ONLY. `width/height/top/left/margin` 금지
- `will-change: transform` 은 hover/active 시작 시점에만, 종료 시 해제
- Pointer events: `passive: true` (스크롤 jank 0)
- `prefers-reduced-motion` 존중 → 모든 모션 즉시 종료 (50ms)
- low-end (`navigator.deviceMemory < 2` || `hardwareConcurrency < 2`) → Worker overlay 비활성, primitives 만 동작

## Verification Gate

- [ ] `git diff` money-flow 8경로 / operator / imperial_* → 0 bytes
- [ ] `supabase/migrations/` 변경 0건
- [ ] 신규 파일만 추가 (`src/packages/native/**` + App.tsx 1줄 + Dashboard.tsx 1줄)
- [ ] Bundle: index 청크 < 180KB gz 유지 (framer-motion 추가 import 0, 기존 import만 활용)
- [ ] Worker disabled / 저사양 모드 / reduced-motion 3 케이스 수동 검증
- [ ] Chrome DevTools Performance: Dashboard PTR 60fps, Near-Miss overlay 60fps

## Before/After 보고 항목

- FPS: Dashboard idle scroll / PTR 동작 / Near-Miss overlay (Worker on/off)
- INP: Dashboard 첫 인터랙션
- Bundle size delta (index / operator)
- 신규 파일 수 + LOC

## Out of Scope (다음 스프린트)

- Imperial Duel Lobby 풀 리디자인 (Sprint 4)
- Real haptic API (Capacitor 네이티브 브릿지)
- SharedArrayBuffer / COOP/COEP
- PWA splash 이미지 4종
