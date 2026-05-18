# Sprint 4 Hybrid Closing — Report + Lightweight Telemetry

두 트랙 병행. 머니플로/Operator/imperial_* RPC/매치메이킹은 0 bytes 유지.

## Track A — Sprint 4 Closing Report (즉시 제출)

`docs/sprint/sprint-4-closing.md` 신규 작성. 디스크 실측 근거만 포함.

포함 항목:
- 4 PR 요약 (Header / GateCard / SovereignCard / FomoDockPill) + 적용 파일 경로 + 핵심 diff 마커 (`duel-card-glass`, `imperial-aurora`, `duel-pulse-ring`, `triggerHaptic`, `dynamicIsland.show`, `useSwipeGesture`)
- Verification Gate 6/6 결과표 (framer-motion 카운트, transform-only, reduced-motion, low-end, 머니플로 diff=0, CSS 토큰 재사용)
- 시각 통일감 매트릭스 (4 컴포넌트 × glass/aurora/haptic/dynamic-island)
- 불변 가드 git diff 0 증거 (money-flow 8 경로, imperial_* RPC, 매치메이킹 hooks, operator 청크)
- 한계 명시: 백그라운드 24h 대기 불가 → Track B 텔레메트리로 보완

## Track B — Lightweight Telemetry (자연 수집)

### B-1. 테이블 `client_metrics` (admin-read RLS)

```text
client_metrics
  id uuid pk
  user_id uuid null (auth.uid() 또는 null=익명)
  route text          -- '/duel' 등
  metric text         -- 'inp'|'lcp'|'cls'|'fps_sample'|'haptic_ok'|'swipe_ok'|'swipe_fail'
  value double precision
  meta jsonb          -- {device_tier, reduced_motion, hw_concurrency, ua_class}
  created_at timestamptz default now()
  -- index: (metric, created_at desc), (route, created_at desc)
```

- RLS: INSERT = `auth.uid() IS NOT NULL OR user_id IS NULL` (익명 허용), SELECT = admin only
- 30d 자동 정리 cron (`delete where created_at < now()-'30 days'`, 매일 03:10 KST)
- kill switch: `platform_kill_switches.key='client_metrics'` (OFF 시 클라가 INSERT 스킵)

### B-2. 클라 수집기 `src/packages/telemetry/clientMetrics.ts`

- 이미 있는 `@pkg/telemetry` 위에 얇은 어댑터만 추가 (중복 채널/큐 금지)
- web-vitals 동적 import → `onINP/onLCP/onCLS` 콜백을 5초 배치로 묶어 1회 INSERT
- FPS 샘플러: `requestAnimationFrame` 30초마다 5초 측정 → 평균 1건 INSERT, `/duel` 경로일 때만
- Haptic/Swipe 성공률: 기존 `triggerHaptic` / `useSwipeGesture` 호출 직후 try/catch 결과만 카운트 (래퍼 wrapping, 기존 시그니처 0 변경)
- Graceful: kill switch OFF, `navigator.connection?.saveData`, `prefers-reduced-motion`, `hw_concurrency<=2` → 자동 비활성
- 최대 1 INSERT / 10s / user (in-memory throttle)

마운트 위치: `App.tsx` 루트에 `<ClientMetricsBinder />` 1회. duel lobby 페이지 코드는 무변경 (래퍼만 적용).

### B-3. `/admin/ops` Sprint 4 패널 `<Sprint4Dashboard />`

- 신규 admin-only RPC `admin_get_sprint4_metrics(window_hours int)` → INP/LCP/CLS p50·p75·p95 + FPS 평균/최저 + haptic·swipe 성공률 + 디바이스 티어별 분포
- 15s 자동 갱신, 24h/48h 토글
- AAL2 게이트 (기존 AdminAal2Gate 재사용)
- `/admin/ops` 사이드 네비에 "Sprint 4" 탭 추가

## 불변 가드 (재확인)

- 머니플로 8 경로 / `imperial_*` RPC 본문 / 매치메이킹 hooks: **0 bytes**
- Operator isolation: 새 admin 코드는 `src/pages/admin/**` 하위 → operator 청크 자동 격리
- `supabase.channel(...)` 직접 호출 금지: telemetry 는 INSERT only, realtime 미사용
- framer-motion 신규 import: 0
- 새 keyframe 0개 (기존 CSS 토큰만)

## Verification Gate (구현 후)

1. `rg "imperial_place_phon_bet\|_settle\|_apply_house_edge_split" --files-with-matches` 본문 git diff=0
2. `rg "from \"framer-motion\"" src/packages/duel/components/lobby` = 0
3. 마이그레이션 적용 후 RLS linter PASS
4. ESLint no-raw-channel / no-direct-sonner PASS
5. Admin RPC 권한 baseline drift=0 (`check_permission_drift()`)
6. Sprint 4 패널이 빈 데이터로도 렌더 (EmptyState 토큰 사용)

## 48h 후 Track C (별도 작업)

- 팀장이 "보고서 요청" 한마디 → 그 시점에 `admin_get_sprint4_metrics(48)` 결과로 실측 리포트 작성
- 본 plan 범위 밖
