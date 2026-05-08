CREATE OR REPLACE FUNCTION public.get_starter_trust_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _today_bonus_count int := 0;
  _today_bonus_total bigint := 0;
  _withdraw_total bigint := 0;
  _signup_count int := 0;
BEGIN
  -- Today's signup-bonus / referral-bonus / handbook-bonus payouts (KST date proxy: server-local now())
  SELECT COUNT(*)::int, COALESCE(SUM(amount),0)::bigint
    INTO _today_bonus_count, _today_bonus_total
  FROM public.transactions
  WHERE direction = 'credit'
    AND kind IN ('signup_bonus','handbook_bonus','referral_bonus','attendance_bonus')
    AND created_at >= date_trunc('day', now() AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'Asia/Seoul';

  -- Lifetime completed withdrawals (all are fee-free per platform policy)
  SELECT COALESCE(SUM(amount),0)::bigint
    INTO _withdraw_total
  FROM public.withdrawal_requests
  WHERE status IN ('completed','approved');

  SELECT COUNT(*)::int INTO _signup_count FROM public.profiles;

  RETURN jsonb_build_object(
    'today_bonus_count', _today_bonus_count,
    'today_bonus_total', _today_bonus_total,
    'withdraw_total', _withdraw_total,
    'total_users', _signup_count,
    'computed_at', now()
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'today_bonus_count', 0,
    'today_bonus_total', 0,
    'withdraw_total', 0,
    'total_users', 0,
    'computed_at', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_starter_trust_stats() FROM public;
GRANT EXECUTE ON FUNCTION public.get_starter_trust_stats() TO anon, authenticated;

INSERT INTO public.function_permissions_baseline (function_name, function_args, allowed_roles, category, note)
VALUES ('get_starter_trust_stats','','{anon,authenticated}','public_stats','starter hero trust counter')
ON CONFLICT DO NOTHING;
