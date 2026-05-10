
-- 1. empire_units
CREATE TABLE IF NOT EXISTS public.empire_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tier TEXT NOT NULL CHECK (tier IN ('free','easy_starter','easy_50','easy_150','empire','empire_elite','phantom')),
  level SMALLINT NOT NULL DEFAULT 1 CHECK (level BETWEEN 1 AND 100),
  xp INT NOT NULL DEFAULT 0 CHECK (xp >= 0),
  stats JSONB NOT NULL DEFAULT '{}'::jsonb,
  acquired_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_empire_units_user ON public.empire_units(user_id);
ALTER TABLE public.empire_units ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "empire_units owner select" ON public.empire_units;
CREATE POLICY "empire_units owner select" ON public.empire_units FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "empire_units admin all" ON public.empire_units;
CREATE POLICY "empire_units admin all" ON public.empire_units FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 2. daily_combo_progress
CREATE TABLE IF NOT EXISTS public.daily_combo_progress (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Seoul')::date,
  steps JSONB NOT NULL DEFAULT '{}'::jsonb,
  rewarded_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, date)
);
ALTER TABLE public.daily_combo_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "daily_combo owner select" ON public.daily_combo_progress;
CREATE POLICY "daily_combo owner select" ON public.daily_combo_progress FOR SELECT TO authenticated USING (user_id = auth.uid());

-- 3. idle_growth_state
CREATE TABLE IF NOT EXISTS public.idle_growth_state (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  last_tick_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accrued_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  daily_claimed NUMERIC(14,2) NOT NULL DEFAULT 0,
  last_claim_at TIMESTAMPTZ
);
ALTER TABLE public.idle_growth_state ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "idle_growth owner select" ON public.idle_growth_state;
CREATE POLICY "idle_growth owner select" ON public.idle_growth_state FOR SELECT TO authenticated USING (user_id = auth.uid());

-- 4. tap_counters
CREATE TABLE IF NOT EXISTS public.tap_counters (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Seoul')::date,
  tap_count INT NOT NULL DEFAULT 0,
  last_tap_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  rewarded_taps INT NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, date)
);
ALTER TABLE public.tap_counters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tap_counters owner select" ON public.tap_counters;
CREATE POLICY "tap_counters owner select" ON public.tap_counters FOR SELECT TO authenticated USING (user_id = auth.uid());

-- ============================================================
-- RPCs
-- ============================================================

-- progress_daily_combo
CREATE OR REPLACE FUNCTION public.progress_daily_combo(_step TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _today DATE := (now() AT TIME ZONE 'Asia/Seoul')::date;
  _row RECORD;
  _steps JSONB;
  _completed_count INT;
  _reward INT := 0;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF _step NOT IN ('attendance','paper_win','ai_mission','sns_share') THEN
    RAISE EXCEPTION 'invalid_step';
  END IF;

  INSERT INTO public.daily_combo_progress (user_id, date, steps)
  VALUES (_uid, _today, jsonb_build_object(_step, now()))
  ON CONFLICT (user_id, date) DO UPDATE
    SET steps = public.daily_combo_progress.steps || jsonb_build_object(_step, now())
  RETURNING * INTO _row;

  _steps := _row.steps;
  _completed_count := jsonb_object_keys_count(_steps);
  -- Fallback: count keys manually (no helper assumed)
  SELECT count(*) INTO _completed_count FROM jsonb_object_keys(_steps);

  IF _completed_count >= 4 AND _row.rewarded_at IS NULL THEN
    _reward := 10000;
    UPDATE public.daily_combo_progress SET rewarded_at = now() WHERE user_id = _uid AND date = _today;
    -- 보상 지급 (지갑 잔고 가산)
    UPDATE public.wallet_balances
       SET available_balance = COALESCE(available_balance,0) + _reward,
           today_earned = COALESCE(today_earned,0) + _reward
     WHERE user_id = _uid;
  END IF;

  RETURN jsonb_build_object('completed', _completed_count, 'total', 4, 'reward', _reward, 'steps', _steps);
END;
$$;

-- claim_idle_growth
CREATE OR REPLACE FUNCTION public.claim_idle_growth()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _state RECORD;
  _balance NUMERIC;
  _hours NUMERIC;
  _rate NUMERIC := 0.008; -- 0.8%/h
  _amount NUMERIC;
  _daily_cap NUMERIC := 5000;
  _today DATE := (now() AT TIME ZONE 'Asia/Seoul')::date;
  _last_claim_date DATE;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;

  INSERT INTO public.idle_growth_state (user_id) VALUES (_uid)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO _state FROM public.idle_growth_state WHERE user_id = _uid FOR UPDATE;
  SELECT COALESCE(available_balance,0) INTO _balance FROM public.wallet_balances WHERE user_id = _uid;
  IF _balance IS NULL THEN _balance := 0; END IF;

  _hours := EXTRACT(EPOCH FROM (now() - _state.last_tick_at)) / 3600.0;
  IF _hours > 24 THEN _hours := 24; END IF; -- 24h cap
  _amount := LEAST(_balance, 200000) * _rate * _hours; -- 잔고 20만원 한도로 % 계산

  _last_claim_date := (_state.last_claim_at AT TIME ZONE 'Asia/Seoul')::date;
  IF _last_claim_date IS DISTINCT FROM _today THEN
    UPDATE public.idle_growth_state SET daily_claimed = 0 WHERE user_id = _uid;
    _state.daily_claimed := 0;
  END IF;

  _amount := LEAST(_amount, GREATEST(_daily_cap - _state.daily_claimed, 0));
  _amount := FLOOR(_amount);

  IF _amount > 0 THEN
    UPDATE public.wallet_balances
       SET available_balance = COALESCE(available_balance,0) + _amount,
           today_earned = COALESCE(today_earned,0) + _amount
     WHERE user_id = _uid;
  END IF;

  UPDATE public.idle_growth_state
     SET last_tick_at = now(),
         last_claim_at = now(),
         daily_claimed = daily_claimed + _amount,
         accrued_amount = accrued_amount + _amount
   WHERE user_id = _uid;

  RETURN jsonb_build_object('claimed', _amount, 'hours', ROUND(_hours::numeric, 2), 'daily_cap', _daily_cap);
END;
$$;

-- tap_reinforce
CREATE OR REPLACE FUNCTION public.tap_reinforce(_nonce TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _today DATE := (now() AT TIME ZONE 'Asia/Seoul')::date;
  _row RECORD;
  _reward INT := 0;
  _new_count INT;
  _daily_cap INT := 10000;
  _per_sec_cap INT := 5;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF _nonce IS NULL OR length(_nonce) < 8 OR length(_nonce) > 64 THEN
    RAISE EXCEPTION 'invalid_nonce';
  END IF;

  INSERT INTO public.tap_counters (user_id, date) VALUES (_uid, _today)
  ON CONFLICT (user_id, date) DO NOTHING;

  SELECT * INTO _row FROM public.tap_counters WHERE user_id = _uid AND date = _today FOR UPDATE;

  -- 1초당 5탭 상한
  IF _row.last_tap_at > now() - INTERVAL '1 second' AND _row.tap_count >= _per_sec_cap THEN
    -- soft drop: 계산만 1탭으로
    NULL;
  END IF;
  IF _row.tap_count >= _daily_cap THEN
    RETURN jsonb_build_object('tap_count', _row.tap_count, 'reward', 0, 'capped', true);
  END IF;

  _new_count := _row.tap_count + 1;
  -- 누적 100탭마다 +500원, 단 일 최대 5,000원
  IF _new_count % 100 = 0 AND _row.rewarded_taps + 100 <= _new_count AND _row.rewarded_taps < 1000 THEN
    _reward := 500;
    UPDATE public.tap_counters
       SET tap_count = _new_count,
           last_tap_at = now(),
           rewarded_taps = rewarded_taps + 100
     WHERE user_id = _uid AND date = _today;
    UPDATE public.wallet_balances
       SET available_balance = COALESCE(available_balance,0) + _reward,
           today_earned = COALESCE(today_earned,0) + _reward
     WHERE user_id = _uid;
  ELSE
    UPDATE public.tap_counters
       SET tap_count = _new_count, last_tap_at = now()
     WHERE user_id = _uid AND date = _today;
  END IF;

  RETURN jsonb_build_object('tap_count', _new_count, 'reward', _reward, 'capped', false);
END;
$$;

-- evolve_empire_unit
CREATE OR REPLACE FUNCTION public.evolve_empire_unit(_unit_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _unit RECORD;
  _new_level SMALLINT;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;

  SELECT * INTO _unit FROM public.empire_units WHERE id = _unit_id AND user_id = _uid FOR UPDATE;
  IF _unit IS NULL THEN RAISE EXCEPTION 'unit_not_found'; END IF;

  IF _unit.xp < 100 THEN
    RAISE EXCEPTION 'insufficient_xp';
  END IF;

  _new_level := LEAST(_unit.level + 1, 100);
  UPDATE public.empire_units
     SET level = _new_level,
         xp = _unit.xp - 100,
         updated_at = now()
   WHERE id = _unit_id;

  RETURN jsonb_build_object('id', _unit_id, 'level', _new_level, 'xp_remaining', _unit.xp - 100);
END;
$$;

-- Grants
REVOKE ALL ON FUNCTION public.progress_daily_combo(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.claim_idle_growth() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.tap_reinforce(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.evolve_empire_unit(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.progress_daily_combo(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_idle_growth() TO authenticated;
GRANT EXECUTE ON FUNCTION public.tap_reinforce(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.evolve_empire_unit(UUID) TO authenticated;

-- baseline
INSERT INTO public.function_permissions_baseline (function_name, function_args, allowed_roles, category, note) VALUES
  ('progress_daily_combo','_step text',ARRAY['authenticated'],'user','P2: Daily combo step progression (Hamster Kombat style)'),
  ('claim_idle_growth','',ARRAY['authenticated'],'user','P2: Idle growth 0.8%/h (Pixels style)'),
  ('tap_reinforce','_nonce text',ARRAY['authenticated'],'user','P2: Tap-to-Reinforce (Hamster Kombat tap-to-earn)'),
  ('evolve_empire_unit','_unit_id uuid',ARRAY['authenticated'],'user','P2: Axie-style empire unit level-up')
ON CONFLICT (function_name, function_args) DO UPDATE
  SET allowed_roles = EXCLUDED.allowed_roles,
      category = EXCLUDED.category,
      note = EXCLUDED.note,
      updated_at = now();
