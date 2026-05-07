REVOKE EXECUTE ON FUNCTION public.distribute_profit_share(bigint, timestamptz, timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.settle_package_daily() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public._cron_settle_package_daily() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reset_daily_mission_count() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.claim_daily_attendance(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_daily_attendance(uuid) TO authenticated;