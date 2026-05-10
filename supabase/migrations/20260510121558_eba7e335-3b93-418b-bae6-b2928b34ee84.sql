CREATE OR REPLACE FUNCTION public.settle_mission(_mission_id text, _is_win boolean, _base_reward bigint)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid UUID := auth.uid();
  _tier public.user_tier;
  _cap BIGINT;
  _boost NUMERIC;
  _wallet public.wallet_balances%ROWTYPE;
  _stats public.daily_stats%ROWTYPE;
  _streak INT := 0;
  _mult NUMERIC := 1.0;
  _dyn NUMERIC := 1.0;
  _final BIGINT := 0;
  _today DATE := CURRENT_DATE;
  _month TEXT := to_char(CURRENT_DATE,'YYYY-MM');
  _cap_remaining BIGINT;
  _tier_reward_cap BIGINT;
  _win_lo NUMERIC;
  _win_hi NUMERIC;
  _win_p NUMERIC;
  _server_is_win BOOLEAN;
  _capped_base BIGINT;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF _base_reward < 0 THEN RAISE EXCEPTION 'invalid reward'; END IF;

  SELECT tier INTO _tier FROM public.profiles WHERE id = _uid FOR UPDATE;
  IF _tier IS NULL THEN RAISE EXCEPTION 'profile missing'; END IF;
  _cap := public.tier_daily_cap(_tier);
  _boost := public.tier_boost(_tier);

  _tier_reward_cap := CASE _tier
    WHEN 'normal'::public.user_tier THEN 5000
    WHEN 'vip'::public.user_tier    THEN 7000
    WHEN 'god'::public.user_tier    THEN 10000
    WHEN 'empire'::public.user_tier THEN 15000
    ELSE 5000
  END;
  _capped_base := LEAST(_base_reward, _tier_reward_cap);

  CASE _tier
    WHEN 'normal'::public.user_tier THEN _win_lo := 0.58; _win_hi := 0.71;
    WHEN 'vip'::public.user_tier    THEN _win_lo := 0.82; _win_hi := 0.88;
    WHEN 'god'::public.user_tier    THEN _win_lo := 0.93; _win_hi := 0.965;
    WHEN 'empire'::public.user_tier THEN _win_lo := 0.982; _win_hi := 0.997;
    ELSE _win_lo := 0.58; _win_hi := 0.71;
  END CASE;
  _win_p := _win_lo + random() * (_win_hi - _win_lo);
  _server_is_win := random() < _win_p;

  SELECT * INTO _wallet FROM public.wallet_balances WHERE user_id = _uid FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.wallet_balances(user_id) VALUES (_uid) RETURNING * INTO _wallet;
  END IF;

  IF _wallet.last_reset_date <> _today THEN
    _wallet.today_earned := 0; _wallet.last_reset_date := _today;
  END IF;
  IF _wallet.last_reset_month <> _month THEN
    _wallet.monthly_earned := 0; _wallet.last_reset_month := _month;
  END IF;

  INSERT INTO public.daily_stats(user_id, stat_date) VALUES (_uid, _today)
    ON CONFLICT (user_id, stat_date) DO NOTHING;
  SELECT * INTO _stats FROM public.daily_stats WHERE user_id = _uid AND stat_date = _today FOR UPDATE;
  _streak := _stats.current_streak;

  IF _server_is_win THEN
    _streak := _streak + 1;
    _mult := LEAST(2.5, 1.0 + _streak * 0.05);
    _dyn := 0.95 + random() * 0.10;
    _final := FLOOR(_capped_base * _mult * _boost * _dyn)::BIGINT;

    _cap_remaining := GREATEST(0, _cap - _wallet.today_earned);
    IF _final > _cap_remaining THEN _final := _cap_remaining; END IF;

    IF _final > 0 THEN
      _wallet.available_balance := _wallet.available_balance + _final;
      _wallet.total_balance     := _wallet.total_balance + _final;
      _wallet.today_earned      := _wallet.today_earned + _final;
      _wallet.monthly_earned    := _wallet.monthly_earned + _final;
    END IF;

    _stats.wins := _stats.wins + 1;
    _stats.earned := _stats.earned + _final;
    _stats.current_streak := _streak;
    _stats.best_streak := GREATEST(_stats.best_streak, _streak);
  ELSE
    _streak := 0;
    _stats.losses := _stats.losses + 1;
    _stats.current_streak := 0;
    _final := 0;
  END IF;

  UPDATE public.wallet_balances SET
    available_balance = _wallet.available_balance,
    total_balance     = _wallet.total_balance,
    today_earned      = _wallet.today_earned,
    monthly_earned    = _wallet.monthly_earned,
    last_reset_date   = _wallet.last_reset_date,
    last_reset_month  = _wallet.last_reset_month,
    updated_at        = now()
  WHERE user_id = _uid;

  UPDATE public.daily_stats SET
    wins = _stats.wins,
    losses = _stats.losses,
    earned = _stats.earned,
    current_streak = _stats.current_streak,
    best_streak = _stats.best_streak
  WHERE user_id = _uid AND stat_date = _today;

  INSERT INTO public.mission_history(
    user_id, mission_id, is_win, base_reward, final_reward,
    streak, multiplier, tier, cap_remaining
  ) VALUES (
    _uid, _mission_id, _server_is_win, _capped_base, _final,
    _streak, _mult, _tier, GREATEST(0, _cap - _wallet.today_earned)
  );

  RETURN jsonb_build_object(
    'is_win', _server_is_win,
    'final_reward', _final,
    'streak', _streak,
    'multiplier', _mult,
    'tier', _tier,
    'available_balance', _wallet.available_balance,
    'today_earned', _wallet.today_earned,
    'cap_remaining', GREATEST(0, _cap - _wallet.today_earned)
  );
END;
$function$;