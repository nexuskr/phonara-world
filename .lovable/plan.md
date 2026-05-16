# Phase 3 — Active Governance & Detox 마무리 (PR-I → PR-J → PR-K)

Phase 2 Visibility (PR-A~H)는 EXIT. hidden/idle bucket을 0.0까지 못 쥐어짠 잔여 1~2건은 `platform_kill_switches` realtime callback + 경계 race로 잔존 — **수용 가능한 noise**로 동결하고, 다음 단계로 진입한다.

다음 단계는 v3.0 LOCKED "미완 / 다음 단계"에 명시된 3건 + Phase 4 governor 활성화를 PR-I/J/K 3장으로 묶는다.

---

## 작업 순서 (직렬 — 앞 PR 머지 후 다음 시작)

```text
PR-I  Active Governor + Degrade Mode  ── 런타임 엔진
   └─→ PR-J  Realtime Partition 마이그레이션  ── 데이터 채널
        └─→ PR-K  Operator Isolation  ── 코드 경계
```

각 PR은 독립 머지 가능. 롤백도 PR 단위. money-flow 8경로 git diff = 0줄 계약은 PR-I/J/K 모두 유지.

---

## PR-I — Active Governor + Degrade Mode

**목적**: Phase 2의 cooperative pause(`setVisibleInterval`만 honor)에서 한 단계 진입 — `killCategory`/`killAll` 스텁을 LIVE화하고, §14-5 Emergency Degrade Mode를 platform 레벨로 노출.

### 변경
1. `@pkg/runtime/runtime.governor.ts`
   - `killCategory(cat)` 실제 구현: `listIdsByCategory(cat)` → `clearInterval(id)` + `forgetInterval(id)`. tracked만 대상, untracked(money-flow 12경로)는 **절대 미접근**.
   - `killAll()` = cosmetic + admin만 순회. money-flow 카테고리 화이트리스트로 제외.
   - DEV에서 kill 시 `console.warn` + `__phonaraGovernor.lastKill` 노출.
2. `platform_kill_switches` 마이그레이션
   - 컬럼 추가: `degrade_mode boolean default false`, `degrade_reason text`.
   - 기존 4개 스위치와 동일 RLS / admin RPC 패턴.
3. `src/hooks/use-degrade-mode.ts` (신규)
   - `useKillSwitches()` 위에 얇은 selector. `{ degraded, reason }` 반환.
   - degraded=true → `document.body.dataset.degrade = "1"` 부착 (Tailwind `degrade:` variant 활성).
4. `src/App.tsx`
   - 루트에 `<DegradeModeBinder />` (effect-only) 마운트.
5. `/admin/ops/self-heal`
   - 기존 kill-switch 패널에 "Degrade Mode" 토글 추가. 켜는 순간 `killCategory("cosmetic")` 호출하여 즉시 회수.

### 검증
- `__phonaraSurface.runScenario()` 다시 실행 — degrade ON 상태에서 cosmetic bucket = 0 hard.
- `scripts/check-money-flow-freeze.mjs` PASS.
- `[runtime.governor] killCategory(cosmetic) → cleared N ids` DEV 로그.

---

## PR-J — Realtime Partition 마이그레이션

**목적**: 기존 `useRealtimeChannel` 직접 호출부를 `@pkg/realtime`의 4-partition 래퍼(`useWalletChannel`/`useGameChannel`/`useChatChannel`/`useMarketChannel`)로 일괄 이전. 채널 key prefix 강제 → 누수/중복 구독 일소.

### 변경
1. 인벤토리: `rg "useRealtimeChannel\(" src` 결과를 4 partition 중 하나로 분류 (wallet/game/chat/market 외 admin = `useGameChannel("admin:...")` 임시 수용).
2. 호출부 일괄 교체 — 한 PR에서 한 번에. 부분 마이그레이션 금지 (mixed state 디버깅 비용 ↑).
3. ESLint 룰 `no-raw-channel` 확장: `useRealtimeChannel` 직접 import 금지 → `@pkg/realtime/*`만 허용. 기존 그랜드파더 목록 비움.
4. `mem://realtime/unified-channel` 갱신 — "직접 호출 금지" → "partition 래퍼만 허용"으로 강화.

### 검증
- `rg "from \"@/hooks/use-realtime-channel\"" src` 결과 0건.
- DevTools Network WebSocket frames에서 channel key가 `wallet:` / `game:` / `chat:` / `market:` 접두사로만 시작.
- 회귀: wallet 잔액 realtime / Crown war 알림 / 채팅 / 오라클 가격 4개 스모크.

---

## PR-K — Operator Isolation

**목적**: `src/pages/admin/**` + `src/components/admin/**`를 `src/packages/operator/`로 이전. Layer 1 entry 그래프에서 admin 코드 완전 제거 → bundle-check 180KB 마진 회복.

### 변경
1. 디렉터리 이동
   - `src/pages/admin/*` → `src/packages/operator/pages/*`
   - `src/components/admin/*` → `src/packages/operator/components/*`
   - import path는 `@pkg/operator/pages/...`로 통일.
2. `src/App.tsx` 라우터에서 admin 라우트 그룹을 `React.lazy(() => import("@pkg/operator/router"))`로 단일 진입점 lazy.
3. `dependency-cruiser`에 layer 룰 추가
   - `@pkg/operator` → 일반 페이지/컴포넌트 import 금지 (역방향만).
   - 일반 코드 → `@pkg/operator` import 금지.
4. `vite.config.ts` manualChunks에 `operator` 그룹 명시 (admin 전용 청크 격리).
5. bundle-check Layer 1 예산 측정 → 회복분(예상 -15~25KB gz) 리포트에 기록.

### 검증
- `bun run build` 후 `dist/assets/operator-*.js` 단일 청크 + entry에서 import 없음.
- `scripts/bundle-check.mjs` Layer 1 PASS, 마진 ≥ 10KB.
- /admin/* 라우트 네비게이션 동작 + AAL2 게이트 회귀.

---

## 네이밍 규칙 (PR-I/J/K 공통)

| 종류 | 규칙 | 예 |
|------|------|----|
| 패키지 alias | `@pkg/<domain>` kebab. 신규 도메인 코드는 alias만 | `@pkg/runtime`, `@pkg/operator` |
| 훅 | `use-<feature>.ts` kebab 파일, `useFeature` export | `use-degrade-mode.ts` → `useDegradeMode` |
| 컴포넌트 | `PascalCase.tsx`, prop type은 `XxxProps` | `DegradeModeBinder.tsx` |
| 카테고리 키 | `RuntimeCategory` enum 문자열 — `cosmetic` / `admin` / `money_flow` 고정 (snake) | `pauseCategory("cosmetic")` |
| 채널 key | `partition:resource[:id]` colon-separated | `wallet:balance`, `game:crown-war:42` |
| Kill switch 컬럼 | snake_case + `_halt` 또는 `_mode` 접미 | `degrade_mode`, `trading_halt` |
| 마이그레이션 파일 | Supabase 기본 `YYYYMMDDHHMMSS_<slug>.sql`. slug는 `pr-i-degrade-mode` 형식 | `20260517101500_pr-i-degrade-mode.sql` |
| 리포트 | `reports/<surface>.<YYYY-MM-DD>.json`. PR-I/J/K 종료마다 1장 | `reports/rpc.surface.2026-05-24.json` |
| 콘솔 prefix | `[runtime.governor]` / `[rpc.surface]` / `[@pkg/<domain>]` | `[runtime.governor] killCategory(cosmetic)` |
| 메모리 키 | `mem://features/phase-3-active-governance` 처럼 phase 단위 | — |
| Phase/PR 코드 | Phase 정수, PR 알파벳 — Phase 3은 I부터 시작 (H까지 Phase 2 사용) | PR-I, PR-J, PR-K |

---

## 변경 파일 예상 목록

PR-I
- `src/packages/runtime/runtime.governor.ts`
- `src/hooks/use-degrade-mode.ts` (신규)
- `src/components/system/DegradeModeBinder.tsx` (신규)
- `src/App.tsx`
- `supabase/migrations/<ts>_pr-i-degrade-mode.sql`
- `src/pages/admin/SelfHeal.tsx` (Degrade 토글 추가)

PR-J
- `src/packages/realtime/**` (래퍼는 이미 존재, export 정리)
- `src/hooks/use-*.ts` 중 realtime 사용처 일괄
- `eslint.config.js` (no-raw-channel 확장)
- `mem://realtime/unified-channel`

PR-K
- `src/pages/admin/**` → `src/packages/operator/pages/**` (이동)
- `src/components/admin/**` → `src/packages/operator/components/**` (이동)
- `src/App.tsx` 라우터 lazy
- `.dependency-cruiser.cjs`
- `vite.config.ts` manualChunks

---

## 종료 기준 (Phase 3 EXIT)

- PR-I/J/K 모두 머지 + 각 PR 리포트 1장씩 `reports/`에 남김.
- money-flow 8경로 누적 git diff = 0줄.
- Layer 1 bundle 예산 마진 ≥ 10KB.
- `__phonaraSurface.runScenario()` degrade ON 시 cosmetic bucket = 0 hard.
- ESLint `no-raw-channel` 그랜드파더 = 빈 배열.
- `mem://features/phase-3-active-governance` 생성, `mem://index.md` Core에 한 줄 요약 추가.
