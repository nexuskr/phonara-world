-- 1) jackpot_pool: column-level lockdown of last_winner / last_winner_nickname.
-- RLS policy stays permissive for the safe columns (amount, updated_at) used by the public banner.
REVOKE SELECT (last_winner, last_winner_nickname) ON public.jackpot_pool FROM anon, authenticated;
-- Admin readers go through has_role()-gated RPCs / service_role, which bypass column ACLs.

-- 2) Remove admin-only tables from the Realtime publication so postgres_changes are not
-- broadcast to non-admin subscribers. Admin UIs already fall back to direct queries.
ALTER PUBLICATION supabase_realtime DROP TABLE public.anomaly_events;
ALTER PUBLICATION supabase_realtime DROP TABLE public.permission_change_log;
ALTER PUBLICATION supabase_realtime DROP TABLE public.conversion_events;
-- account_freezes stays published: its RLS allows each user to see their own row,
-- so Realtime RLS filtering is sufficient and FreezeBanner needs it.