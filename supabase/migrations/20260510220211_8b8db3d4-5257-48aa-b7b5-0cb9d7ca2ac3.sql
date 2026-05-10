CREATE OR REPLACE FUNCTION public._check_daily_operator_pnl()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _from timestamptz := date_trunc('day', (now() AT TIME ZONE 'Asia/Seoul') - interval '1 day') AT TIME ZONE 'Asia/Seoul';
  _to   timestamptz := date_trunc('day', (now() AT TIME ZONE 'Asia/Seoul')) AT TIME ZONE 'Asia/Seoul';
  _pkg_revenue bigint; _pkg_paid bigint;
  _jp_margin bigint; _ar_margin bigint; _rec_paid bigint;
  _net bigint;
  _dedupe text;
BEGIN
  SELECT COALESCE(SUM(amount),0), COALESCE(SUM(total_settled),0) INTO _pkg_revenue, _pkg_paid
    FROM public.package_purchases
    WHERE status='approved' AND COALESCE(approved_at, created_at) >= _from AND COALESCE(approved_at, created_at) < _to;
  SELECT COALESCE(SUM(operator_retain),0) INTO _jp_margin
    FROM public.jackpot_settlements WHERE created_at >= _from AND created_at < _to;
  SELECT COALESCE(SUM(operator_rake),0) INTO _ar_margin
    FROM public.arena_rounds WHERE status='settled' AND settled_at >= _from AND settled_at < _to;
  SELECT COALESCE(SUM(bonus_amount),0) INTO _rec_paid
    FROM public.recovery_bonus_events WHERE created_at >= _from AND created_at < _to;

  _net := (_pkg_revenue - _pkg_paid) + _jp_margin + _ar_margin - _rec_paid;
  _dedupe := 'operator_pnl_' || to_char(_from, 'YYYYMMDD');

  IF _net < 0 THEN
    INSERT INTO public.anomaly_events(rule, severity, evidence, dedupe_key)
    VALUES (
      'operator_pnl_negative',
      'high',
      jsonb_build_object(
        'from', _from, 'to', _to,
        'packages_net', _pkg_revenue - _pkg_paid,
        'jackpot_margin', _jp_margin,
        'arena_margin', _ar_margin,
        'recovery_paid', _rec_paid,
        'net_pnl', _net
      ),
      _dedupe
    )
    ON CONFLICT (dedupe_key) DO NOTHING;
  END IF;

  RETURN jsonb_build_object('ok', true, 'net_pnl', _net, 'anomaly', _net < 0);
END $$;

REVOKE ALL ON FUNCTION public._check_daily_operator_pnl() FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  PERFORM cron.unschedule('phonara-daily-operator-pnl');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'phonara-daily-operator-pnl',
  '10 15 * * *',
  $$ SELECT public._check_daily_operator_pnl(); $$
);

INSERT INTO public.function_permissions_baseline(function_name, function_args, allowed_roles, category, note) VALUES
  ('_check_daily_operator_pnl','', ARRAY[]::text[], 'admin',
   'Phase 9 internal — pg_cron 일 1회 운영자 net P&L < 0 검증 → anomaly_events high. PUBLIC/anon/authenticated REVOKE 완료')
ON CONFLICT (function_name, function_args) DO UPDATE
  SET allowed_roles = EXCLUDED.allowed_roles, note = EXCLUDED.note, updated_at = now();