-- Money Machine: harvest tracking + RPC
ALTER TABLE public.package_purchases
  ADD COLUMN IF NOT EXISTS last_harvest_date date,
  ADD COLUMN IF NOT EXISTS harvest_streak int NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.harvest_machine(_purchase_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _row public.package_purchases%ROWTYPE;
  _wallet public.wallet_balances%ROWTYPE;
  _today date := CURRENT_DATE;
  _month text := to_char(CURRENT_DATE,'YYYY-MM');
  _amount bigint;
  _completed boolean := false;
  _new_streak int;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;

  SELECT * INTO _row FROM public.package_purchases WHERE id=_purchase_id FOR UPDATE;
  IF NOT FOUND OR _row.user_id <> _uid THEN RAISE EXCEPTION 'not_found'; END IF;
  IF _row.status <> 'active' THEN RAISE EXCEPTION 'not_active'; END IF;
  IF _row.last_harvest_date = _today THEN RAISE EXCEPTION 'already_harvested_today'; END IF;
  IF _row.settled_count >= _row.duration_days THEN RAISE EXCEPTION 'machine_completed'; END IF;

  _amount := _row.daily_return;

  SELECT * INTO _wallet FROM public.wallet_balances WHERE user_id=_uid FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.wallet_balances(user_id) VALUES (_uid) RETURNING * INTO _wallet;
  END IF;
  IF _wallet.last_reset_date <> _today THEN
    _wallet.today_earned := 0; _wallet.last_reset_date := _today;
  END IF;
  IF _wallet.last_reset_month <> _month THEN
    _wallet.monthly_earned := 0; _wallet.last_reset_month := _month;
  END IF;

  UPDATE public.wallet_balances SET
    available_balance = available_balance + _amount,
    total_balance = total_balance + _amount,
    today_earned = _wallet.today_earned + _amount,
    monthly_earned = _wallet.monthly_earned + _amount,
    last_reset_date = _today,
    last_reset_month = _month,
    updated_at = now()
  WHERE user_id=_uid;

  _new_streak := COALESCE(_row.harvest_streak,0) + 1;

  IF _row.settled_count + 1 >= _row.duration_days THEN
    _completed := true;
    UPDATE public.package_purchases SET
      settled_count = settled_count + 1,
      total_settled = total_settled + _amount,
      last_harvest_date = _today,
      harvest_streak = _new_streak,
      status = 'completed',
      completed_at = now(),
      next_settle_at = NULL,
      updated_at = now()
    WHERE id=_purchase_id;
  ELSE
    UPDATE public.package_purchases SET
      settled_count = settled_count + 1,
      total_settled = total_settled + _amount,
      last_harvest_date = _today,
      harvest_streak = _new_streak,
      next_settle_at = (now() + interval '1 day'),
      updated_at = now()
    WHERE id=_purchase_id;
  END IF;

  INSERT INTO public.transactions(user_id, kind, direction, amount, balance_after, available_after, ref_id, metadata)
    VALUES (_uid,'package_settle','credit',_amount,
            _wallet.total_balance + _amount,
            _wallet.available_balance + _amount,
            _purchase_id::text,
            jsonb_build_object('source','machine_harvest','package_id',_row.package_id,'streak',_new_streak));

  RETURN jsonb_build_object(
    'ok',true,
    'amount',_amount,
    'streak',_new_streak,
    'completed',_completed,
    'new_balance',_wallet.available_balance + _amount,
    'days_left', GREATEST(0, _row.duration_days - (_row.settled_count + 1))
  );
END $$;

REVOKE ALL ON FUNCTION public.harvest_machine(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.harvest_machine(uuid) TO authenticated;