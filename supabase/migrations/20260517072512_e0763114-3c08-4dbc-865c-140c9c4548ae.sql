CREATE OR REPLACE FUNCTION public.phon_hub_summary()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _bal numeric := 0;
  _active_stake numeric := 0;
  _today_yield numeric := 0;
  _lifetime_yield numeric := 0;
  _next_yield_at timestamptz;
  _max_lev int := 10;
  _boost int := 0;
  _swap_used numeric := 0;
  _swap_cap numeric := 5000000;
  _lifetime_burn numeric := 0;
  _lvl_row record;
  _lvl_label text := 'Lv 1';
  _lvl_pct int := 0;
  _today_kst date;
  _now timestamptz := now();
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'auth_required';
  END IF;

  _today_kst := (timezone('Asia/Seoul', _now))::date;

  SELECT COALESCE(balance,0) INTO _bal FROM phon_balances WHERE user_id=_uid;
  _bal := COALESCE(_bal,0);

  SELECT COALESCE(SUM(amount),0) INTO _active_stake
  FROM phon_stakes WHERE user_id=_uid AND status='active';

  SELECT COALESCE(SUM(yield_phon),0) INTO _today_yield
  FROM phon_stake_yields
  WHERE user_id=_uid AND settled_for_date = _today_kst;

  SELECT COALESCE(SUM(yield_phon),0) INTO _lifetime_yield
  FROM phon_stake_yields WHERE user_id=_uid;

  -- Daily PHON staking cron runs at 00:10 KST → next occurrence
  _next_yield_at := (
    (_today_kst + INTERVAL '1 day' + INTERVAL '10 minutes')
    AT TIME ZONE 'Asia/Seoul'
  );

  BEGIN
    SELECT public.get_my_max_leverage() INTO _max_lev;
  EXCEPTION WHEN OTHERS THEN _max_lev := 10; END;

  BEGIN
    SELECT public.get_my_total_boost_pct() INTO _boost;
  EXCEPTION WHEN OTHERS THEN _boost := 0; END;

  -- Today's swap_out usage (PHON → KRW). Cap mirrors swap_phon_krw policy.
  SELECT COALESCE(SUM(amount),0) INTO _swap_used
  FROM phon_transactions
  WHERE user_id=_uid
    AND kind='swap_out'
    AND created_at >= (_today_kst::timestamp AT TIME ZONE 'Asia/Seoul')
    AND created_at <  ((_today_kst + 1)::timestamp AT TIME ZONE 'Asia/Seoul');
  _swap_used := ABS(COALESCE(_swap_used,0));

  -- Lifetime burn = sum of any debit with kind='burn'
  SELECT COALESCE(SUM(ABS(amount)),0) INTO _lifetime_burn
  FROM phon_transactions WHERE user_id=_uid AND kind='burn';

  BEGIN
    SELECT level, xp, xp_to_next, total_xp INTO _lvl_row FROM public.get_my_phon_level() LIMIT 1;
    IF _lvl_row.level IS NOT NULL THEN
      _lvl_label := 'Lv ' || _lvl_row.level::text;
      IF COALESCE(_lvl_row.xp_to_next,0) > 0 THEN
        _lvl_pct := LEAST(100, GREATEST(0,
          (COALESCE(_lvl_row.xp,0) * 100 /
            NULLIF((COALESCE(_lvl_row.xp,0) + COALESCE(_lvl_row.xp_to_next,0)),0)
          )::int
        ));
      ELSE
        _lvl_pct := 100;
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    _lvl_label := 'Lv 1'; _lvl_pct := 0;
  END;

  RETURN jsonb_build_object(
    'phon_balance', _bal,
    'active_stake_total', _active_stake,
    'today_yield', _today_yield,
    'lifetime_yield', _lifetime_yield,
    'next_yield_at', _next_yield_at,
    'leverage_max', _max_lev,
    'boost_pct', _boost,
    'swap_used_today', _swap_used,
    'swap_daily_cap', _swap_cap,
    'lifetime_burn', _lifetime_burn,
    'phon_level_label', _lvl_label,
    'phon_level_progress_pct', _lvl_pct,
    'server_now', _now
  );
END;
$$;

REVOKE ALL ON FUNCTION public.phon_hub_summary() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.phon_hub_summary() TO authenticated;

INSERT INTO public.function_permissions_baseline
  (function_name, function_args, allowed_roles, category, note)
VALUES
  ('phon_hub_summary', '', ARRAY['authenticated']::text[], 'user',
   'Read-only PhonHub v3 aggregate (balance/stake/yield/leverage/swap/burn/level)')
ON CONFLICT DO NOTHING;