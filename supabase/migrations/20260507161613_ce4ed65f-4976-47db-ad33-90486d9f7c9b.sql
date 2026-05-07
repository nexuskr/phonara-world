
-- ROULETTE SPINS LOG
CREATE TABLE IF NOT EXISTS public.roulette_spins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL, -- 'standard' | 'golden' | 'gacha'
  prize_label text NOT NULL,
  amount bigint NOT NULL DEFAULT 0,
  cost bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.roulette_spins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rs_self_select" ON public.roulette_spins;
CREATE POLICY "rs_self_select" ON public.roulette_spins FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE INDEX IF NOT EXISTS idx_rs_user_day ON public.roulette_spins(user_id, created_at DESC);

-- Daily limit per tier
CREATE OR REPLACE FUNCTION public.roulette_daily_limit(_tier user_tier)
RETURNS int LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $$
  SELECT CASE _tier WHEN 'normal' THEN 1 WHEN 'vip' THEN 2 WHEN 'god' THEN 3 WHEN 'empire' THEN 5 END
$$;

-- SPIN ROULETTE
CREATE OR REPLACE FUNCTION public.spin_roulette(_kind text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _tier user_tier;
  _limit int;
  _used int;
  _r numeric := random();
  _amount bigint := 0;
  _label text;
  _scale numeric := 1.0;
  _wallet wallet_balances%ROWTYPE;
  _today date := CURRENT_DATE;
  _month text := to_char(CURRENT_DATE,'YYYY-MM');
  _cap bigint; _cap_left bigint;
  _segment int;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF _kind NOT IN ('standard','golden') THEN RAISE EXCEPTION 'invalid_kind'; END IF;

  SELECT tier INTO _tier FROM profiles WHERE id=_uid;
  IF _tier IS NULL THEN RAISE EXCEPTION 'profile_missing'; END IF;
  IF _kind = 'golden' AND _tier <> 'empire' THEN RAISE EXCEPTION 'empire_only'; END IF;

  _limit := public.roulette_daily_limit(_tier);
  SELECT COUNT(*) INTO _used FROM roulette_spins
   WHERE user_id=_uid AND kind IN ('standard','golden') AND created_at::date=_today;
  IF _used >= _limit THEN RAISE EXCEPTION 'daily_limit:%', _limit; END IF;

  IF _kind='golden' THEN _scale := 5.0; END IF;

  -- Weighted segments (8 slots) - probabilities sum to 1
  -- 0:꽝 25%, 1:1000 25%, 2:3000 20%, 3:5000 15%, 4:10000 8%, 5:20000 5%, 6:50000 1.5%, 7:잭팟 0.5%
  IF _r < 0.25 THEN _segment := 0; _amount := 0; _label := '꽝';
  ELSIF _r < 0.50 THEN _segment := 1; _amount := 1000; _label := '1,000원';
  ELSIF _r < 0.70 THEN _segment := 2; _amount := 3000; _label := '3,000원';
  ELSIF _r < 0.85 THEN _segment := 3; _amount := 5000; _label := '5,000원';
  ELSIF _r < 0.93 THEN _segment := 4; _amount := 10000; _label := '10,000원';
  ELSIF _r < 0.98 THEN _segment := 5; _amount := 20000; _label := '20,000원';
  ELSIF _r < 0.995 THEN _segment := 6; _amount := 50000; _label := '50,000원';
  ELSE _segment := 7; _amount := 200000; _label := '🎰 잭팟!';
  END IF;

  _amount := FLOOR(_amount * _scale)::bigint;
  IF _kind='golden' AND _segment=7 THEN _label := '🏆 GOLDEN 잭팟!'; END IF;

  -- Credit wallet under daily cap
  IF _amount > 0 THEN
    SELECT * INTO _wallet FROM wallet_balances WHERE user_id=_uid FOR UPDATE;
    IF NOT FOUND THEN INSERT INTO wallet_balances(user_id) VALUES (_uid) RETURNING * INTO _wallet; END IF;
    IF _wallet.last_reset_date <> _today THEN _wallet.today_earned:=0; _wallet.last_reset_date:=_today; END IF;
    IF _wallet.last_reset_month <> _month THEN _wallet.monthly_earned:=0; _wallet.last_reset_month:=_month; END IF;
    _cap := public.tier_daily_cap(_tier);
    _cap_left := GREATEST(0, _cap - _wallet.today_earned);
    IF _amount > _cap_left THEN _amount := _cap_left; END IF;
    IF _amount > 0 THEN
      UPDATE wallet_balances SET
        available_balance = available_balance + _amount,
        total_balance = total_balance + _amount,
        today_earned = _wallet.today_earned + _amount,
        monthly_earned = _wallet.monthly_earned + _amount,
        last_reset_date=_today, last_reset_month=_month, updated_at=now()
      WHERE user_id=_uid;
      INSERT INTO transactions(user_id, kind, direction, amount, balance_after, available_after, metadata)
        VALUES (_uid,'mission_win','credit',_amount,
                _wallet.total_balance + _amount, _wallet.available_balance + _amount,
                jsonb_build_object('source','roulette','kind',_kind,'label',_label,'segment',_segment));
    END IF;
  END IF;

  INSERT INTO roulette_spins(user_id, kind, prize_label, amount) VALUES (_uid, _kind, _label, _amount);

  RETURN jsonb_build_object('ok',true,'segment',_segment,'amount',_amount,'label',_label,'used',_used+1,'limit',_limit);
END $$;

-- EMPIRE GACHA (paid)
CREATE OR REPLACE FUNCTION public.gacha_pull()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _tier user_tier;
  _cost bigint := 50000;
  _r numeric := random();
  _amount bigint := 0;
  _label text;
  _grade text;
  _wallet wallet_balances%ROWTYPE;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  SELECT tier INTO _tier FROM profiles WHERE id=_uid;
  IF _tier <> 'empire' THEN RAISE EXCEPTION 'empire_only'; END IF;

  SELECT * INTO _wallet FROM wallet_balances WHERE user_id=_uid FOR UPDATE;
  IF _wallet.available_balance < _cost THEN RAISE EXCEPTION 'insufficient_funds'; END IF;

  -- Deduct
  UPDATE wallet_balances SET
    available_balance = available_balance - _cost,
    total_balance = total_balance - _cost,
    updated_at=now()
  WHERE user_id=_uid;

  -- Weighted prize pool (gacha is uncapped — luxury reward)
  -- N 50%, R 30%, SR 15%, SSR 4.5%, UR 0.5%
  IF _r < 0.50 THEN _grade:='N';   _amount := 10000;   _label := 'N · 10,000원';
  ELSIF _r < 0.80 THEN _grade:='R';   _amount := 30000;   _label := 'R · 30,000원';
  ELSIF _r < 0.95 THEN _grade:='SR';  _amount := 100000;  _label := 'SR · 100,000원';
  ELSIF _r < 0.995 THEN _grade:='SSR'; _amount := 500000;  _label := 'SSR · 500,000원';
  ELSE _grade:='UR'; _amount := 5000000; _label := 'UR · 🌟 5,000,000원';
  END IF;

  -- Credit prize (no daily cap on gacha — paid game)
  UPDATE wallet_balances SET
    available_balance = available_balance + _amount,
    total_balance = total_balance + _amount,
    updated_at=now()
  WHERE user_id=_uid;

  INSERT INTO transactions(user_id, kind, direction, amount, balance_after, available_after, metadata)
    VALUES (_uid,'mission_win','credit',_amount,
            _wallet.total_balance - _cost + _amount,
            _wallet.available_balance - _cost + _amount,
            jsonb_build_object('source','gacha','grade',_grade,'cost',_cost,'label',_label));

  INSERT INTO roulette_spins(user_id, kind, prize_label, amount, cost)
    VALUES (_uid, 'gacha', _label, _amount, _cost);

  RETURN jsonb_build_object('ok',true,'grade',_grade,'amount',_amount,'label',_label,'profit',_amount - _cost);
END $$;

-- Stats RPC
CREATE OR REPLACE FUNCTION public.get_roulette_stats()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _tier user_tier;
  _used_std int;
  _limit int;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  SELECT tier INTO _tier FROM profiles WHERE id=_uid;
  _limit := public.roulette_daily_limit(_tier);
  SELECT COUNT(*) INTO _used_std FROM roulette_spins
    WHERE user_id=_uid AND kind IN ('standard','golden') AND created_at::date=CURRENT_DATE;
  RETURN jsonb_build_object('tier',_tier,'used',_used_std,'limit',_limit,'remaining',GREATEST(0,_limit-_used_std));
END $$;
