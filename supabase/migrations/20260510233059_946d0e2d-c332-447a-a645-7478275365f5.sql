
-- 1. empire_map_progress (7 영토)
CREATE TABLE IF NOT EXISTS public.empire_map_progress (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  territories JSONB NOT NULL DEFAULT
    '{"seoul":0,"busan":0,"incheon":0,"daegu":0,"daejeon":0,"gwangju":0,"jeju":0}'::jsonb,
  conquest_count INT NOT NULL DEFAULT 0,
  raid_count INT NOT NULL DEFAULT 0,
  last_battle_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.empire_map_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "empire_map owner select" ON public.empire_map_progress;
CREATE POLICY "empire_map owner select" ON public.empire_map_progress FOR SELECT TO authenticated USING (user_id = auth.uid());

-- 2. empire_battles
CREATE TABLE IF NOT EXISTS public.empire_battles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  side TEXT NOT NULL CHECK (side IN ('long','short')),
  result TEXT NOT NULL CHECK (result IN ('win','loss','liquidation','near_miss')),
  pnl NUMERIC(14,2) NOT NULL DEFAULT 0,
  mode TEXT NOT NULL DEFAULT 'paper' CHECK (mode IN ('paper','real')),
  territory TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_empire_battles_user_time ON public.empire_battles(user_id, created_at DESC);
ALTER TABLE public.empire_battles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "empire_battles owner select" ON public.empire_battles;
CREATE POLICY "empire_battles owner select" ON public.empire_battles FOR SELECT TO authenticated USING (user_id = auth.uid());

-- 3. coin_trade_coupons
CREATE TABLE IF NOT EXISTS public.coin_trade_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL DEFAULT 'real_50' CHECK (kind IN ('real_50','real_30','real_free')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 days'),
  redeemed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_coin_trade_coupons_user ON public.coin_trade_coupons(user_id);
ALTER TABLE public.coin_trade_coupons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "coupons owner select" ON public.coin_trade_coupons;
CREATE POLICY "coupons owner select" ON public.coin_trade_coupons FOR SELECT TO authenticated USING (user_id = auth.uid());

-- ============================================================
-- record_empire_battle
-- ============================================================
CREATE OR REPLACE FUNCTION public.record_empire_battle(
  _side TEXT,
  _result TEXT,
  _pnl NUMERIC,
  _mode TEXT DEFAULT 'paper'
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _row RECORD;
  _territories JSONB;
  _territory TEXT;
  _key TEXT;
  _current NUMERIC;
  _delta NUMERIC := 0;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF _side NOT IN ('long','short') THEN RAISE EXCEPTION 'invalid_side'; END IF;
  IF _result NOT IN ('win','loss','liquidation','near_miss') THEN RAISE EXCEPTION 'invalid_result'; END IF;
  IF _mode NOT IN ('paper','real') THEN RAISE EXCEPTION 'invalid_mode'; END IF;

  -- 영토 회전 선택 (battle 카운트에 따른 결정적 분배)
  INSERT INTO public.empire_map_progress (user_id) VALUES (_uid) ON CONFLICT (user_id) DO NOTHING;
  SELECT * INTO _row FROM public.empire_map_progress WHERE user_id = _uid FOR UPDATE;

  _territory := (ARRAY['seoul','busan','incheon','daegu','daejeon','gwangju','jeju'])
    [1 + ((_row.conquest_count + _row.raid_count) % 7)];

  -- 점유율 변화 계산
  IF _result = 'win' THEN
    _delta := CASE WHEN _side = 'long' THEN 2.0 ELSE 1.5 END;
  ELSIF _result = 'near_miss' THEN
    _delta := 0.3;
  ELSIF _result = 'loss' THEN
    _delta := -0.5;
  ELSIF _result = 'liquidation' THEN
    _delta := -2.0;
  END IF;

  _territories := _row.territories;
  _current := COALESCE((_territories->>_territory)::numeric, 0);
  _territories := jsonb_set(_territories, ARRAY[_territory],
    to_jsonb(GREATEST(0, LEAST(100, _current + _delta))));

  UPDATE public.empire_map_progress
     SET territories = _territories,
         conquest_count = conquest_count + CASE WHEN _side='long' AND _result='win' THEN 1 ELSE 0 END,
         raid_count = raid_count + CASE WHEN _side='short' AND _result='win' THEN 1 ELSE 0 END,
         last_battle_at = now(),
         updated_at = now()
   WHERE user_id = _uid;

  INSERT INTO public.empire_battles (user_id, side, result, pnl, mode, territory)
  VALUES (_uid, _side, _result, COALESCE(_pnl,0), _mode, _territory);

  RETURN jsonb_build_object(
    'territory', _territory,
    'delta', _delta,
    'new_share', COALESCE((_territories->>_territory)::numeric, 0)
  );
END;
$$;

-- ============================================================
-- claim_coin_first_win (멱등: 1회 한정)
-- ============================================================
CREATE OR REPLACE FUNCTION public.claim_coin_first_win()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _has_win BOOLEAN;
  _already_claimed BOOLEAN;
  _code TEXT;
  _reward INT := 5000;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.empire_battles
     WHERE user_id = _uid AND mode = 'paper' AND result = 'win'
  ) INTO _has_win;

  IF NOT _has_win THEN
    RETURN jsonb_build_object('granted', false, 'reason', 'no_paper_win_yet');
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.coin_trade_coupons
     WHERE user_id = _uid AND kind = 'real_50'
  ) INTO _already_claimed;

  IF _already_claimed THEN
    RETURN jsonb_build_object('granted', false, 'reason', 'already_claimed');
  END IF;

  _code := 'FIRSTWIN-' || upper(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 10));

  INSERT INTO public.coin_trade_coupons (user_id, code, kind, expires_at)
  VALUES (_uid, _code, 'real_50', now() + INTERVAL '30 days');

  UPDATE public.wallet_balances
     SET available_balance = COALESCE(available_balance,0) + _reward,
         today_earned = COALESCE(today_earned,0) + _reward
   WHERE user_id = _uid;

  RETURN jsonb_build_object('granted', true, 'reward', _reward, 'coupon_code', _code);
END;
$$;

-- ============================================================
-- redeem_real_coupon
-- ============================================================
CREATE OR REPLACE FUNCTION public.redeem_real_coupon(_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _row RECORD;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF _code IS NULL OR length(_code) < 6 THEN RAISE EXCEPTION 'invalid_code'; END IF;

  SELECT * INTO _row FROM public.coin_trade_coupons
   WHERE user_id = _uid AND code = _code FOR UPDATE;

  IF _row IS NULL THEN RAISE EXCEPTION 'coupon_not_found'; END IF;
  IF _row.redeemed_at IS NOT NULL THEN RAISE EXCEPTION 'already_redeemed'; END IF;
  IF _row.expires_at < now() THEN RAISE EXCEPTION 'coupon_expired'; END IF;

  UPDATE public.coin_trade_coupons SET redeemed_at = now() WHERE id = _row.id;

  RETURN jsonb_build_object('redeemed', true, 'kind', _row.kind);
END;
$$;

-- ============================================================
-- get_my_empire_map
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_my_empire_map()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _row RECORD;
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('error','not_authenticated'); END IF;
  SELECT * INTO _row FROM public.empire_map_progress WHERE user_id = _uid;
  IF _row IS NULL THEN
    RETURN jsonb_build_object(
      'territories', '{"seoul":0,"busan":0,"incheon":0,"daegu":0,"daejeon":0,"gwangju":0,"jeju":0}'::jsonb,
      'conquest_count', 0, 'raid_count', 0
    );
  END IF;
  RETURN jsonb_build_object(
    'territories', _row.territories,
    'conquest_count', _row.conquest_count,
    'raid_count', _row.raid_count,
    'last_battle_at', _row.last_battle_at
  );
END;
$$;

-- Grants + baseline
REVOKE ALL ON FUNCTION public.record_empire_battle(TEXT,TEXT,NUMERIC,TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.claim_coin_first_win() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.redeem_real_coupon(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_my_empire_map() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_empire_battle(TEXT,TEXT,NUMERIC,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_coin_first_win() TO authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_real_coupon(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_empire_map() TO authenticated;

INSERT INTO public.function_permissions_baseline (function_name, function_args, allowed_roles, category, note) VALUES
  ('record_empire_battle','_side text, _result text, _pnl numeric, _mode text',ARRAY['authenticated'],'user','P3: record battle + update territory share'),
  ('claim_coin_first_win','',ARRAY['authenticated'],'user','P3: one-time 5k + Real 50% coupon'),
  ('redeem_real_coupon','_code text',ARRAY['authenticated'],'user','P3: redeem real trading coupon'),
  ('get_my_empire_map','',ARRAY['authenticated'],'user','P3: empire map snapshot')
ON CONFLICT (function_name, function_args) DO UPDATE
  SET allowed_roles = EXCLUDED.allowed_roles,
      category = EXCLUDED.category,
      note = EXCLUDED.note,
      updated_at = now();
