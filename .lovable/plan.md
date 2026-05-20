# P0-8 — Session / Auth Stabilization (FINAL · 압살 모드)

P0의 마지막 단계. 인증/세션 흐름의 race / multi-tab / 401 / refresh storm을
client-only 레이어로 철벽 안정화한다. **money-flow 8경로 git diff = 0**.

## 변경 파일

### 신규 (7)
- `src/lib/auth/authBroadcast.ts` — `BroadcastChannel('phonara:auth')` 래퍼.
  publish/subscribe, `TAB_ID`, self-echo 차단, SSR/미지원 환경 no-op.
- `src/lib/auth/sessionHealth.ts` — refresh ring buffer(20) + 401 recover OK/Fail
  카운터 + 8s TTL peer 추적 + 3s heartbeat.
- `src/lib/auth/recover401.ts` — `recoverFrom401(fn)`:
  401/bad_jwt 감지 → `safeRefreshSession()` 1회 → 재실행 → 재실패 시
  `supabase.auth.signOut({ scope: 'local' })` + `publishAuthEvent('SIGNED_OUT')`.
  `scope: 'local'` 이라 서버 세션은 유지 → 의도치 않은 타탭 SIGNED_OUT 폭발 방지.
- `src/hooks/auth/useMultiTabAuthSync.ts` — App 루트(=useAuthBridge) 1회 마운트.
  Supabase onAuthStateChange → broadcast, 수신 시 `invalidateSessionCache()` +
  SIGNED_OUT 시 local store user=null. 강제 reload 없음.
- `src/components/admin/ops/SessionHealthCard.tsx` — KPI 4종 + Last event +
  Active peers + Refresh history table. 15s 자동 갱신.
- `src/pages/admin/ops/SessionHealth.tsx` — 새 admin 페이지.
- `docs/operations/auth-flow.md` — P0-3 ~ P0-8 전체 다이어그램 + multi-tab
  시나리오 + 401 recover 사용법.

### 편집 (3)
- `src/lib/auth/refreshMutex.ts` — `safeRefreshSession()` 성공/실패를
  `sessionHealth.recordRefresh()` 에 기록. 로직/시그니처 무변경.
- `src/hooks/use-auth-bridge.ts` — `useMultiTabAuthSync()` 호출 1줄 추가.
- `src/pages/admin/_AdminRoutes.tsx` — `ops/session-health` 라우트 등록
  (lazy + Suspense, operator chunk).

## 주요 안정화 포인트

1. **Refresh single-flight + 계측**: P0-3 single-flight 그대로 + sessionHealth
   ring buffer 로 admin 가시화.
2. **Multi-tab broadcast**: 단일 `BroadcastChannel('phonara:auth')`,
   `{type, ts, tabId}` payload, self-echo 차단, heartbeat 겸용으로 peer 추적.
3. **401 silent recover**: 1회 silent refresh → 재실행 → graceful local signOut.
   다른 탭 폭발 방지 위해 `scope: 'local'` 사용.
4. **Multi-tab SIGNED_OUT 자연 전파**: 강제 reload 금지. local store user=null +
   cache invalidate 만 하고 Supabase SDK 의 자체 SIGNED_OUT 발사에 맡김.
5. **Admin 관측성**: `/admin/ops/session-health` 에서 peer 수 / refresh 성공율 /
   401 복구 카운터 / last event 실시간 확인.

## 가드레일

- money-flow 8경로 RPC 본문 git diff = **0** (인증 레이어는 무관).
- 모든 신규 코드는 `src/lib/auth/*` / `src/hooks/auth/*` /
  `src/components/admin/ops/*` / `src/pages/admin/ops/*` 안에만.
- Admin 페이지는 기존 operator chunk 격리(PR-K) 에 자동 포함 — Layer 1 영향 0.
- 신규 user-facing 코드 (broadcast + sessionHealth + recover401 + 훅) 합산
  gz < 1KB 목표.
- `recoverFrom401` 은 P0-8 에서 인프라만 제공. 실제 RPC 호출부 적용은 **P1** 에서.

## P0 완료 선언 & P1 전환 계획

P0-1 ~ P0-8 모두 완료 → **출시 Blocker 0**.

**P1 (안정성 강화 + 운영 자동화)**
1. `recoverFrom401` 핫스팟 RPC 호출부 적용 (deposit/withdraw/intent 최우선).
2. sessionHealth 메트릭을 `anomaly_events` 에 24h 윈도우로 적재 (failure spike 감지).
3. Imperial Duel Phase 5 (Mass Rollout) 사전 점검.
4. Operator chunk 사이즈 모니터링 자동화 (size-limit threshold tune).
