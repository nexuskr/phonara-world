# Hybrid Prerender + Performance Optimization (Pass 1)

## 목표

phonara.world 의 첫 로딩 체감을 크게 개선한다. 공개 페이지는 Playwright 로 정적 HTML 을 미리 만들어 두고, 대시보드/업적/출금 페이지의 불필요한 반복 호출과 400 에러를 제거한다.

머니플로 8경로, Operator Isolation, Bundle Budget, Realtime Partition, Active Governor 는 **단 한 줄도** 수정하지 않는다.

## 현재 상태(기존 자산)

이미 존재:
- `scripts/prerender.mjs` — Playwright 러너, 18s timeout, retry 3, leak hook 포함
- `scripts/check-prerender-leak.mjs` — 9개 키워드 + anon key allowlist
- `.github/workflows/prerender.yml` — build → prerender job
- `package.json` — `build:prerender` 스크립트 이미 등록
- `src/lib/prerender.ts` — `isPrerender()` / `isPrerenderBuild()` 헬퍼

따라서 "신규 생성"이 아니라 **보강 + 누락 라우트 추가 + 성능 패치**가 실제 작업이다.

## 작업 1. Prerender 보강

### 1-A. 공개 라우트 8개 동기화 (`scripts/prerender.mjs`)

`PUBLIC_ROUTES` 를 다음 8개로 통일:

```
/, /trust, /empire, /founding-seat, /vip, /status, /legal/terms, /legal/privacy
```

현재 7개. `/founding-seat` 가 누락 → 라우트 존재 여부 검증 후 추가. 만약 실제 라우트가 `/empire/my-seat` 라면 그 경로를 사용 (단계 1에서 `src/App.tsx` 라우트 테이블만 read-only 로 확인).

### 1-B. Leak 키워드 15+ 종으로 강화 (`scripts/check-prerender-leak.mjs`)

기존 9개에 다음을 추가:

```
service_role_key, supabase_service, api_key, apikey, x-api-key,
authorization:, set-cookie, sb-access-token, sb-refresh-token,
totp_secret, otp_code, pin_hash, recovery_code, withdraw_otp,
session_token
```

anon publishable JWT allowlist 는 그대로 유지(safe).

### 1-C. CI

`.github/workflows/prerender.yml` 은 이미 build → prerender → leak-check 흐름 — 그대로 둔다. 보강된 키워드/라우트가 자동 반영된다.

### 1-D. 검증 명령

- `npm run build:prerender` 로컬에서 성공해야 함
- `node scripts/check-prerender-leak.mjs` PASS
- `node scripts/check-money-flow-freeze.mjs` 0 diff
- `node scripts/check-operator-isolation.mjs` PASS

## 작업 2. 성능 최적화

### 2-A. `get_my_dashboard_state` 호출 -70%

현재 `src/hooks/use-imperial-state.ts`:
- 마운트 시 1회 + `setVisibleInterval(30s)` + `focus` 이벤트마다 호출
- 같은 페이지에 `<ImperialHud/>`, `<BoosterPill/>`, `<EscalationCallout/>` 가 각각 `useImperialState()` 를 호출 → **N중 호출**

수정안 (state 변경 없음, 호출 dedupe 만):

1. 모듈 스코프 `inflight: Promise | null` + `lastFetchedAt: number` 캐시.
2. `refresh()` 가:
   - 마지막 호출이 15초 이내면 즉시 캐시 반환 (SWR fresh window)
   - inflight 가 있으면 같은 promise await
   - 그 외에만 실제 RPC 호출
3. 결과는 모듈 스코프 `cachedState` 에도 저장 → 새 컴포넌트 마운트 시 1차 렌더부터 채워짐.
4. `setVisibleInterval` 주기 30s → 60s 로 완화. focus 핸들러는 유지하되 위 dedupe 거침.
5. `wallet:refresh` 이벤트(이미 존재) 수신 시 cache 무효화 1회만.

기대 효과: 동일 페이지 동시 마운트 N개 → 1회로 수렴, 백그라운드 폴링 빈도 절반.

### 2-B. `check_achievements` 호출 dedupe

`src/hooks/use-achievement-watcher.ts`:
- 현재 `trigger` 바뀔 때 + focus 마다 호출
- Layout 어디서 여러 번 사용되면 중복

수정: 동일한 모듈 스코프 `inflight + lastAt(10s)` 가드 추가. trigger 가 바뀌어도 10s 내면 skip. 결과 unlock 비교 로직(seen Set)은 그대로 유지.

### 2-C. `withdrawal_status` 관련 400 에러 제거

`src/packages/wallet/components/WithdrawHistory.tsx` 의 `.select("id,amount,method,status,created_at,tx_code")` 자체는 정상.
의심: 다른 호출 지점이 enum 값으로 `.eq("status", "...")` 또는 `.in("status", [...])` 에 정의되지 않은 값(`failed` 등) 을 보내고 있을 가능성.

작업:
1. `rg "withdrawal_requests" src/` 결과 전 호출지점에서 `status` 필터 값이 enum `pending/approved/processing/completed/rejected/cancelled` 에 모두 포함되는지 검증.
2. 잘못된 값이 있으면 enum 에 맞는 값으로 정정 (예: `"failed"` → `"rejected"`).
3. 사용자 보이는 라벨(`historyStatus*`) 매핑 테이블도 enum 6종을 모두 커버하도록 보강.

머니플로 RPC(`request_withdrawal`) 자체는 건드리지 않는다.

### 2-D. 출금 페이지 불필요 re-fetch 제거

`useWithdraw.ts` / `WithdrawModal.tsx` 변경 금지(money-flow). 대신:
- `WithdrawHistory.tsx` 의 마운트 시 select 가 매번 두 번 발생하는지 확인(`useEffect` deps), 단일화.
- realtime 구독은 `@pkg/realtime` 래퍼 그대로 사용 (raw channel 금지).

## 작업 3. 네이밍 규칙 문서화

`docs/conventions/naming.md` 신규 1쪽:
- 컴포넌트 PascalCase, 훅 use+camelCase, 상수 UPPER_SNAKE, 라우트 kebab-case, 에러 코드 UPPER_SNAKE
- Warm King 메시지 톤 예시 3개

기존 코드는 리네이밍하지 않는다(diff 최소화). 신규 코드부터 적용.

## 절대 불변(diff = 0 검증)

- `src/packages/wallet/hooks/useDeposit.ts`
- `src/packages/wallet/hooks/useDepositRealtime.ts`
- `src/packages/wallet/hooks/useDepositCountdown.ts`
- `src/packages/wallet/hooks/useWithdraw.ts`
- `src/lib/paper-trading/bybit-feed.ts`
- `src/components/crash/hooks/useCrashRound.ts`
- `src/components/trading/MegaOrderPanel.tsx`
- `src/hooks/use-kill-switches.ts`
- `src/hooks/use-auto-bet.ts`
- `vite.config.ts` (manualChunks / modulePreload)
- `size-limit.config.json`, `scripts/bundle-budget.mjs`
- `src/packages/realtime/*`, `src/packages/runtime/*`

## 검증 체크리스트

1. `npm run build:prerender` ✅
2. `node scripts/check-prerender-leak.mjs` ✅
3. `node scripts/check-money-flow-freeze.mjs` ✅ (8 paths intact)
4. `node scripts/check-operator-isolation.mjs` ✅
5. `npm run size:check` ✅ (예산 변화 없음)
6. console: `get_my_dashboard_state` 1분당 호출 수 측정 — 기존 대비 ≥70% 감소
7. console: `withdrawal_status` 관련 400 0건

## 변경 파일 요약

수정 (5):
- `scripts/prerender.mjs` — PUBLIC_ROUTES 8개
- `scripts/check-prerender-leak.mjs` — 키워드 15+
- `src/hooks/use-imperial-state.ts` — 모듈 캐시 + dedupe
- `src/hooks/use-achievement-watcher.ts` — dedupe
- `src/packages/wallet/components/WithdrawHistory.tsx` — enum 정합성/라벨

신규 (1):
- `docs/conventions/naming.md`

신규 마이그레이션: **없음**. 엣지 함수 변경: **없음**.
