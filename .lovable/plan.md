# PR-P0-2 — Rate Limiting & Global Polling Optimization (Phase 2)

## Goal
모든 클라이언트 폴링을 단일 **Adaptive PollingManager**로 통합해 background/idle/저전력 단말에서 RPC 호출량을 60–80% 감소시킨다. 머니플로 8경로와 사용자 UI는 무변경.

## What gets built

### 1. PollingManager (신규 코어)
**`src/lib/polling/PollingManager.ts`** — 단일 글로벌 싱글톤.

- Priority queue: `critical | high | normal | low | cosmetic` (5단계)
- Adaptive interval = `base × visibilityMul × activityMul × deviceMul × backoffMul`
  - `visibilityMul`: 보임=1, 숨김=∞ (skip)
  - `activityMul`: 마지막 user input <30s=1.0, <2m=1.5, <10m=2.5, idle=4.0
  - `deviceMul`: high=1.0 / mid=1.3 / low=2.0 (`@pkg/performance/device`)
  - `backoffMul`: 연속 실패 시 exp + jitter (1→2→4→8, cap 30s × base)
- Concurrency cap: 동시 in-flight ≤ 4 (priority preempt)
- Tracked ledger 연동(`@pkg/runtime` trackInterval) — Phase 2 Visibility 호환
- Money-flow 카테고리는 등록 불가(throw) — 가드 fail-closed

### 2. Hook surface
**`src/hooks/polling/useGlobalPolling.ts`**
```ts
useGlobalPolling({ key, intervalMs, priority, owner, run })
```
- key 중복 등록 시 reference count + 가장 짧은 interval 채택
- 언마운트 시 dec; 0이 되면 해제
- 반환: `{ lastRun, lastError, manualRun }`

### 3. 마이그레이션 대상 (raw `setInterval` → useGlobalPolling)
사용자 영역 cosmetic/social polling 위주 — money-flow / kernel / admin 비대상.

| 파일 | 기존 ms | priority |
|---|---|---|
| `src/hooks/use-live-fomo-counters.ts` | 12s | normal |
| `src/hooks/use-friend-ranking.ts` | 60s | low |
| `src/hooks/use-now-tick.ts` (clock) | 1s | cosmetic (visible-only) |
| `src/components/fomo/LiveTradingCounter.tsx` | 12s | low |
| `src/components/trading/v3/PhonLiveSocialProof.tsx` | – | low |
| `src/components/trading/v3/HotCoinRail.tsx` | – | normal |
| `src/components/empire/ImperialLiveWinsRail.tsx` | – | low |
| `src/components/lobby/v3/ProximityFomoToast.tsx` | – | cosmetic |
| `src/packages/wallet/hooks/useDepositCountdown.ts` | 1s | normal (visible-only) |
| `src/packages/duel/hooks/useFomoOracle.ts` | – | low |
| `src/packages/apex/landing/LandingBigWinTicker.tsx` | – | cosmetic |
| `src/packages/apex/landing/LandingRaceCountdown.tsx` | – | cosmetic |
| `src/packages/apex/components/ApexBigWinTicker.tsx` | – | cosmetic |
| `src/packages/apex/games/SlotsLiteGame.tsx` (UI tick) | – | cosmetic |

**제외 (raw setInterval 유지)**:
- `useDepositRealtime` / `useDeposit` / `useCrashRound` — money-flow 8경로
- `bybit-feed.ts` — oracle feed
- `admin/*` (ImperialActivationPanel, Phase1LiveMonitor, DuelHealthDashboard, ImperialCircuitPanel, RegionHealth, Sprint4Dashboard, CommandCenter) — operator 청크 격리, 별도 PR
- `runtime.idle.ts`, `clientMetrics.ts`, `visible-interval.ts` — infra primitives
- `useDuelRoom` / `useSpectatorSync` / `useOddsEngine` / `useApexRace` / `useVrfTrace` — 게임 엔진 실시간 (별도 검토 후 P0-3)

### 4. Rate Guard
**`src/lib/api/rateGuard.ts`** — per-(user, endpoint) sliding window + exp backoff.
- API: `guarded(endpoint, fn, { maxPerMin?=120, burst?=10 })`
- 초과 시 즉시 throw `RateLimitedError`(retry-after) — 호출자가 backoff 결정
- PollingManager가 자동 wrap (manual fetch는 opt-in)
- 머니플로 RPC allowlist는 가드 우회(deny-list 검사 후 통과)

### 5. Health Dock 카드
**`src/components/admin/PollingStatusCard.tsx`** (admin 전용, operator 청크) — `/admin/ops/self-heal`에 1장 추가.
- active pollers (count by priority)
- calls/min (마지막 60s rolling)
- saved requests (visibility/activity로 skip한 누적)
- top 5 owners by call volume

## Guardrails (절대 불변)
- **머니플로 8경로 git diff = 0**: `imperial_place_phon_bet`, `_settle`, `_apply_house_edge_split`, `request_withdrawal`, `credit_crypto_deposit`, `swap_*`, `stake_*`, `subscribe_vip_pass_phon` 호출부 무변경
- **UI/카피 변경 0**: 사용자 가시 영역 텍스트·색·간격 무변경
- **money_flow 카테고리 등록 차단**: PollingManager가 throw — fail-closed
- **Layer 1 번들 영향 < 2KB gz**: PollingManager는 single tiny module, treeshake-safe, admin 카드는 operator 청크
- **Phase 2 ledger 호환**: 모든 등록은 `trackInterval`로 tracked ledger 적재

## Technical details

### File map
```text
NEW  src/lib/polling/PollingManager.ts          ~180 LOC
NEW  src/hooks/polling/useGlobalPolling.ts       ~70 LOC
NEW  src/lib/api/rateGuard.ts                    ~90 LOC
NEW  src/components/admin/PollingStatusCard.tsx  ~120 LOC (operator chunk)
EDIT 14 cosmetic/social hook & component files (setInterval → useGlobalPolling)
EDIT src/pages/admin/ops/SelfHeal.tsx (mount PollingStatusCard)
NEW  docs/operations/polling-manager.md (운영 가이드)
```

### Adaptive math (예시)
```text
base=12s, visible, idle 5분, mid device, no failures
→ 12 × 1 × 2.5 × 1.3 × 1 = 39s
base=12s, hidden tab
→ skip(0 call)
base=12s, visible, active <30s, high device, 2 fails
→ 12 × 1 × 1 × 1 × 4 = 48s (backoff)
```

### Test plan
1. Dev: open `/admin/ops/self-heal` → PollingStatusCard에서 active pollers 확인
2. 백그라운드 탭 2분 → calls/min == 0, saved requests 증가
3. idle 10분 → low priority pollers interval 4x
4. 머니플로 grep: 8 RPC 함수 호출부 변경 0건 (`git diff --stat` 확인)
5. Layer 1 번들: bundle-budget.mjs PASS (180KB 유지)

## Expected outcome
- 백그라운드 RPC 호출량: 30/min → 0
- idle 10분 클라이언트 RPC 호출량: 60/min → 12–18/min (70% 감소)
- 평균 활성 클라이언트 RPC 호출량: 30% 감소 (adaptive)
- Layer 1 gz 영향: +1.5KB 예상
- 사용자 가시 변화: 0

## Out of scope (P0-3 이후)
- Admin operator 폴링(`Phase1LiveMonitor`, `CommandCenter` 등) 통합
- Game engine real-time(`useDuelRoom`, `useApexRace`) 통합
- Oracle feed(`bybit-feed`) 통합
- Backend rate limiting (no-backend-rate-limiting directive 유지)
