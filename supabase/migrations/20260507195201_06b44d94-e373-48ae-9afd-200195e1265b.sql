
-- 1) Add columns to package_purchases
ALTER TABLE public.package_purchases
  ADD COLUMN IF NOT EXISTS boost_until timestamptz,
  ADD COLUMN IF NOT EXISTS boost_multiplier numeric NOT NULL DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS instant_300k_paid boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS founding_bonus_paid boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS seven_day_bonus_paid boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_empire_founding_member boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS founding_seat_no int;

-- 2) Empire founding seats (30 seats, pre-seeded)
CREATE TABLE IF NOT EXISTS public.empire_founding_seats (
  seat_no int PRIMARY KEY,
  claimed_by uuid,
  claimed_at timestamptz,
  purchase_id uuid
);

ALTER TABLE public.empire_founding_seats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS efs_public_read ON public.empire_founding_seats;
CREATE POLICY efs_public_read ON public.empire_founding_seats FOR SELECT USING (true);

INSERT INTO public.empire_founding_seats (seat_no)
SELECT g FROM generate_series(1,30) g
ON CONFLICT (seat_no) DO NOTHING;

-- 3) Boost schedule (Empire Day pre-announced)
CREATE TABLE IF NOT EXISTS public.boost_schedule (
  schedule_date date PRIMARY KEY,
  multiplier numeric NOT NULL DEFAULT 1.5,
  label text
);

ALTER TABLE public.boost_schedule ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bs_public_read ON public.boost_schedule;
CREATE POLICY bs_public_read ON public.boost_schedule FOR SELECT USING (true);

-- Pre-seed next 6 months of Empire Days (1st & 15th)
INSERT INTO public.boost_schedule (schedule_date, multiplier, label)
SELECT d::date, 1.5, 'Empire Day'
FROM (
  SELECT generate_series(date_trunc('month', CURRENT_DATE),
                         date_trunc('month', CURRENT_DATE) + interval '6 months',
                         interval '1 month')::date + 0 AS d
  UNION ALL
  SELECT generate_series(date_trunc('month', CURRENT_DATE),
                         date_trunc('month', CURRENT_DATE) + interval '6 months',
                         interval '1 month')::date + 14 AS d
) s
WHERE d >= CURRENT_DATE
ON CONFLICT (schedule_date) DO NOTHING;

-- 4) Updated harvest_machine with boost + 7-day challenge
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
  _base bigint;
  _amount bigint;
  _bonus_amount bigint := 0;
  _multiplier numeric := 1.0;
  _completed boolean := false;
  _new_streak int;
  _empire_day_mult numeric;
  _seven_day_bonus boolean := false;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;

  SELECT * INTO _row FROM public.package_purchases WHERE id=_purchase_id FOR UPDATE;
  IF NOT FOUND OR _row.user_id <> _uid THEN RAISE EXCEPTION 'not_found'; END IF;
  IF _row.status <> 'active' THEN RAISE EXCEPTION 'not_active'; END IF;
  IF _row.last_harvest_date = _today THEN RAISE EXCEPTION 'already_harvested_today'; END IF;
  IF _row.settled_count >= _row.duration_days THEN RAISE EXCEPTION 'machine_completed'; END IF;

  _base := _row.daily_return;

  -- Boost: Day 1~3 (pre-announced fixed schedule)
  IF _row.boost_until IS NOT NULL AND now() < _row.boost_until AND _row.boost_multiplier > 1.0 THEN
    _multiplier := _row.boost_multiplier;
  END IF;

  -- Empire Day boost (only Empire holders)
  IF _row.package_id = 'empire' THEN
    SELECT multiplier INTO _empire_day_mult FROM public.boost_schedule WHERE schedule_date = _today;
    IF _empire_day_mult IS NOT NULL AND _empire_day_mult > _multiplier THEN
      _multiplier := _empire_day_mult;
    END IF;
  END IF;

  _amount := (_base * _multiplier)::bigint;

  -- 7-day consecutive harvest bonus (one-time)
  _new_streak := COALESCE(_row.harvest_streak, 0);
  IF _row.last_harvest_date IS NOT NULL AND _row.last_harvest_date = _today - 1 THEN
    _new_streak := _new_streak + 1;
  ELSE
    _new_streak := 1;
  END IF;

  IF _new_streak >= 7 AND NOT _row.seven_day_bonus_paid THEN
    _bonus_amount := _base; -- one full day's return
    _seven_day_bonus := true;
  END IF;

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
    available_balance = available_balance + _amount + _bonus_amount,
    total_balance = total_balance + _amount + _bonus_amount,
    today_earned = _wallet.today_earned + _amount + _bonus_amount,
    monthly_earned = _wallet.monthly_earned + _amount + _bonus_amount,
    last_reset_date = _today,
    last_reset_month = _month,
    updated_at = now()
  WHERE user_id=_uid;

  IF _row.settled_count + 1 >= _row.duration_days THEN
    _completed := true;
    UPDATE public.package_purchases SET
      settled_count = settled_count + 1,
      total_settled = total_settled + _amount + _bonus_amount,
      last_harvest_date = _today,
      harvest_streak = _new_streak,
      seven_day_bonus_paid = _row.seven_day_bonus_paid OR _seven_day_bonus,
      status = 'completed',
      completed_at = now(),
      next_settle_at = NULL,
      updated_at = now()
    WHERE id=_purchase_id;
  ELSE
    UPDATE public.package_purchases SET
      settled_count = settled_count + 1,
      total_settled = total_settled + _amount + _bonus_amount,
      last_harvest_date = _today,
      harvest_streak = _new_streak,
      seven_day_bonus_paid = _row.seven_day_bonus_paid OR _seven_day_bonus,
      next_settle_at = (now() + interval '1 day'),
      updated_at = now()
    WHERE id=_purchase_id;
  END IF;

  INSERT INTO public.transactions(user_id, kind, direction, amount, balance_after, available_after, ref_id, metadata)
    VALUES (_uid,'package_settle','credit',_amount,
            _wallet.total_balance + _amount,
            _wallet.available_balance + _amount,
            _purchase_id::text,
            jsonb_build_object('source','machine_harvest','package_id',_row.package_id,'streak',_new_streak,'multiplier',_multiplier));

  IF _seven_day_bonus THEN
    INSERT INTO public.transactions(user_id, kind, direction, amount, balance_after, available_after, ref_id, metadata)
      VALUES (_uid,'package_settle','credit',_bonus_amount,
              _wallet.total_balance + _amount + _bonus_amount,
              _wallet.available_balance + _amount + _bonus_amount,
              _purchase_id::text,
              jsonb_build_object('source','seven_day_bonus','package_id',_row.package_id));
  END IF;

  RETURN jsonb_build_object(
    'ok',true,
    'amount',_amount,
    'bonus',_bonus_amount,
    'multiplier',_multiplier,
    'streak',_new_streak,
    'seven_day_bonus',_seven_day_bonus,
    'completed',_completed,
    'new_balance',_wallet.available_balance + _amount + _bonus_amount,
    'days_left', GREATEST(0, _row.duration_days - (_row.settled_count + 1))
  );
END $$;

REVOKE ALL ON FUNCTION public.harvest_machine(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.harvest_machine(uuid) TO authenticated;

-- 5) Updated admin_resolve_package: set boost + Empire bonuses on approve
CREATE OR REPLACE FUNCTION public.admin_resolve_package(_purchase_id UUID, _action TEXT, _reason TEXT)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  _uid UUID := auth.uid();
  _row public.package_purchases%ROWTYPE;
  _seat_no int;
  _boost_mult numeric;
  _wallet public.wallet_balances%ROWTYPE;
  _instant_amount bigint := 300000;
  _founding_amount bigint := 500000;
BEGIN
  IF NOT public.has_role(_uid,'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT * INTO _row FROM public.package_purchases WHERE id=_purchase_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found'; END IF;

  IF _action = 'approve' THEN
    IF _row.status NOT IN ('pending') THEN RAISE EXCEPTION 'invalid_state'; END IF;

    -- Determine boost multiplier per package
    _boost_mult := CASE
      WHEN _row.package_id = 'empire' THEN 1.5
      WHEN _row.package_id IN ('easy_starter','easy_50','easy_150') THEN 1.3
      ELSE 1.0
    END;

    UPDATE public.package_purchases
      SET status='active',
          approved_at=now(),
          admin_id=_uid,
          next_settle_at = now() + interval '1 day',
          boost_until = now() + interval '3 days',
          boost_multiplier = _boost_mult
      WHERE id=_purchase_id;

    -- Empire-specific bonuses
    IF _row.package_id = 'empire' THEN
      -- Wallet upsert
      SELECT * INTO _wallet FROM public.wallet_balances WHERE user_id=_row.user_id FOR UPDATE;
      IF NOT FOUND THEN
        INSERT INTO public.wallet_balances(user_id) VALUES (_row.user_id) RETURNING * INTO _wallet;
      END IF;

      -- Try to claim a founding seat (atomic via FOR UPDATE SKIP LOCKED)
      SELECT seat_no INTO _seat_no
        FROM public.empire_founding_seats
        WHERE claimed_by IS NULL
        ORDER BY seat_no
        LIMIT 1
        FOR UPDATE SKIP LOCKED;

      IF _seat_no IS NOT NULL THEN
        UPDATE public.empire_founding_seats
          SET claimed_by = _row.user_id, claimed_at = now(), purchase_id = _purchase_id
          WHERE seat_no = _seat_no;
        UPDATE public.package_purchases
          SET is_empire_founding_member = true,
              founding_seat_no = _seat_no,
              founding_bonus_paid = true
          WHERE id = _purchase_id;

        -- Pay founding bonus 500,000
        UPDATE public.wallet_balances SET
          available_balance = available_balance + _founding_amount,
          total_balance = total_balance + _founding_amount,
          updated_at = now()
        WHERE user_id = _row.user_id;

        INSERT INTO public.transactions(user_id, kind, direction, amount, balance_after, available_after, ref_id, metadata)
          VALUES (_row.user_id,'package_settle','credit',_founding_amount,
                  _wallet.total_balance + _founding_amount,
                  _wallet.available_balance + _founding_amount,
                  _purchase_id::text,
                  jsonb_build_object('source','empire_founding_bonus','seat_no',_seat_no));

        _wallet.total_balance := _wallet.total_balance + _founding_amount;
        _wallet.available_balance := _wallet.available_balance + _founding_amount;
      END IF;

      -- Pay instant 300,000 (always, withdrawable)
      UPDATE public.wallet_balances SET
        available_balance = available_balance + _instant_amount,
        total_balance = total_balance + _instant_amount,
        updated_at = now()
      WHERE user_id = _row.user_id;

      INSERT INTO public.transactions(user_id, kind, direction, amount, balance_after, available_after, ref_id, metadata)
        VALUES (_row.user_id,'package_settle','credit',_instant_amount,
                _wallet.total_balance + _instant_amount,
                _wallet.available_balance + _instant_amount,
                _purchase_id::text,
                jsonb_build_object('source','empire_instant_bonus'));

      UPDATE public.package_purchases
        SET instant_300k_paid = true
        WHERE id = _purchase_id;
    END IF;

  ELSIF _action = 'reject' THEN
    IF _row.status NOT IN ('pending') THEN RAISE EXCEPTION 'invalid_state'; END IF;
    UPDATE public.package_purchases SET status='rejected', rejected_reason=_reason, admin_id=_uid WHERE id=_purchase_id;
  ELSE
    RAISE EXCEPTION 'invalid_action';
  END IF;

  RETURN jsonb_build_object('ok',true,'action',_action);
END $$;

GRANT EXECUTE ON FUNCTION public.admin_resolve_package(uuid, text, text) TO authenticated;

-- 6) Helper RPCs
CREATE OR REPLACE FUNCTION public.get_empire_seats_remaining()
RETURNS int LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
  SELECT COUNT(*)::int FROM public.empire_founding_seats WHERE claimed_by IS NULL;
$$;
GRANT EXECUTE ON FUNCTION public.get_empire_seats_remaining() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_active_boost_count()
RETURNS int LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
  SELECT COUNT(*)::int FROM public.package_purchases
    WHERE status = 'active' AND boost_until IS NOT NULL AND now() < boost_until;
$$;
GRANT EXECUTE ON FUNCTION public.get_active_boost_count() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_next_empire_day()
RETURNS date LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
  SELECT MIN(schedule_date) FROM public.boost_schedule WHERE schedule_date >= CURRENT_DATE;
$$;
GRANT EXECUTE ON FUNCTION public.get_next_empire_day() TO anon, authenticated;
