# Phase 2 — Realtime Owner-Scoped Broadcast Design

**Status:** DESIGN — no migration executed.

## Problem

`notifications`, `support_messages`, `support_threads` are members of `supabase_realtime` publication. Row-level RLS prevents unauthorized SELECT, but Postgres logical-replication broadcasts every row change to **every subscriber** before RLS filtering happens. A malicious authenticated user subscribed to the table channel can therefore observe row-change *events* (table name, op, primary key) for other users even when payload columns are stripped.

## Goal

Replace table-level realtime fan-out with per-user topic broadcasts using `realtime.send()`. Each user only sees their own events.

## Design

### Server side (1 migration)

```sql
-- Remove tables from publication
ALTER PUBLICATION supabase_realtime DROP TABLE public.notifications;
ALTER PUBLICATION supabase_realtime DROP TABLE public.support_messages;
ALTER PUBLICATION supabase_realtime DROP TABLE public.support_threads;

-- Add broadcast triggers (one per table)
CREATE OR REPLACE FUNCTION public._broadcast_notification_to_owner()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM realtime.send(
    jsonb_build_object('op', TG_OP, 'row', to_jsonb(NEW)),
    'notification',
    'user:' || NEW.user_id::text,
    true  -- private topic
  );
  RETURN NEW;
END $$;

CREATE TRIGGER trg_broadcast_notification
  AFTER INSERT OR UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public._broadcast_notification_to_owner();
-- repeat for support_messages, support_threads
```

### Client side (3-5 component touches)

Replace:
```ts
useRealtimeChannel('notifications', { event: '*', table: 'notifications' }, handler)
```
with:
```ts
useRealtimeChannel(`user:${user.id}`, { event: 'notification', private: true }, handler)
```

Affected files (grep result, to confirm at PR-time):
- `src/hooks/useNotifications.ts`
- `src/components/notifications/NotificationBell.tsx`
- `src/pages/Support.tsx`
- `src/components/support/SupportThread.tsx`

## Security Impact

- **Before**: any authenticated user can subscribe to `realtime:public:notifications` and receive event metadata (op, PK) for every notification row across all users. Payload columns are RLS-filtered, but event volume + timing is a side channel.
- **After**: each user only receives events on `user:<own-uid>` topic. Other topics return 403 at WebSocket auth time.

## Rollback Plan

```sql
DROP TRIGGER trg_broadcast_notification ON public.notifications;
DROP TRIGGER trg_broadcast_support_message ON public.support_messages;
DROP TRIGGER trg_broadcast_support_thread ON public.support_threads;
DROP FUNCTION public._broadcast_notification_to_owner();
DROP FUNCTION public._broadcast_support_message_to_owner();
DROP FUNCTION public._broadcast_support_thread_to_owner();
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_threads;
```
Plus revert the 4-5 client component changes (`git revert <sha>`). Total rollback time: < 2 min.

## Why NOT to bundle with Phase 5

- Phase 2 touches client code (4-5 files); Phase 5 is DB-only. Independent failure modes.
- Phase 2 needs visual QA per channel; Phase 5 needs CI permission-drift verification.
- Bisecting is impossible if both ship together.

## Out of scope (kept as-is)

`withdrawal_requests`, `wallet_balances`, `phon_balances`, `transactions`, `live_positions` already have **owner-only RLS** AND their realtime fan-out powers user-visible features (LiveWithdrawalsTable, PowerHeader, etc.). Moving them to owner-scoped broadcast would require rewriting Trust v2 + PowerHeader. Defer to a follow-up PR.
