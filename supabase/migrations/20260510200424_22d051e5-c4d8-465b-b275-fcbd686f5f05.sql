CREATE OR REPLACE FUNCTION public.admin_operator_pnl(p_from TIMESTAMPTZ DEFAULT (now() - interval '30 days'), p_to TIMESTAMPTZ DEFAULT now())
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller UUID := auth.uid();
  _deposits BIGINT; _withdrawals BIGINT;
  _pkg_revenue BIGINT; _pkg_paid BIGINT;
  _jp_in BIGINT; _jp_out BIGINT; _jp_margin BIGINT; _jp_pool BIGINT;
  _ar_in BIGINT; _ar_out BIGINT; _ar_margin BIGINT; _ar_pool BIGINT;
  _rec_paid BIGINT;
  _net BIGINT;
BEGIN
  IF _caller IS NULL OR NOT public.has_role(_caller,'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;

  SELECT COALESCE(SUM(amount),0) INTO _deposits FROM public.deposit_requests
    WHERE status='approved' AND created_at BETWEEN p_from AND p_to;
  SELECT COALESCE(SUM(amount),0) INTO _withdrawals FROM public.withdrawal_requests
    WHERE status='completed' AND created_at BETWEEN p_from AND p_to;

  SELECT COALESCE(SUM(amount),0), COALESCE(SUM(total_settled),0) INTO _pkg_revenue, _pkg_paid
    FROM public.package_purchases WHERE status='approved' AND COALESCE(approved_at, created_at) BETWEEN p_from AND p_to;

  SELECT COALESCE(SUM(contribution_amount),0) INTO _jp_in FROM public.jackpot_contributions
    WHERE created_at BETWEEN p_from AND p_to;
  SELECT COALESCE(SUM(winner_payout),0), COALESCE(SUM(operator_retain),0) INTO _jp_out, _jp_margin
    FROM public.jackpot_settlements WHERE created_at BETWEEN p_from AND p_to;
  SELECT amount INTO _jp_pool FROM public.jackpot_pool WHERE id=1;

  SELECT COALESCE(SUM(margin),0) INTO _ar_in FROM public.arena_rounds
    WHERE opened_at BETWEEN p_from AND p_to;
  SELECT COALESCE(SUM(reward),0), COALESCE(SUM(operator_rake),0) INTO _ar_out, _ar_margin
    FROM public.arena_rounds WHERE status='settled' AND settled_at BETWEEN p_from AND p_to;
  SELECT balance INTO _ar_pool FROM public.arena_pool WHERE id=1;

  SELECT COALESCE(SUM(bonus_amount),0) INTO _rec_paid FROM public.recovery_bonus_events
    WHERE created_at BETWEEN p_from AND p_to;

  _net := _pkg_revenue - _pkg_paid + _jp_margin + _ar_margin - _rec_paid;

  RETURN jsonb_build_object(
    'ok', true,
    'from', p_from,
    'to', p_to,
    'deposits', _deposits,
    'withdrawals', _withdrawals,
    'packages', jsonb_build_object('revenue', _pkg_revenue, 'paid', _pkg_paid, 'net', _pkg_revenue - _pkg_paid),
    'jackpot', jsonb_build_object('accrued', _jp_in, 'paid', _jp_out, 'operator_margin', _jp_margin, 'pool_balance', _jp_pool),
    'arena',   jsonb_build_object('collected', _ar_in, 'paid', _ar_out, 'operator_rake', _ar_margin, 'pool_balance', _ar_pool),
    'recovery_bonus_paid', _rec_paid,
    'operator_net_pnl', _net,
    'zero_loss_check', _net >= 0
  );
END $$;

INSERT INTO public.function_permissions_baseline(function_name, function_args, allowed_roles, category, note)
VALUES ('admin_operator_pnl','p_from timestamp with time zone, p_to timestamp with time zone', ARRAY['authenticated']::text[], 'admin', 'Phase 9: 운영자 회계 대시보드 - 내부 has_role 가드')
ON CONFLICT (function_name, function_args) DO UPDATE
  SET allowed_roles = EXCLUDED.allowed_roles, note = EXCLUDED.note, updated_at = now();