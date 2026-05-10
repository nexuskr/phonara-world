
CREATE OR REPLACE FUNCTION public.admin_cockpit_metrics()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin boolean;
  total_users int := 0;
  signups_24h int := 0;
  signups_7d int := 0;
  dau int := 0;
  mau int := 0;
  gmv_total bigint := 0;
  gmv_30d bigint := 0;
  gmv_24h bigint := 0;
  paid_out_total bigint := 0;
  paid_out_30d bigint := 0;
  pending_wd_count int := 0;
  pending_wd_sum bigint := 0;
  completed_wd_24h int := 0;
  sla jsonb;
  unack_anomalies int := 0;
  freezes_active int := 0;
  insurance_balance bigint := 0;
  tier_dist jsonb := '{}'::jsonb;
  k_factor numeric := 0;
  referrals_30d int := 0;
  new_users_30d int := 0;
BEGIN
  SELECT has_role(auth.uid(), 'admin'::app_role) INTO is_admin;
  IF NOT COALESCE(is_admin, false) THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  SELECT COUNT(*) INTO total_users FROM public.profiles;
  SELECT COUNT(*) INTO signups_24h FROM public.profiles WHERE created_at > now() - interval '24 hours';
  SELECT COUNT(*) INTO signups_7d FROM public.profiles WHERE created_at > now() - interval '7 days';
  SELECT COUNT(*) INTO new_users_30d FROM public.profiles WHERE created_at > now() - interval '30 days';

  SELECT COUNT(DISTINCT user_id) INTO dau
  FROM public.transactions WHERE created_at > now() - interval '24 hours';
  SELECT COUNT(DISTINCT user_id) INTO mau
  FROM public.transactions WHERE created_at > now() - interval '30 days';

  SELECT COALESCE(SUM(amount),0) INTO gmv_total
  FROM public.package_purchases WHERE status IN ('approved','completed');
  SELECT COALESCE(SUM(amount),0) INTO gmv_30d
  FROM public.package_purchases WHERE status IN ('approved','completed') AND created_at > now() - interval '30 days';
  SELECT COALESCE(SUM(amount),0) INTO gmv_24h
  FROM public.package_purchases WHERE status IN ('approved','completed') AND created_at > now() - interval '24 hours';

  SELECT COALESCE(SUM(amount),0) INTO paid_out_total
  FROM public.withdrawal_requests WHERE status = 'completed';
  SELECT COALESCE(SUM(amount),0) INTO paid_out_30d
  FROM public.withdrawal_requests WHERE status = 'completed' AND completed_at > now() - interval '30 days';

  SELECT COUNT(*), COALESCE(SUM(amount),0) INTO pending_wd_count, pending_wd_sum
  FROM public.withdrawal_requests WHERE status = 'pending';

  SELECT COUNT(*) INTO completed_wd_24h
  FROM public.withdrawal_requests WHERE status='completed' AND completed_at > now() - interval '24 hours';

  BEGIN
    SELECT public.public_withdrawal_sla() INTO sla;
  EXCEPTION WHEN OTHERS THEN sla := '{}'::jsonb;
  END;

  SELECT COUNT(*) INTO unack_anomalies
  FROM public.anomaly_events WHERE acknowledged = false;

  BEGIN
    SELECT COUNT(*) INTO freezes_active
    FROM public.account_freezes WHERE expires_at > now();
  EXCEPTION WHEN OTHERS THEN freezes_active := 0;
  END;

  SELECT COALESCE(accumulated,0) INTO insurance_balance FROM public.insurance_fund WHERE id=1;

  SELECT COALESCE(jsonb_object_agg(tier, c), '{}'::jsonb) INTO tier_dist FROM (
    SELECT tier::text AS tier, COUNT(*)::int AS c FROM public.profiles GROUP BY tier
  ) t;

  BEGIN
    SELECT COUNT(*) INTO referrals_30d
    FROM public.referrals WHERE created_at > now() - interval '30 days';
  EXCEPTION WHEN OTHERS THEN referrals_30d := 0;
  END;
  IF new_users_30d > 0 THEN
    k_factor := round((referrals_30d::numeric / new_users_30d::numeric), 3);
  END IF;

  RETURN jsonb_build_object(
    'generated_at', now(),
    'users', jsonb_build_object(
      'total', total_users,
      'signups_24h', signups_24h,
      'signups_7d', signups_7d,
      'dau', dau,
      'mau', mau
    ),
    'gmv', jsonb_build_object(
      'total', gmv_total,
      'd30', gmv_30d,
      'd24h', gmv_24h
    ),
    'payouts', jsonb_build_object(
      'paid_total', paid_out_total,
      'paid_30d', paid_out_30d,
      'pending_count', pending_wd_count,
      'pending_sum', pending_wd_sum,
      'completed_24h', completed_wd_24h,
      'sla', sla
    ),
    'risk', jsonb_build_object(
      'unack_anomalies', unack_anomalies,
      'freezes_active', freezes_active,
      'insurance_balance', insurance_balance
    ),
    'growth', jsonb_build_object(
      'k_factor_30d', k_factor,
      'referrals_30d', referrals_30d,
      'new_users_30d', new_users_30d
    ),
    'tier_dist', tier_dist
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_cockpit_metrics() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_cockpit_metrics() TO authenticated;

INSERT INTO public.function_permissions_baseline (function_name, function_args, allowed_roles, category, note)
VALUES ('admin_cockpit_metrics', '', ARRAY['authenticated'], 'admin_metrics', 'Admin-only single-call cockpit aggregates (internal has_role guard)')
ON CONFLICT (function_name, function_args) DO UPDATE
SET allowed_roles = EXCLUDED.allowed_roles, category = EXCLUDED.category, note = EXCLUDED.note, updated_at = now();
