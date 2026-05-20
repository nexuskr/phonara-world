# P0-8 — Session / Auth Stabilization

P0 마지막 단계. 인증/세션 흐름의 race, multi-tab 불일치, 401 처리, refresh 폭주를 철벽화한다. money-flow 8경로는 무관 — RPC/SQL diff 0.

## 변경 파일 (신규/수정)

**신규**
- `src/lib/auth/authBroadcast.ts` — `BroadcastChannel('phonara:auth')` 래퍼 (SSR/미지원 환경 no-op). `publish(event, payload)` / `subscribe(handler)` / `setLastEvent` 디버그 스냅샷.
- `src/lib/auth/sessionHealth.ts` — refresh history(ring buffer 20), 401 recover count, multi-tab peer 카운트, last event ts 를 메모리+`sessionStorage` 백업으로 노출. admin 패널에서 읽기.
- `src/lib/auth/recover401.ts` — `recoverFrom401(retry: () => Promise<T>)`: 1회 silent `safeRefreshSession()` 재시도 후 재실행, 실패 시 graceful `supabase.auth.signOut({ scope: 'local' })` + broadcast.
- `src/hooks/auth/useMultiTabAuthSync.ts` — App 루트 마운트 1회. SIGNED_IN/SIGNED_OUT/TOKEN_REFRESHED 수신 시 다른 탭에 broadcast, 다른 탭에서 SIGNED_OUT 수신 시 로컬 store flush + soft reload(현재 라우트 유지).
- `src/components/admin/ops/SessionHealthCard.tsx` — `/admin/ops/session-health` 패널. multi-tab peers, 최근 refresh, 401 recover 횟수, last event 표시. 15s 자동 갱신.
- `src/pages/admin/ops/SessionHealth.tsx` — 신규 페이지. AAL2 게이트 재사용. App 라우터에 등록.
- `docs/operations/auth-flow.md` — P0-3~P0-8 전체 시나리오, multi-tab sync, 401 recover, refresh single-flight 다이어그램 갱신.

**수정**
- `src/lib/auth/refreshMutex.ts` — 성공/실패를 `sessionHealth.recordRefresh()` 에 기록. 동작 시그니처는 그대로.
- `src/hooks/use-auth-bridge.ts` — `useMultiTabAuthSync()` 호출, mounted guard는 유지 + pending deep link flush (`window.dispatchEvent(new CustomEvent('phonara:auth-ready'))`) `ImperialDeepLinkListener` 와 연동. `SIGNED_OUT` 수신 시 broadcast.
- `src/App.tsx` — `/admin/ops/session-health` 라우트 추가 (`AdminAal2Gate` 안쪽).

## 핵심 안정화 포인트

1. **Refresh single-flight**: 이미 P0-3에서 `safeRefreshSession` 으로 in-flight 공유 + 4회 backoff. P0-8에서 sessionHealth 계측만 추가 — 시그니처/로직 무변경.
2. **Multi-tab sync**: `BroadcastChannel('phonara:auth')` 단일 채널, payload `{type, ts, tabId}`. 한 탭의 SIGNED_OUT 이 즉시 다른 탭에 전파되어 stale UI를 막는다. SIGNED_IN/TOKEN_REFRESHED 는 cache invalidate 만 트리거.
3. **401 자동 복구**: `recoverFrom401(fn)` — 1회 silent refresh 후 재실행, 실패 시 로컬 세션만 정리(서버 signOut 호출 X → 다른 탭 영향 최소). 호출부는 P0-8 범위 밖(개별 RPC에 적용은 P1).
4. **useAuthBridge 강화**: mounted guard 유지 + multi-tab sync 마운트 + deep-link ready 이벤트 발사로 `ImperialDeepLinkListener` 의 pending intent flush 보장.
5. **Admin observability**: `/admin/ops/session-health` — multi-tab peer 수, 최근 refresh 20건, 401 recover 카운트, broadcast last event.

## 가드레일

- money-flow 8경로 RPC 본문 git diff = 0 (인증 레이어 전부 client-side).
- 모든 신규 코드는 `src/lib/auth/*` / `src/hooks/auth/*` / `src/components/admin/ops/*` / `src/pages/admin/ops/*` 에만.
- Layer 1 gz 영향 < 1KB (admin 패널은 operator chunk).
- UI 변화: 없음 (admin 패널 신규 1개만).
- `supabase.auth.signOut({ scope: 'local' })` 사용 — 서버 broadcast 회피.

## 다음 단계 (P1)

P0 종료 → P1 전환:
- 개별 RPC 호출부에 `recoverFrom401` 적용 (운영 핫스팟 우선).
- session health 메트릭을 anomaly_events 로 적재.
- Imperial Duel Phase 5 (Mode B → Mode A 점진 전환) 검토.
