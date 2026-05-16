# Phase 2 Pre-Flight — Registry + Legacy 계측 + RPC Baseline (revised)

Phase 1 봉쇄 완료. Phase 2 (Runtime Detox) 진입 전, **"감으로 제거"를 막는 계측·기준선** 작업만 먼저. 이 PR에서는 기존 `setInterval` 호출을 **하나도 교체하지 않는다** — 추적 도구·legacy 감지·기준선만 깐다.

핵심 원칙 한 줄:
> tracked만 보면 안 된다. legacy **untracked**를 반드시 계측해야 Phase 2 -70% KPI가 의미를 가진다.

## 결과물

1. Money-flow interval 인벤토리 (FREEZE 목록, 코드 변경 X)
2. `globalIntervalRegistry` — **tracked + untracked 분리** + coverage 비율
3. `window.setInterval` **native override** (DEV only) — 78개 legacy 자동 감지
4. `setVisibleInterval` 가 registry 에 자동 등록 (DEV only, prod 부담 0)
5. Background RPC baseline — **foreground / hidden / idle 3-mode 분리**
6. Exit 조건에 "untracked > 0" 가드 (legacy scan이 실제로 돈 증거)

## 1. setInterval 인벤토리 (현재 78개 호출, 약 70개 파일)

### 1-A. Money-flow 연결 — FREEZE (Phase 2에서 손대지 않음)

| 위치 | 주기 | 역할 |
|---|---|---|
| `packages/wallet/hooks/useDeposit.ts:173` | 30s | pending deposit 폴링 |
| `packages/wallet/hooks/useDepositRealtime.ts:69` | — | 입금 realtime 보조 |
| `packages/wallet/hooks/useDepositCountdown.ts:22` | 1s | 입금 카운트다운 |
| `lib/paper-trading/bybit-feed.ts:234/238/376` | ping/pong/5s | 가격 피드 — 베팅 직결 |
| `components/crash/hooks/useCrashRound.ts:21` | 1.5s | Crash 라운드 폴링 |
| `components/trading/MegaOrderPanel.tsx:81` | — | 주문 패널 |
| `hooks/use-kill-switches.ts:71` | 60s | 거래/출금 차단 스위치 |
| `hooks/use-auto-bet.ts:26` | 3.5s | AUTO REPEAT 베팅 |

→ PHON freeze 그대로. read-only handling.

### 1-B. UI/Cosmetic — Phase 2 1차 타겟 (이 PR에선 측정만)

`PayoutTicker`, `LivePurchaseTicker`, `MachineFomoTicker`, `VipArrivalsTicker`, `ImperialStoryRail`, `WorldDominationWall`(3개), `TopEmperorBanner`, `TournamentCountdownBar`, `LiveCounterStrip`, `JackpotEmpireBanner`, `GhostPulseGlobe`, `LiveStats`, `AttendanceCard`, `VipBoostCard`, `AuthSocialProof`(5개), `OnboardingV3`, `ThreeMinuteCashLoop`, `JourneyMap`, `KpiGridV3`, `EmpireFX`, `LiveCounterRow`, `Guide`(3개), `CountdownLossAversion`, `WinCelebrationOverlay`, `SlotTournamentBanner`(2개), 슬롯 오버레이 2개, `@pkg/live/LiveTicker`.

### 1-C. 관리자 — Phase 8 (operator 분리)와 같이 처리

`KernelObservability`, `OracleFortress`, `PhaseCMetricsPanel`, `EconomyDashboard`, `StressTestDashboard`, `RiskEngineDashboard`.

### 1-D. 이미 처리됨 (whitelist)

`lib/util/visible-interval.ts:37`, `hooks/use-now-tick.ts`, `hooks/use-realtime-channel.ts:258`.

## 2. globalIntervalRegistry (신규)

**파일:** `src/packages/performance/intervalRegistry.ts`

두 개의 Map 분리:

```ts
type IntervalMeta = {
  owner: string;          // 컴포넌트/훅 이름
  intervalMs: number;
  category: "wallet" | "trading" | "cosmetic" | "admin" | "unknown";
  createdAt: number;
  stack?: string;         // DEV only
};

const tracked   = new Map<number, IntervalMeta>();   // setVisibleInterval 경유
const untracked = new Map<number, IntervalMeta>();   // 순수 setInterval (legacy)
```

API:

- `trackInterval(id, meta)` — tracked에 등록. `category` 미지정 시 `"unknown"` + `console.warn("[interval] uncategorized", meta)` (DEV)
- `markUntracked(id, meta)` — native override가 호출
- `clearInterval(id)` 래퍼 — 양쪽 Map에서 제거
- `killCategory(cat)` — SYSTEM_DEGRADE 시 cosmetic 전체 차단
- `getSnapshot()` — `{ tracked: [...], untracked: [...] }`
- `getMigrationProgress()`:

```ts
{
  tracked: tracked.size,
  untracked: untracked.size,
  total: tracked.size + untracked.size,
  coverage: tracked.size / Math.max(1, tracked.size + untracked.size),
}
```

→ Phase 2 진행하며 coverage 0 → 1.0 으로 수렴해야 함.

**Dev-only UI:** `import.meta.env.DEV` 일 때만 우측 하단 칩 — "intervals: tracked N / legacy M (cov 12%)". 클릭 시 테이블 + stack trace.

**Telemetry:** 5분에 1회 `telemetry.event("interval.coverage", { tracked, untracked, coverage, byCategory })`.

## 3. native `window.setInterval` override (DEV only) — 가장 중요

**파일:** `src/packages/performance/intervalRegistry.ts` 부트 시 1회.

```ts
if (import.meta.env.DEV && typeof window !== "undefined") {
  const native = window.setInterval.bind(window);
  const nativeClear = window.clearInterval.bind(window);

  window.setInterval = function (fn: any, delay?: number, ...args: any[]) {
    const id = native(fn, delay, ...args);
    // tracked 에 이미 들어간 id 는 markUntracked가 무시
    if (!tracked.has(id)) {
      markUntracked(id, {
        owner: "legacy",
        intervalMs: Number(delay ?? 0),
        category: "unknown",
        createdAt: Date.now(),
        stack: new Error().stack,
      });
    }
    return id;
  } as typeof window.setInterval;

  window.clearInterval = function (id?: number) {
    if (typeof id === "number") { tracked.delete(id); untracked.delete(id); }
    return nativeClear(id as any);
  } as typeof window.clearInterval;
}
```

**부트 위치:** `src/App.tsx` 의 기존 `runWhenIdle` 부트 블록에 한 줄 추가 — `import "@pkg/performance/intervalRegistry"`. side-effect import. prod 번들에서는 `import.meta.env.DEV` 가드로 전체 dead code 제거.

**효과:** 이 PR 머지 즉시, dev 로컬에서 모든 78개 legacy interval 이 untracked Map 에 자동 수집됨. 코드 한 줄도 안 고치고 baseline 확보.

## 4. `setVisibleInterval` 수정 (registry 자동 등록)

기존: `src/lib/util/visible-interval.ts`. 시그니처에 선택적 `meta` 추가, **호환성 유지**:

```ts
export function setVisibleInterval(
  fn: () => void,
  ms: number,
  opts: { leading?: boolean; catchUpOnVisible?: boolean; meta?: Partial<IntervalMeta> } = {},
): Cleanup {
  // ... 기존 로직 ...
  const id = window.setInterval(tick, ms);

  if (import.meta.env.DEV) {
    trackInterval(id, {
      owner: opts.meta?.owner ?? "anonymous",
      intervalMs: ms,
      category: opts.meta?.category ?? "unknown",
      createdAt: Date.now(),
    });
  }
  // ... cleanup 에서 tracked.delete(id) 자동 처리 (clearInterval 래퍼가 함) ...
}
```

→ prod 부담 0, dev 에서 100% 추적. 기존 호출처는 손대지 않음 (점진적으로 `meta` 추가).

`@pkg/performance/index.ts` 에서 `setVisibleInterval` 도 re-export 해서 import 경로 단일화.

## 5. RPC baseline — foreground / hidden / idle 3-mode 분리

**파일:** `scripts/rpc-baseline.mjs` + `reports/rpc-baseline-2026-05-16.json`

KPI 의미를 위해 **반드시 3-mode 분리**:

```ts
const metrics = {
  foreground: { count: 0, byRpc: {} },  // tab active + recent interaction
  hidden:     { count: 0, byRpc: {} },  // document.hidden
  idle:       { count: 0, byRpc: {} },  // active but no interaction >60s
};
```

수집 방식:
- 브라우저 콘솔에 붙여 넣는 collector 스크립트 (Playwright 추가 안 함)
- `fetch` / `XMLHttpRequest` 패치해서 `/rest/v1/rpc/*` URL 카운트
- `visibilitychange` + 마지막 pointer/key 이벤트 시각으로 모드 분기
- 5분 시나리오: 로그인 → /dashboard 활성 5분 → 백그라운드 5분 → 복귀 5분
- 출력: 위 JSON 구조 + top 20 RPC + realtime 채널 수

Phase 2 종료 시 동일 시나리오로 재측정해 **hidden 모드 -90% / idle 모드 -70%** 검증. foreground 는 깎이면 안 됨(기능 손상 신호).

**보조:** `@pkg/telemetry` 에 `rpc.call` 8% 샘플링 이벤트 추가 → 실제 사용자 분포로 교차검증.

## 6. Exit 조건 (이 PR 완료 기준)

- [ ] `src/packages/performance/intervalRegistry.ts` + native override (DEV) 동작
- [ ] dev 칩에 "tracked N / legacy M / coverage %" 표시
- [ ] `setVisibleInterval` 가 DEV 에서 자동 trackInterval 호출
- [ ] **`untracked.size > 0` 확인** — 0이면 native override 가 안 걸린 것 → PR 실패
- [ ] `scripts/rpc-baseline.mjs` + `reports/rpc-baseline-2026-05-16.json` 커밋 (3-mode 분리)
- [ ] 기존 `setInterval` 호출은 **수정 없음** (Phase 2 1차에서 진행)
- [ ] Money-flow FREEZE 목록 = `eslint.config.js` 보호 경로와 일치 검증
- [ ] PR 템플릿에 "interval coverage % / baseline json 첨부" 2줄 추가

## 7. 비-목표

- 실제 `setInterval` → `setVisibleInterval` 이주 (= Phase 2 본작업)
- Money-flow interval 리팩터 (= PHON FREEZE)
- 관리자 패널 interval (= Phase 8 operator 분리)
- 번들 다이어트, 가상화 (= Phase 5)

## 기술 메모

- native override는 `import.meta.env.DEV` 가드로 prod 번들에서 tree-shake. 부트 import 자체가 dev 전용 모듈을 가리키도록 분리해도 됨 (`intervalRegistry.dev.ts` + `intervalRegistry.prod.ts`).
- registry는 일반 Map. 600s 초과 항목은 telemetry warn — leak 추적.
- `setTimeout` 도 동일 패턴 적용 가능하지만 이 PR에서는 범위 외 (Phase 2 안에서 결정).
- baseline 스크립트는 `scripts/v3-2-stress.ts` 패턴 따라 단일 파일·수동 실행. CI 자동화는 -70% 검증 PR에서.
- Phase 2 1차 PR 머지 기준: untracked count Δ ≥ 30 감소 + hidden RPC Δ ≥ 50% 감소.
