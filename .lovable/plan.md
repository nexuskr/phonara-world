# Phase 2 — EXECUTION LOCK (No-Option Mode)

> We do not change the system. We force the system to reveal itself until it becomes governable.
> Ledger is the single source of truth. Money-flow is immutable. Only cosmetic/admin migrate.

Phase 2 Pre-Flight (visibility instrumentation) 완료. 본 문서는 다음 8개 PR 의 **변경 불가 실행 계약**.

**진행 상태:** PR-A ✅ (`reports/triage.2026-05-17.json`, 78개 entry, money_flow=12 / cosmetic=53 / admin=9 / unknown=0 / false_positive=1) · PR-B ⏳ 대기.

## 0. System Definition (절대 고정)

- This system is NOT optimized.
- This system is NOT refactored.
- This system is migrated **only** through visibility-driven triage.

## 1. Execution Hierarchy (우선순위 — 절대 고정)

1. **Money-flow stability** — IMMUTABLE
2. **Runtime behavior consistency** — DO NOT ALTER
3. **Visibility improvement** — ONLY ALLOWED CHANGE
4. **Cosmetic performance tuning** — SAFE ZONE ONLY

상위 순위가 하위를 무조건 선점한다. 충돌 시 상위 보존.

## 2. Workflow Engine — HARD PIPELINE

```text
PR-A → PR-B → PR-C → PR-D → PR-E → PR-F → PR-G → PR-H
```

**RULES (위반 시 PR reject):**
- 순서 변경 금지
- 병합 금지 (각 PR 독립 머지)
- 스킵 금지
- 재정렬 금지

| PR | 목적 | 코드 변경 |
|---|---|---|
| **A** | Triage Freeze List | 0 줄 (분류 JSON 만) |
| **B** | Cosmetic Wave 1 (ticker/marquee/countdown) | setInterval → setVisibleInterval |
| **C** | Cosmetic Wave 2 (rail/pulse/banner) | 동일 |
| **D** | Admin Panels (operator/kpi/kernel) | 동일 + governor 등록 |
| **E** | Unknown 잔여 강제 분류 | unknown=0 보장 |
| **F** | Hidden-Tab Suspension (governor.pauseCategory("cosmetic")) | governor 구현 |
| **G** | Idle Suspension (60s → admin pause) | governor 확장 |
| **H** | Exit Audit | 측정 only |

## 3. Mutation Rule (변경 허용 범위)

**ONLY ALLOWED TRANSFORMATION:**
- `setInterval` → `setVisibleInterval` (cosmetic / admin only)
- interval registration → ledger mapping
- RPC → observation only (no schema change)

**FORBIDDEN TRANSFORMATION:**
- business logic change
- money-flow interval modification
- RPC payload modification
- timing behavior change (ms, leading, debounce, throttle)

## 4. Ledger Authority Model

**SINGLE SOURCE OF TRUTH:**
- `runtime.registry.snapshot()`
- `entropy.surface.snapshot()`
- `rpc.surface.snapshot()`

**CATEGORY AUTHORITY:**

| category | authority | rule |
|---|---|---|
| `money_flow` | IMMUTABLE | freeze level 0 — never touch |
| `cosmetic` | migratable | visibility-aware only |
| `admin` | governor-controlled | pause/resume only |
| `unknown` | entropy | must resolve before PR-E completion |

## 5. PR Execution Contract (공통)

**REQUIRED BEFORE MERGE (모든 PR):**
- entropy count updated → `reports/entropy.surface.<date>.json`
- coverage recalculated (단조 증가)
- rpc surface baseline attached → `reports/rpc.surface.<date>.json`
- money-flow git diff = **0 lines** (CI `check-money-flow-freeze.mjs`)

**VALIDATION GATES — PR fails if:**
- unknown category exists after PR-E
- coverage does not monotonically increase
- hidden RPC reduction is not measurable (PR-F)
- idle RPC reduction is not reproducible (PR-G)
- production bundle delta > +0.5KB per PR

## 6. Naming Convention (IMMUTABLE SCHEMA)

```text
@pkg/runtime
  runtime.registry        # dual ledger
  runtime.observe         # window.setInterval override (DEV)
  runtime.governor        # pause/resume/kill category
  runtime.lattice         # owner/category mapping

@pkg/entropy
  entropy.surface         # live runtime footprint
  entropy.capture         # boot capture
  entropy.map             # stack → owner → category

@pkg/risk
  risk.reactor / risk.kill-switch / risk.degrade  (Phase 4 stubs)
```

**RPC SURFACE MODEL:**
- `rpc.surface.foreground`
- `rpc.surface.hidden`
- `rpc.surface.idle`

**GOVERNOR ACTIONS:**
- `pauseCategory(cat)`
- `resumeCategory(cat)`
- `killCategory(cat)` ← Phase 4 only (PR-F/G 에서는 호출 안 함)

## 7. Migration Behavior Rule

- **Cosmetic** → visibility-aware execution only
- **Admin** → governor-controlled execution only
- **Unknown** → resolved OR explicitly frozen (이유 기록) before PR-E exit
- **Money-flow** → NEVER TOUCH

## 8. KPI Interpretation (중요)

```text
coverage:
  ≠ performance
  ≠ optimization
  = system observability completeness

hidden RPC:
  = background cost leakage
  → must converge downward without affecting foreground behavior

idle RPC:
  = unattended system entropy
  → must be reduced via suspension only, not deletion
```

**PR-H exit thresholds:**

| 지표 | 기준 |
|---|---|
| coverage | ≥ 0.7 |
| `category=unknown` | 0 |
| `untracked.size` | < 5 (장기 freeze 만) |
| hidden RPC | baseline 대비 -90% |
| idle RPC | baseline 대비 -70% |
| money-flow git diff (전체) | 0 줄 |
| bundle delta (전체) | ≤ +2KB |

## 9. Execution Loop (MANDATORY)

각 PR 내부에서 반드시 이 순서로:

1. Snapshot ledger
2. Classify entropy
3. Assign PR ownership
4. Migrate ONLY cosmetic / admin
5. Recalculate coverage
6. Validate RPC surfaces (3-mode)
7. Commit reports

## 10. System Guarantee (FINAL CONTRACT)

This phase guarantees:
- No business logic mutation
- No money-flow disturbance
- No hidden execution
- No uncontrolled interval execution
- Full runtime observability through ledger only

## 11. 즉시 시작 — PR-A (Triage Freeze List)

**산출물 1개:** `reports/triage.2026-05-17.json`

```ts
type TriageEntry = {
  owner: string;          // file:line
  intervalMs: number;
  category: "money_flow" | "cosmetic" | "admin" | "unknown";
  decision: "freeze" | "migrate" | "delete-candidate";
  ownerPR: "B" | "C" | "D" | "E" | null;   // freeze 면 null
  notes?: string;
};
```

**규칙:**
- entropy snapshot 의 모든 항목 → 1:1 매핑 (누락 = PR fail)
- `money_flow` → `freeze`, `ownerPR=null`
- `cosmetic` ≤ 2s 주기 + 화면 의존 → `migrate`, B/C 분배
- `admin` → `migrate`, D
- 분류 실패 → `unknown` 유지 → E
- **코드 변경 0 줄.** triage JSON + 본 plan 갱신만.

**게이트:** 78 항목 합 = ledger snapshot 합. 일치하지 않으면 PR-A reject.

## 12. Money-flow FREEZE 인벤토리 (재확인 — 절대 수정 금지)

| 위치 | 주기 |
|---|---|
| `packages/wallet/hooks/useDeposit.ts:173` | 30s |
| `packages/wallet/hooks/useDepositRealtime.ts:69` | — |
| `packages/wallet/hooks/useDepositCountdown.ts:22` | 1s |
| `lib/paper-trading/bybit-feed.ts:234/238/376` | ping/pong/5s |
| `components/crash/hooks/useCrashRound.ts:21` | 1.5s |
| `components/trading/MegaOrderPanel.tsx:81` | — |
| `hooks/use-kill-switches.ts:71` | 60s |
| `hooks/use-auto-bet.ts:26` | 3.5s |

CI `check-money-flow-freeze.mjs` 가 모든 PR 에서 자동 차단.

## 한 줄

> 코드를 바꾸는 것이 아니라, runtime 을 ledger 기반으로 분해해 단계적으로 통제 가능한 운영 시스템으로 만든다.
