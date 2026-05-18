# Sprint 4 Hybrid Closing + Edge Function Telemetry

머니플로 8경로 / `imperial_*` RPC 본문 / 매치메이킹 / Operator isolation = **0 bytes**.

## Track A — Sprint 4 Closing Report (즉시)

`docs/sprint/sprint-4-closing.md` 신규.
- 4 PR (Header / GateCard / SovereignCard / FomoDockPill) 적용 파일 경로 + 핵심 마커 (`duel-card-glass`, `imperial-aurora`, `duel-pulse-ring`, `triggerHaptic`, `dynamicIsland.show`, `useSwipeGesture`)
- Verification Gate 6/6 (framer-motion 카운트, transform-only, reduced-motion, low-end, 머니플로 diff=0, CSS 토큰 재사용)
- 시각 통일감 매트릭스 (4 컴포넌트 × glass/aurora/haptic/dynamic-island)
- 불변 가드 git diff=0 증거
- 한계: 24h 백그라운드 대기 불가 → Track B/C 텔레메트리로 보완

## Track B — Telemetry Schema

마이그레이션 1회.

```text
client_metrics
  id uuid pk, user_id uuid null, route text, metric text,
  value double precision, meta jsonb, created_at timestamptz default now()
  -- idx (metric, created_at desc), (route, created_at desc)
  -- RLS: INSERT denied to anon/auth (오직 edge function service_role)
  --     SELECT admin only

client_metrics_error_log
  id uuid pk, payload jsonb, error text, created_at timestamptz default now()
  -- RLS: admin only

-- 30d cleanup cron (03:10 KST)
-- kill switch: platform_kill_switches.key='client_metrics'
```

클라이언트는 DB에 직접 INSERT 불가 — 모든 적재는 edge function 경유.

## Track C — Edge Functions

### C-1. `imperial-metrics-batch` (POST)

- `verify_jwt = true` (Lovable Cloud 기본). `getClaims()` 로 user_id 확보, 익명 허용 시 `Authorization` 없으면 user_id=null + 별도 익명 rate bucket.
- Zod 입력 검증:
  ```
  { events: Array<{ route, metric, value, meta? }>, max 50 }
  metric ∈ enum: inp|lcp|cls|fps_sample|haptic_ok|haptic_fail|swipe_ok|swipe_fail
  ```
- Rate limit: in-memory Map per user_id, **1 호출 / 8s** (배치라 1회=최대 50 이벤트로 충분). 초과 시 429 + Retry-After.
- Dedup key: `${user_id}:${route}:${metric}:${floor(value/threshold)}:${minute_bucket}` Set 5분 TTL → 동일 이벤트 무시.
- meta 자동 보강: 서버에서 `req.headers` 기반 `ua_class`(mobile/desktop), 클라가 보낸 `device_tier`/`reduced_motion`/`hw_concurrency` 머지.
- service_role 클라이언트로 `client_metrics` bulk INSERT. 실패 시 `client_metrics_error_log` 에 payload+에러 적재.
- CORS 전체 허용 + 모든 응답에 corsHeaders.

### C-2. `imperial-lobby-analytics` (GET)

- `verify_jwt = true` + `has_role(uid,'admin')` 체크, 아니면 403.
- Query: `?window_hours=24` (기본 24, 허용 1..168).
- 새 admin RPC `admin_get_lobby_analytics(window_hours int)` 만들어서 호출:
  - INP/LCP/CLS p50·p75·p95 (route='/duel')
  - FPS avg/min/p10
  - haptic_ok / (haptic_ok+haptic_fail) → 성공률
  - swipe_ok / (swipe_ok+swipe_fail) → 성공률
  - device_tier 분포 (low/mid/high)
- 5초 메모리 캐시 (15s polling 부담 완화).

> 두 edge function 모두 머니플로/imperial_* 미참조. 신규 테이블만 read/write.

## Track D — Client wiring

`src/packages/telemetry/clientMetrics.ts` (신규, 얇은 어댑터):
- web-vitals 동적 import → `onINP/onLCP/onCLS` 콜백을 5초 윈도우로 모음.
- FPS 샘플러: `/duel` 마운트 시 30s 마다 5s 측정 1건.
- Haptic / Swipe wrapper: 기존 `triggerHaptic` / `useSwipeGesture` 호출 결과 try/catch 카운트.
- Flush: `navigator.sendBeacon` 또는 `supabase.functions.invoke('imperial-metrics-batch', { body: { events } })` — DB 직접 INSERT 금지.
- Graceful off: kill switch `client_metrics` OFF, `saveData`, `prefers-reduced-motion`, `hw_concurrency<=2`.
- 마운트: `App.tsx` 루트 `<ClientMetricsBinder />` 1회. duel 페이지 코드 무변경.

## Track E — Admin Dashboard

`src/pages/admin/ops/Sprint4Dashboard.tsx` (operator 청크 자동 격리):
- `supabase.functions.invoke('imperial-lobby-analytics', { query })` 15s polling, 24h/48h 토글.
- AAL2 게이트 (`AdminAal2Gate` 재사용).
- `/admin/ops` 사이드 네비에 "Sprint 4" 탭 추가.
- EmptyState/LoadingList 토큰 사용.

## 불변 가드

- 머니플로 8경로, `imperial_place_phon_bet/_settle/_apply_house_edge_split`: 본문 0 bytes
- `supabase.channel(...)` 직접 호출 0 (telemetry는 invoke only)
- framer-motion 신규 import 0
- 새 keyframe 0 (기존 CSS 토큰만)
- operator user→admin import 차단 유지

## Verification Gate (구현 후)

1. `git diff` 머니플로 파일 = 0
2. `rg "client_metrics" src/packages/duel` = 0 (duel 코드는 DB 미인식)
3. RLS linter PASS — `client_metrics` INSERT는 service_role 외 거부 확인
4. Edge function curl 테스트: 정상 / 429 / 401 / dedup 시나리오 PASS
5. `admin_get_lobby_analytics` 권한 baseline drift=0
6. Sprint 4 Dashboard 빈 데이터 렌더 (EmptyState)

## Track F — 48h 후 (별도 작업)

팀장 한마디 → `admin-get-lobby-analytics?window_hours=48` 결과 첨부한 실측 리포트 작성. 본 plan 범위 밖.
