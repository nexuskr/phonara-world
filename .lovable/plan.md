# P0-3 — 인증/세션 안정화 (지구상 최고사양)

## 목표

출시를 막는 인증 불안 요소를 철벽으로 제거.

- 무한 리다이렉트 0
- `getUser()` /user 403 폭주 제거 (single-flight + cache)
- `refreshSession` race condition 제거 (mutex)
- 세션 만료 시 강제 로그아웃 대신 자동 재연결 → 실패 시만 재로그인 유도
- 모든 인증 로직 단일 진입점화

## 발견된 문제 (auth 로그 기반)

1. `403: invalid claim: missing sub claim` (`bad_jwt`) — `useAuthReady` + `useAuthBridge` + `useRequireAuth` 가 각자 독립적으로 `hasVerifiedSession()` 호출 → `auth.getUser()` /user 가 페이지 1회 진입에 3~5회 발사
2. `useAuthBridge` 에 refresh 실패 시 재시도/backoff 없음. token refresh race 시 동시 다중 호출 가능
3. `Auth.tsx` 가 무조건 `/secure-auth` 로 Navigate → 이미 인증된 사용자도 거기로 가서 다시 dashboard 로 튐 (잠재 redirect loop)
4. `useRequireAuth` 는 `db.user` (localStorage) 만 보고 ready 판단 — broken local session + 서버 unverified 케이스 race
5. `AuthErrorBoundary` 부재 — auth-bridge 내부 예외가 React tree 까지 buble

## 변경 사항

### 1) `src/lib/auth/authSingleFlight.ts` (신규)
- `verifySessionOnce()` 모듈 싱글톤. 동시 호출은 단일 in-flight Promise 공유.
- 결과는 5s TTL 캐시 + `onAuthStateChange` 발생 시 무효화.
- 내부적으로 `auth.getSession()` → `auth.getUser()` 1회만.

### 2) `src/lib/auth/refreshMutex.ts` (신규)
- `safeRefreshSession()` mutex. 동시 호출은 같은 Promise 반환.
- 실패 시 exp backoff (500ms → 1s → 2s → 4s, cap 4회). 최종 실패면 `bad_jwt` 분기 → `clearBrokenLocalSession()`.

### 3) `src/lib/auth-recovery.ts` (보강)
- `hasVerifiedSession()` 내부를 `verifySessionOnce()` 로 위임 (외부 시그니처 동일, 후방호환).

### 4) `src/hooks/use-auth-bridge.ts` (보강)
- 단일 `useRef` mounted 가드로 unmount race 차단.
- `TOKEN_REFRESHED` 핸들러에서 mutex 통과한 결과만 사용.
- `INITIAL_SESSION` 이벤트 우선 (Supabase v2 권장) — `getSession()` 별도 호출 제거 (중복 /user 차단).
- bad_jwt 감지 시: 토스트 1회 + `clearBrokenLocalSession()` + SIGNED_OUT 이벤트 자연 발생 대기 (redirect 강제 X).

### 5) `src/hooks/use-auth-ready.ts` (보강)
- `verifySessionOnce()` 위임. /user 폭주 해결.

### 6) `src/hooks/use-require-auth.ts` (보강)
- redirect loop guard: 이미 `/secure-auth` 경로면 nav 호출 skip.
- `returnTo` 쿼리 파라미터로 원래 경로 보존.

### 7) `src/pages/Auth.tsx` (보강)
- 이미 verified session 있으면 `/dashboard` 로 리다이렉트 (loop 사전 차단).
- 미인증 시만 `/secure-auth` 로 Navigate.

### 8) `src/components/auth/AuthErrorBoundary.tsx` (신규)
- App 루트에 마운트.
- 자식 트리의 auth 관련 throw 를 잡아서 "자동 재연결 중..." UI → 3초 후 자동 복구 시도 → 실패 시 "다시 로그인" CTA.

### 9) `src/App.tsx` (한 줄 추가)
- 기존 ErrorBoundary 바깥에 `<AuthErrorBoundary>` 1회 마운트.

### 10) `docs/operations/auth-flow.md` (신규)
- 현재 인증 흐름 다이어그램(텍스트) + P0-3 변경점 + 디버깅 가이드.

## 가드레일

- money-flow 8경로 git diff = 0 (인증 레이어만 수정, RPC 트랜잭션 미터치)
- UI/UX 변화 = AuthErrorBoundary 의 fallback 1개만 (정상 흐름 0 변화)
- Layer 1 gz 영향 < 1KB (auth 헬퍼는 작음)
- `@pkg/auth/*` 별도 생성 대신 기존 `src/hooks/auth/` + `src/lib/auth/` 구조 유지 (마이그레이션 비용 최소화)

## 기술 상세

### single-flight 캐시 키
```ts
type CachedVerify = { ts: number; user: User | null };
const TTL_MS = 5_000;
let inflight: Promise<CachedVerify> | null = null;
```

### refresh mutex
```ts
let refreshInflight: Promise<Session | null> | null = null;
async function safeRefreshSession() {
  if (refreshInflight) return refreshInflight;
  refreshInflight = doRefreshWithBackoff().finally(() => { refreshInflight = null; });
  return refreshInflight;
}
```

### redirect loop guard
```ts
if (location.pathname === "/secure-auth" || location.pathname === "/auth") return;
nav(`/secure-auth?returnTo=${encodeURIComponent(location.pathname)}`);
```

## 예상 효과

| 지표 | Before | After |
|---|---|---|
| 페이지 1회 진입 시 `/user` 호출 | 3~5회 | 1회 |
| `bad_jwt` 발생 시 동작 | 503 후 무한 루프 | silent recover |
| refresh race 시 동시 호출 | N개 | 1개 (mutex) |
| 이미 로그인된 상태에서 /auth 진입 | dashboard로 튐 (loop 가능) | 즉시 dashboard navigate |

## 비범위 (P0-3 미포함)

- OAuth provider 추가 (현행 유지)
- MFA/AAL2 변경 (별도 PR)
- 백엔드 RL (P0-2 + 미래 인프라)
