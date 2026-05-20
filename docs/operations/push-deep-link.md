# Push / Deep-link Stabilization (PR-P0-6)

## VAPID rotation guard
- Source: `src/lib/push/pushVapidGuard.ts`
- localStorage key: `phonara:push:vapid_fp` (8-byte SHA-256 prefix of the current key).
- On `usePushSubscription` mount, `ensureVapidConsistent(VAPID_PUBLIC_KEY)` runs silently. If the fingerprint differs, the old `PushSubscription` is `.unsubscribe()`d and the matching row in `push_subscriptions` is deleted. Next `enable()` mints a fresh subscription against the new key. No UI toast.

## Daily cap mirror
- Source: `src/lib/push/pushRateLimit.ts`
- Server `push_send_log` enforces 3/day. Client mirrors received-count under `phonara:push:daily:YYYY-MM-DD` and exposes `isPushCapped()` for friendly UX ("오늘 알림은 여기까지예요").
- SW broadcasts `{type:"push-received"}` on every `push` event; the hook listens and increments.
- `pruneOldPushCounters()` GCs stale daily keys on mount.

## Deep-link routing
- Listener: `src/components/nav/ImperialDeepLinkListener.tsx` (mounted in `App.tsx`).
- Supported prefixes: `/dashboard`, `/wallet`, `/packages`, `/vip`, `/apex`, `/duel`, `/cup`, `/empire`, `/trust`, `/legal`, `/phon`, `/arena`, `/games`, `/lobby`.
- Three input channels:
  1. SW `postMessage({type:"deep-link", url})` — preferred (in-app router, no full reload).
  2. URL query `?from=push` — fallback when SW had to `openWindow`.
  3. localStorage `phonara:push:pending_deep_link` — flushed on `SIGNED_IN` and on `visibilitychange → visible`.
- Click-race guard: identical path within 500 ms is ignored.

## Unauthenticated deep-link
- If `supabase.auth.getSession()` returns no session, the target path is stored in `phonara:push:pending_deep_link` and the user is sent to `/auth?returnTo=<path>`.
- `onAuthStateChange('SIGNED_IN')` flushes the pending path on the next tick.

## Service Worker hardening (`public/sw-push.js`)
- `tag` defaults to `data.id || data.kind || "phonara"` so duplicate sends collapse to a single notification.
- `notificationclick` runs under a Promise mutex (`self.__nc_lock`) and a 1 s dedupe map keyed by `data.id || data.kind || url`.
- Tries client `postMessage` first (in-app deep link), then `client.navigate`, then `openWindow` with `?from=push` appended.

## Money-flow guarantee
None of the above touches the 8 money-flow RPC bodies. Only client-side hooks, libs, the SW, and the listener are modified.
