
-- Pin search_path on helpers
ALTER FUNCTION public.tier_daily_cap(public.user_tier) SET search_path = public;
ALTER FUNCTION public.tier_boost(public.user_tier) SET search_path = public;
ALTER FUNCTION public.tier_withdraw_min(public.user_tier) SET search_path = public;
ALTER FUNCTION public.tier_process_minutes(public.user_tier) SET search_path = public;

-- Revoke from anon, grant only to authenticated
REVOKE EXECUTE ON FUNCTION public.settle_mission(TEXT,BOOLEAN,BIGINT) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.settle_mission(TEXT,BOOLEAN,BIGINT) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.request_withdrawal(BIGINT,public.withdrawal_method,TEXT,TEXT,TEXT,TEXT,TEXT) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.request_withdrawal(BIGINT,public.withdrawal_method,TEXT,TEXT,TEXT,TEXT,TEXT) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_resolve_withdrawal(UUID,TEXT,TEXT) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.admin_resolve_withdrawal(UUID,TEXT,TEXT) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.distribute_profit_share(BIGINT,TIMESTAMPTZ,TIMESTAMPTZ) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.distribute_profit_share(BIGINT,TIMESTAMPTZ,TIMESTAMPTZ) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated;

-- Ensure pgcrypto for digest()
CREATE EXTENSION IF NOT EXISTS pgcrypto;
