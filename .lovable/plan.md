# PR-P0-6 — Push / Deep-link Stabilization

푸시 알림과 딥링크 흐름을 철벽화. money-flow 8경로 git diff = 0.

## 현황 진단

- `src/lib/push.ts` — `subscribePush / unsubscribePush / isPushActive` 만 있음. VAPID 키는 하드코딩, 변경 감지 가드 없음 → 키 회전 시 옛 endpoint 가 좀비로 남음.
- `src/hooks/push/` 디렉토리 자체가 없음 — `usePushSubscription` hook 신규 필요.
- `push_send_log` 서버 cap 은 있지만 클라이언트 측 예측 캡 없음 → 사용자에게 "왜 안 와요?" 혼동.
- `ImperialDeepLinkListener` 는 App.tsx 에서 해제 상태(주석 "v19 Phase 0-R: 마운트 해제"). 강화판 재마운트 필요.
- SW (`public/sw-push.js`) `notificationclick` — `tag` 만 dedup, 동일 알림 빠른 더블클릭 시 `focus → navigate` 2회 가능. 메시지 채널을 통한 in-app 라우팅도 없음(SW 가 직접 navigate).
- 미인증 deep-link 처리 없음 — auth 페이지로 가도 `returnTo` 없이 `/dashboard` 로 떨어짐 (P0-3 의 `useRequireAuth` returnTo 는 SPA 내부에서만 작동).

## 변경 계획

### 1. `src/lib/push/pushVapidGuard.ts` (신규)
- `getVapidFingerprint(key)` — VAPID 공개키의 SHA-256 8-byte prefix 를 localStorage `phonara:push:vapid_fp` 와 비교.
- `ensureVapidConsistent()` — fingerprint mismatch 시 기존 subscription 자동 `unsubscribe()` + DB `push_subscriptions` 제거 + 새 키로 silent 재구독. fingerprint 저장.
- `subscribePush()` 흐름의 첫 단계로 호출.

### 2. `src/lib/push/pushRateLimit.ts` (신규)
- localStorage `phonara:push:daily:{YYYY-MM-DD}` = received count.
- `recordPushReceived()` — SW → page postMessage 핸들러에서 카운트.
- `getDailyPushCap()` — 3/day. `isPushCapped()` boolean.
- 단순 hint UX 용 (서버 cap 이 진실의 원천 — UI 안내만).

### 3. `src/hooks/push/usePushSubscription.ts` (신규)
- 상태: `permission / isActive / loading / capped`.
- `enable() / disable()` 액션 → `subscribePush`/`unsubscribePush` 래핑 + VAPID guard 적용.
- mount 시 1회 `ensureVapidConsistent()` 자동 호출 (silent — UI 토스트 없음).

### 4. `src/components/nav/ImperialDeepLinkListener.tsx` (신규 / 강화 재마운트)
- 지원 경로: `/dashboard`, `/wallet`, `/packages`, `/vip`, `/apex/*`, `/duel`, `/cup`, `/empire/*`, `/trust`, `/legal/*`.
- `?from=push&intent=<kind>` 쿼리 파싱 → `phonara:imperial-focus` CustomEvent dispatch (기존 컨슈머와 호환).
- **미인증 가드**: `supabase.auth.getSession()` 이 null 이면 현재 URL 을 localStorage `phonara:push:pending_deep_link` 에 저장 + `navigate(/auth?returnTo=${encodeURIComponent(currentPath)})`.
- SIGNED_IN 이벤트 onAuthStateChange 구독 → pending deep link 있으면 즉시 navigate + 키 삭제.
- **background → foreground 처리**: `document.visibilitychange` visible 시 pending deep link 1회 flush.
- **클릭 race 방지**: 동일 deep-link URL 을 500ms 안에 두 번 받으면 무시 (in-memory `lastHandledAt + lastUrl` mutex).
- App.tsx 에 다시 마운트.

### 5. `public/sw-push.js` 강화
- `notificationclick` 에 in-flight Promise mutex (`self.__nc_lock`) — 동일 tag 동시 처리 1회만.
- `clients.matchAll` 에서 같은 origin client 있으면 `postMessage({type:"deep-link", url})` 후 focus — listener 가 router 로 처리. 클라이언트 없을 때만 `openWindow`.
- `tag` 기본을 알림 ID 단위로 부여 (`data.id || data.kind`) — 중복 알림 1개만 표시.

### 6. `docs/operations/push-deep-link.md` (신규)
VAPID 회전 / fingerprint 가드 / daily cap / deep-link 매트릭스 / 미인증 returnTo / 클릭 race 가드 한 페이지.

## 머니플로 가드

- 변경 파일 어디에도 `request_withdrawal / apex_request_cashout / imperial_place_phon_bet / apex_place_bet_v2 / _apply_house_edge_split / _settle / stake_phon / phon_swap_*` 호출/본문 0건. `src/hooks/push/*`, `src/lib/push/*`, `src/components/nav/*`, `public/sw-push.js` 만.

## 예상 효과

- VAPID 회전 시 좀비 endpoint 0 — 사용자 액션 없이 silent 재구독.
- "오늘 알림 더 안 와요?" 혼동 0 — `usePushSubscription.capped` 로 UI 안내.
- 미인증 deep-link → 로그인 후 원래 경로 100% 복귀.
- 동일 알림 더블탭 race / SW 동시 처리 race 0.
- background → foreground 전환 시 pending deep link 자동 처리.

## 영향 범위

- 신규: 4 파일 (`pushVapidGuard.ts`, `pushRateLimit.ts`, `usePushSubscription.ts`, `ImperialDeepLinkListener.tsx`, `docs/operations/push-deep-link.md`).
- 수정: 2 파일 (`src/lib/push.ts` VAPID guard hook-in, `public/sw-push.js` mutex+postMessage, `src/App.tsx` listener 재마운트).
- 미수정: money-flow RPC, 기존 컴포넌트 UI.
- Layer 1 gz 영향: < 1.5KB (Listener 는 가벼움, hooks 는 동적 사용 시점에만).
