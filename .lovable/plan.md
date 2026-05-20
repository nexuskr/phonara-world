# PR-P0-5 — Realtime / Cache Stabilization

머니플로 8경로 git diff = 0. realtime/cache 레이어만 강화. UI 변화 0.

## 현황 진단

- `useRealtimeChannel` (단일 진입점) — dedup·StrictMode-safe·exp 백오프 재연결·focus/online resume·auth resume·폴링 폴백까지 이미 구현. 다만:
  - **rapid mount/unmount race**: 라우트 바운스 시 `teardown → ensureChannel` 즉시 호출 → Supabase가 동일 키 채널 폐기 전 새 .on() 시도 시 "subscribe twice" 가능.
  - **hidden-tab subscription leak**: 백그라운드 30분 이상 방치되어도 채널 유지 → 불필요 fan-out.
  - **region failover**: PR-N regions.ts 는 휴리스틱 선택만, 채널 반복 실패 시 다른 region 으로 자동 fallback 없음.
- `@pkg/core/swr.ts` — INFLIGHT dedup + LS + stale-while-revalidate 이미 있음. 다만:
  - **focusThrottle 없음**: 탭 복귀할 때마다 fetcher 가능 → stampede.
  - **stale → fresh jump**: 800ms 폴 후 setState 한 번 → flicker.
  - **optimistic mutate** 미지원.
- 관리자 모니터링: `PollingStatusCard` 있음. realtime 측 가시화 없음.

## 변경 계획

### 1. `src/hooks/use-realtime-channel.ts` — race & visibility 가드
- `teardown(key, reason)` 에 **50ms grace timer**: 50ms 안에 새 consumer 가 동일 key 로 attach 하면 채널 유지(StrictMode + 라우트 전환 안정).
- **idle visibility unsubscribe**: `document.hidden === true` 가 **5분** 지속되면 채널을 `pendingRemove` 마킹하고 supabase 채널 해제 (listener 는 메모리 유지). 가시 복귀 시 자동 재구독.
- **연속 실패 카운터 → region rotate hook**: 5회 연속 errored 시 `onRegionFailover?.(currentRegion)` 콜백 fire (선택), 그리고 `regions.failoverNext()` 호출.

### 2. `src/packages/realtime/regions.ts` — silent failover
- `failoverNext(): RealtimeRegion` 추가 — `ap → us → eu → ap` 라운드로빈, `setRegion()` 호출 후 신규 채널부터 새 region prefix 적용. 기존 채널은 자연 정리.
- `getFailoverState(): { region, attempts, lastFailoverAt }` admin 가시화용.
- DEV 콘솔에 `[REALTIME] region failover ap→us` 로그.

### 3. `src/packages/realtime/index.ts` — wrappers 에 failover 자동 연결
- `withHeartbeat` 옆에 `withFailover` 데코레이터 추가: onStatus 가 `down` 5연속 시 `failoverNext()` 호출. 멱등.

### 4. `src/packages/core/swr.ts` — stampede & jump 방지
- `focusThrottle?: number` (default 30s): visibilitychange visible 이벤트 시 마지막 fetch 후 throttle 이하이면 skip.
- `keepPrevious: boolean` (default true): fresh 전환 시 setState 콜백을 **previous data 보존 + fade 토큰** 형태로 보고. UI jump 0.
- `mutate(key, updater | value, opts?)`: optimistic update — MEM 즉시 갱신 + LS 동기화 + 옵션 `revalidate=true` 시 백그라운드 refresh.
- `useSwr` 의 stale→fresh 폴(800ms) 제거 → INFLIGHT promise 직접 then 으로 한 번에 setState (flicker 차단).

### 5. `src/components/admin/RealtimeStatusCard.tsx` (신규)
- 활성 채널 수, region, 재구독 카운트(누적 errored→retry), 마지막 failover 시각. 15s 갱신.
- `/admin/ops/region-health` 페이지의 `PollingStatusCard` 옆에 마운트(기존 위치 패턴 따름).

### 6. 문서
- `docs/operations/realtime-cache.md` 신규: race 가드/visibility/region failover/SWR 정책 한 페이지.

## 머니플로 가드

- 변경 파일 grep: `request_withdrawal`, `apex_request_cashout`, `imperial_place_phon_bet`, `apex_place_bet_v2`, `_apply_house_edge_split`, `_settle`, `stake_phon`, `phon_swap_*` 호출/본문 0건 수정.
- realtime/SWR 레이어만 수정. PRJ_FREEZE_RAW_CHANNEL 화이트리스트 무변경.

## 예상 효과

- 라우트 바운스 재구독 폭주: 50ms grace 로 사실상 0.
- 백그라운드 탭 5분+ 채널 fan-out: 0 (resume 시 즉시 재구독).
- SWR stampede: focusThrottle 30s + INFLIGHT 로 동일 키 동시 fetch 최대 1.
- stale→fresh UI jump: keepPrevious + 단일 setState 로 깜빡임 제거.
- 채널 5연속 실패 → 자동 region rotate (사용자 무중단).

## 영향 범위

- 신규: 2 파일 (`RealtimeStatusCard.tsx`, `realtime-cache.md`).
- 수정: 4 파일 (`use-realtime-channel.ts`, `realtime/regions.ts`, `realtime/index.ts`, `core/swr.ts`).
- 미수정: money-flow RPC, useWalletChannel public API, swrFetch 시그니처(옵션 추가만).
- Layer 1 gz 영향: < 1KB.
