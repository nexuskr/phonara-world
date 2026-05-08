-- 1) Restore EXECUTE grants for admin-callable RPCs (internal has_role guards remain)
GRANT EXECUTE ON FUNCTION public.acknowledge_anomaly(uuid, text)              TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_adjust_balance(uuid, bigint, text)     TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_user_email(uuid)                   TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_release_freeze(uuid, text)             TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_resolve_deposit(uuid, text, text)      TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_resolve_package(uuid, text, text)      TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_resolve_withdrawal(uuid, text, text)   TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_tier(uuid, user_tier)              TO authenticated;
GRANT EXECUTE ON FUNCTION public.bulk_acknowledge_anomalies(uuid[], text)     TO authenticated;
GRANT EXECUTE ON FUNCTION public.detect_anomalies()                           TO authenticated;

-- 2) Reclassify detect_anomalies to admin_only (admin UI calls it directly)
UPDATE public.function_permissions_baseline
SET category = 'admin_only',
    allowed_roles = ARRAY['authenticated'],
    note = COALESCE(note, '') || ' [reclassified admin_only — UI 즉시 스캔]',
    updated_at = now()
WHERE function_name = 'detect_anomalies';

-- 3) Update baseline allowed_roles to reflect real operational state
UPDATE public.function_permissions_baseline
SET allowed_roles = ARRAY['authenticated'],
    updated_at = now()
WHERE function_name IN (
  'acknowledge_anomaly','admin_adjust_balance','admin_get_user_email','admin_release_freeze',
  'admin_resolve_deposit','admin_resolve_package','admin_resolve_withdrawal','admin_set_tier',
  'bulk_acknowledge_anomalies',
  'get_admin_metrics','get_error_stats','get_recent_errors','get_top_users','redetect_anomaly'
);

-- 4) run_uptime_canary: keep system_only category but acknowledge authenticated grant exists
--    (internal has_role guard protects it — equivalent to admin_only pattern)
UPDATE public.function_permissions_baseline
SET allowed_roles = ARRAY['authenticated'],
    note = COALESCE(note, '') || ' [authenticated EXECUTE w/ internal has_role guard]',
    updated_at = now()
WHERE function_name = 'run_uptime_canary';