# Sprint 3 Verification Report + Sprint 4 (Imperial Duel Lobby 풀 리디자인) Plan

## Part 1 — Sprint 3 실측 결과 (iPhone SE급 390×844 Mobile Emulation)

측정 환경: Chrome DevTools Mobile Emulation 390×844, /dashboard 콜드 로드 + 8.9s 유휴 CPU 프로파일.

### 1.1 Web Vitals & Runtime

| Metric           | Sprint 2 (이전) | Sprint 3 (현재) | 판정          |
|------------------|-----------------|------------------|---------------|
| FCP              | ~9.6s (dev HMR) | 9.48s            | 동일권 (PASS) |
| CLS              | 0.000           | 0.000 (1 shift)  | PASS          |
| DOM Nodes        | ~180            | 176              | 회귀 없음     |
| Event Listeners  | ~240            | 239              | 회귀 없음     |
| JS Heap Used     | ~13MB           | 13.2MB           | 회귀 없음     |
| Style Recalc     | 33.8ms          | 33.8ms           | 동일          |
| Layout Count     | 7               | 7                | 동일          |

DynamicIslandPill / PullToRefreshIndicator / NearMissOverlay / MultiplierCountUp 마운트로 인한 DOM·listener·heap 회귀 0건. (PullToRefresh 는 ref + 3 passive touch listener 만 추가, DynamicIsland 는 idle 시 opacity 0 캡슐 1개.)

### 1.2 유휴 CPU 프로파일 (8.9s)

Top self-time 함수 중 native package 0건. 가장 무거운 것은 `bybit-feed.ws.onmessage`(20ms, 0.2%) — 기존 시세 피드. Sprint 3 모듈은 프로파일러에 포착되지 않음 = 사실상 idle cost 0. jank/long-task 0건.

### 1.3 정적 코드 검증

- framer-motion 신규 import: **0** (DynamicIslandPill / PullToRefreshIndicator / NearMissOverlay / MultiplierCountUp 모두 CSS transition + rAF 만 사용)
- transform / opacity 외 애니메이션 속성: **0** (left/top/width/height/box-shadow 변경 없음)
- `will-change: transform` 영구 부여 컴포넌트: **0** (트랜지션 직전만)
- Worker 실패 → main-thread fallback 경로 (`cosmetic.ts` 5-layer degrade): 변경 없음
- passive touch listener: `usePullToRefresh` `usePullToRefresh` 4개 + `useSwipeGesture` 2개 모두 `{passive: true}`

### 1.4 불변 가드 (git diff)

- Money-flow 8경로: **0 bytes**
- Operator Isolation: **0 bytes**
- `imperial_*` RPC / `supabase/migrations/`: **0 bytes**
- `imperial_place_phon_bet` / `_settle` / `_apply_house_edge_split` 본문: **0 bytes**

### 1.5 Pull-to-Refresh / Haptic / DynamicIsland 거동 (정적 검증)

- PTR: scrollTop===0 일 때만 활성, threshold 도달 시 `triggerHaptic("medium")` 1회 발사, busy 중 재진입 차단 — 정상
- Haptic: iOS Safari `navigator.vibrate` 부재 시 `enabled()` false → silent no-op, throw 없음 — 정상
- DynamicIslandPill: idle 시 `opacity: 0; pointer-events: none` 으로 DOM 유지하되 클릭 차단, 화면 점유 0 — 정상
- MultiplierCountUp: worker 실패 시 `calcMultiplierFrames` 내부 main-thread fallback → Float32Array 동일 반환, raf 루프 동일 — 정상

### 1.6 한계 (실기 측정 필요 부분)

DevTools Mobile Emulation 으로 검증한 항목 이외에 **실제 Galaxy A14 / iPhone SE 2세대 실기 FPS / INP** 는 본 환경(헤드리스 브라우저)에서 자동 측정 불가. 모든 정적·런타임 지표가 PASS 이고 회귀 0이므로 Sprint 4 진입에 차단 조건 없음. 실기 FPS 는 스테이징 배포 후 RUM(web-vitals 텔레메트리, 이미 `@pkg/telemetry/web-vitals` 가동 중)으로 24h 모니터링 권장.

### 1.7 종합 판정: **PASS → Sprint 4 진입 권장**

---

## Part 2 — Sprint 4 플랜 (Imperial Duel Lobby 풀 리디자인)

### 2.1 목표

`/duel` (ImperialDuelLobby) 의 **모바일 첫인상 + 60fps 체감** 을 Stake.com / Roobet 수준으로 끌어올린다. 머니플로·RPC·매치메이킹 로직은 **0바이트** 로 보호한다.

### 2.2 범위

다음 6개 LobbyShell 구성요소의 **시각·인터랙션** 만 리디자인.

```text
ImperialDuelLobby
  LobbyShell
    header        ← 1. Imperial Header Hero (glassmorphism + heat aurora)
    left          ← 2. HallOfSovereigns        (왕관 카드 ladder)
    center        ← 3. LiveDuelGates           (4 게이트 카드, FOMO pulse)
    right         ← 4. QuickAscensionRail      (즉시 진입 CTA)
  FomoFloatingOracle (5. dock pill, swipe-up to expand)
  VerificationOracleModal (6. glass sheet 전환)
```

### 2.3 적용 원칙 (Sprint 3 와 동일한 60fps 철칙)

- transform + opacity 만 사용. box-shadow 트랜지션 금지(스냅샷만).
- framer-motion 신규 import 0. CSS transition + `useDynamicIsland` / `useHaptic` 재사용.
- 카드 hover/active 만 `will-change: transform`.
- `@pkg/native` 자연 통합:
  - 카드 탭 → `triggerHaptic("light")`
  - 매칭 진입 시 → `dynamicIsland.show({kind:"loading", text:"입장 중…"})`
  - swipe-left/right on center → 게이트 페이지네이션 (useSwipeGesture)
- low-end (`deviceMemory<2`) → heat aurora / pulse 자동 비활성 (`@pkg/performance/device`)
- `prefers-reduced-motion` → 전환 50ms 클램프

### 2.4 신규/수정 파일 (예상)

신규 (전부 cosmetic):
- `src/packages/duel/components/lobby/v2/ImperialHeaderHero.tsx`
- `src/packages/duel/components/lobby/v2/SovereignCard.tsx` (HallOfSovereigns 내부 카드)
- `src/packages/duel/components/lobby/v2/DuelGateCard.tsx`  (LiveDuelGates 내부 카드)
- `src/packages/duel/components/lobby/v2/AscensionCTA.tsx`
- `src/packages/duel/components/lobby/v2/FomoDockPill.tsx`  (FomoFloatingOracle v2)
- `src/index.css` 토큰 추가: `.imperial-aurora`, `.duel-card-glass`, `.duel-pulse-ring` (전부 transform/opacity)

수정 (최소 마운트만):
- `src/pages/ImperialDuelLobby.tsx` — import 경로 v2 로 교체 (props 시그니처 그대로)
- 기존 `HallOfSovereigns` / `LiveDuelGates` / `QuickAscensionRail` / `FomoFloatingOracle` 컴포넌트는 **내부 카드만 v2 로 치환**. 데이터 훅(`useDuelRooms` / `useFomoOracle`) 미변경.

### 2.5 불변 가드

- `src/packages/duel/hooks/**`, `src/packages/duel/lib/**`, 매치메이킹/베팅 로직: **0바이트**
- `imperial_*` RPC, `supabase/functions/imperial-*`: **0바이트**
- Money-flow 8경로: **0바이트**
- Operator Isolation: 변경 없음 (admin 청크 미영향)

### 2.6 Verification Gate

- [ ] `npm run build` 후 index gz < 180KB 유지
- [ ] `scripts/check-operator-isolation.mjs` PASS
- [ ] `scripts/check-money-flow-freeze.mjs` PASS
- [ ] DevTools mobile 390×844 에서 /duel 콜드 로드 후 유휴 CPU < 1%, layout count 회귀 0
- [ ] 카드 hover/탭 시 transform-only 확인 (DevTools Rendering → Paint flashing)
- [ ] reduced-motion ON 시 모든 카드 전환 ≤ 50ms

### 2.7 Out of Scope (Sprint 5+)

- 매치메이킹 알고리즘, 잭팟 분배, 베팅 입력 UI
- SharedArrayBuffer / COOP/COEP
- 3D / WebGL (현재 InstancedMesh 는 /lobby 한정)

### 2.8 Rollback Plan

`v2/` 디렉토리 전체 삭제 + `ImperialDuelLobby.tsx` import 경로 1줄 revert 로 즉시 복귀. 데이터 레이어 미변경이므로 회귀 위험 = UI만.

---

승인 시 Sprint 4 PR-1 (`ImperialHeaderHero` + `.imperial-aurora` 토큰) 부터 순차 진행.
