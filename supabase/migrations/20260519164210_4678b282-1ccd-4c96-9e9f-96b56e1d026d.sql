-- ApexForge: 신규 6 테이블 + 3 RPC

-- 1. free_missions 카탈로그
CREATE TABLE public.free_missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  title_ko text NOT NULL,
  description_ko text,
  reward_phon numeric NOT NULL DEFAULT 0 CHECK (reward_phon >= 0),
  daily_cap integer NOT NULL DEFAULT 1 CHECK (daily_cap > 0),
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.free_missions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "free_missions readable by anyone"
  ON public.free_missions FOR SELECT
  USING (active = true);

CREATE POLICY "free_missions admin write"
  ON public.free_missions FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2. free_mission_claims
CREATE TABLE public.free_mission_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  mission_code text NOT NULL,
  claim_date date NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Seoul')::date,
  reward_phon numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, mission_code, claim_date)
);

ALTER TABLE public.free_mission_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "free_mission_claims self read"
  ON public.free_mission_claims FOR SELECT
  USING (auth.uid() = user_id);

CREATE INDEX idx_fmc_user_date ON public.free_mission_claims(user_id, claim_date DESC);

-- 3. daily_vault_state
CREATE TABLE public.daily_vault_state (
  user_id uuid PRIMARY KEY,
  last_claim_date date,
  streak integer NOT NULL DEFAULT 0,
  pity_counter integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.daily_vault_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "daily_vault_state self read"
  ON public.daily_vault_state FOR SELECT
  USING (auth.uid() = user_id);

-- 4. daily_vault_claims
CREATE TABLE public.daily_vault_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  claim_date date NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Seoul')::date,
  reward_phon numeric NOT NULL,
  rarity text NOT NULL CHECK (rarity IN ('common','rare','epic','legendary','mythic')),
  streak_at_claim integer NOT NULL DEFAULT 0,
  was_pity boolean NOT NULL DEFAULT false,
  UNIQUE (user_id, claim_date)
);

ALTER TABLE public.daily_vault_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "daily_vault_claims self read"
  ON public.daily_vault_claims FOR SELECT
  USING (auth.uid() = user_id);

CREATE INDEX idx_dvc_user_date ON public.daily_vault_claims(user_id, claim_date DESC);

-- 5. mock_lootbox_opens
CREATE TABLE public.mock_lootbox_opens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tier text NOT NULL CHECK (tier IN ('basic','premium','ultimate')),
  result_json jsonb NOT NULL,
  reward_phon numeric NOT NULL DEFAULT 0,
  opened_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.mock_lootbox_opens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mock_lootbox_opens self read"
  ON public.mock_lootbox_opens FOR SELECT
  USING (auth.uid() = user_id);

CREATE INDEX idx_mlo_user ON public.mock_lootbox_opens(user_id, opened_at DESC);

-- 6. sports_mock_events
CREATE TABLE public.sports_mock_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sport text NOT NULL,
  league text,
  home text NOT NULL,
  away text NOT NULL,
  starts_at timestamptz NOT NULL,
  odds_json jsonb NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sports_mock_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sports_mock_events readable"
  ON public.sports_mock_events FOR SELECT
  USING (active = true);

CREATE POLICY "sports_mock_events admin write"
  ON public.sports_mock_events FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed missions
INSERT INTO public.free_missions (code, title_ko, description_ko, reward_phon, daily_cap, sort_order) VALUES
  ('checkin',       '오늘의 출석 체크',         '하루 한 번 출석만 해도 PHON 적립',         200, 1, 10),
  ('kakao_share',   '카카오톡 공유',           '친구에게 ApexForge 공유하기',              300, 1, 20),
  ('naver_share',   '네이버 블로그 공유',       '블로그/카페에 후기 공유',                  300, 1, 30),
  ('tiktok_upload', 'TikTok 업로드',          '플레이 영상 1개 업로드',                   500, 1, 40),
  ('refer_friend',  '친구 초대',              '추천 코드로 친구 1명 가입',                 800, 1, 50),
  ('watch_ad',      '광고 시청 (mock)',       '15초 시청 시 즉시 지급',                   150, 3, 60),
  ('survey',        '간단 설문 (mock)',       '5문항 답변',                              250, 1, 70);

-- Seed sportsbook
INSERT INTO public.sports_mock_events (sport, league, home, away, starts_at, odds_json) VALUES
  ('soccer',     'EPL',  'Arsenal',     'Chelsea',      now() + interval '3 hour',  '{"home":2.10,"draw":3.40,"away":3.20}'::jsonb),
  ('soccer',     'KBO',  '두산',         'LG',           now() + interval '5 hour',  '{"home":1.85,"draw":3.60,"away":3.90}'::jsonb),
  ('basketball', 'NBA',  'Lakers',      'Celtics',      now() + interval '8 hour',  '{"home":1.95,"away":1.95}'::jsonb),
  ('esports',    'LCK',  'T1',          'Gen.G',        now() + interval '2 hour',  '{"home":1.65,"away":2.25}'::jsonb),
  ('mma',        'UFC',  'Fighter A',   'Fighter B',    now() + interval '1 day',   '{"home":1.55,"away":2.45}'::jsonb);

-- RPC: claim_free_mission
CREATE OR REPLACE FUNCTION public.claim_free_mission(_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _today date := (now() AT TIME ZONE 'Asia/Seoul')::date;
  _mission public.free_missions%ROWTYPE;
  _count int;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO _mission FROM public.free_missions WHERE code = _code AND active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'mission_not_found' USING ERRCODE = 'P0002';
  END IF;

  SELECT count(*) INTO _count
  FROM public.free_mission_claims
  WHERE user_id = _uid AND mission_code = _code AND claim_date = _today;

  IF _count >= _mission.daily_cap THEN
    RAISE EXCEPTION 'daily_cap_reached' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.free_mission_claims (user_id, mission_code, claim_date, reward_phon)
  VALUES (_uid, _code, _today, _mission.reward_phon);

  UPDATE public.phon_balances
     SET balance = balance + _mission.reward_phon,
         updated_at = now()
   WHERE user_id = _uid;

  IF NOT FOUND THEN
    INSERT INTO public.phon_balances (user_id, balance) VALUES (_uid, _mission.reward_phon);
  END IF;

  RETURN jsonb_build_object('ok', true, 'reward_phon', _mission.reward_phon, 'code', _code);
END;
$$;

REVOKE ALL ON FUNCTION public.claim_free_mission(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_free_mission(text) TO authenticated;

-- RPC: claim_daily_vault
CREATE OR REPLACE FUNCTION public.claim_daily_vault()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _today date := (now() AT TIME ZONE 'Asia/Seoul')::date;
  _state public.daily_vault_state%ROWTYPE;
  _new_streak int;
  _new_pity int;
  _reward numeric;
  _rarity text;
  _was_pity boolean := false;
  _r numeric;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO _state FROM public.daily_vault_state WHERE user_id = _uid FOR UPDATE;

  IF FOUND AND _state.last_claim_date = _today THEN
    RAISE EXCEPTION 'already_claimed_today' USING ERRCODE = 'P0001';
  END IF;

  IF FOUND AND _state.last_claim_date = _today - 1 THEN
    _new_streak := _state.streak + 1;
  ELSE
    _new_streak := 1;
  END IF;

  _new_pity := COALESCE(_state.pity_counter, 0) + 1;
  _r := random();

  -- Pity at 7 forces at least epic
  IF _new_pity >= 7 THEN
    _was_pity := true;
    IF _r < 0.5 THEN _rarity := 'epic'; _reward := 1500;
    ELSIF _r < 0.85 THEN _rarity := 'legendary'; _reward := 4000;
    ELSE _rarity := 'mythic'; _reward := 12000;
    END IF;
    _new_pity := 0;
  ELSE
    IF _r < 0.55 THEN _rarity := 'common'; _reward := 250;
    ELSIF _r < 0.85 THEN _rarity := 'rare'; _reward := 600;
    ELSIF _r < 0.97 THEN _rarity := 'epic'; _reward := 1500; _new_pity := 0;
    ELSIF _r < 0.998 THEN _rarity := 'legendary'; _reward := 4000; _new_pity := 0;
    ELSE _rarity := 'mythic'; _reward := 12000; _new_pity := 0;
    END IF;
  END IF;

  -- Streak bonus: +5% per streak day, cap 100%
  _reward := _reward * (1 + LEAST(_new_streak, 20) * 0.05);

  INSERT INTO public.daily_vault_state (user_id, last_claim_date, streak, pity_counter, updated_at)
  VALUES (_uid, _today, _new_streak, _new_pity, now())
  ON CONFLICT (user_id) DO UPDATE
    SET last_claim_date = EXCLUDED.last_claim_date,
        streak = EXCLUDED.streak,
        pity_counter = EXCLUDED.pity_counter,
        updated_at = now();

  INSERT INTO public.daily_vault_claims (user_id, reward_phon, rarity, streak_at_claim, was_pity)
  VALUES (_uid, _reward, _rarity, _new_streak, _was_pity);

  UPDATE public.phon_balances
     SET balance = balance + _reward, updated_at = now()
   WHERE user_id = _uid;
  IF NOT FOUND THEN
    INSERT INTO public.phon_balances (user_id, balance) VALUES (_uid, _reward);
  END IF;

  RETURN jsonb_build_object('ok', true, 'reward_phon', _reward, 'rarity', _rarity, 'streak', _new_streak, 'pity', _was_pity);
END;
$$;

REVOKE ALL ON FUNCTION public.claim_daily_vault() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_daily_vault() TO authenticated;

-- RPC: open_mock_lootbox
CREATE OR REPLACE FUNCTION public.open_mock_lootbox(_tier text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _cost numeric;
  _reward numeric;
  _rarity text;
  _r numeric := random();
  _today_count int;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  IF _tier NOT IN ('basic','premium','ultimate') THEN
    RAISE EXCEPTION 'invalid_tier';
  END IF;

  -- Daily cap: 10 opens per user per day total
  SELECT count(*) INTO _today_count
  FROM public.mock_lootbox_opens
  WHERE user_id = _uid AND opened_at > now() - interval '1 day';
  IF _today_count >= 10 THEN
    RAISE EXCEPTION 'daily_cap_reached' USING ERRCODE = 'P0001';
  END IF;

  _cost := CASE _tier WHEN 'basic' THEN 500 WHEN 'premium' THEN 2000 ELSE 8000 END;

  -- Deduct cost (must have balance)
  UPDATE public.phon_balances
     SET balance = balance - _cost, updated_at = now()
   WHERE user_id = _uid AND balance >= _cost;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'insufficient_balance' USING ERRCODE = 'P0001';
  END IF;

  -- Rarity roll per tier
  IF _tier = 'basic' THEN
    IF _r < 0.70 THEN _rarity := 'common'; _reward := _cost * 0.6;
    ELSIF _r < 0.95 THEN _rarity := 'rare'; _reward := _cost * 1.5;
    ELSIF _r < 0.995 THEN _rarity := 'epic'; _reward := _cost * 5;
    ELSE _rarity := 'legendary'; _reward := _cost * 20;
    END IF;
  ELSIF _tier = 'premium' THEN
    IF _r < 0.50 THEN _rarity := 'common'; _reward := _cost * 0.7;
    ELSIF _r < 0.85 THEN _rarity := 'rare'; _reward := _cost * 1.4;
    ELSIF _r < 0.98 THEN _rarity := 'epic'; _reward := _cost * 4;
    ELSIF _r < 0.998 THEN _rarity := 'legendary'; _reward := _cost * 15;
    ELSE _rarity := 'mythic'; _reward := _cost * 50;
    END IF;
  ELSE -- ultimate
    IF _r < 0.30 THEN _rarity := 'rare'; _reward := _cost * 1.2;
    ELSIF _r < 0.80 THEN _rarity := 'epic'; _reward := _cost * 2.5;
    ELSIF _r < 0.97 THEN _rarity := 'legendary'; _reward := _cost * 8;
    ELSE _rarity := 'mythic'; _reward := _cost * 30;
    END IF;
  END IF;

  INSERT INTO public.mock_lootbox_opens (user_id, tier, result_json, reward_phon)
  VALUES (_uid, _tier, jsonb_build_object('rarity', _rarity, 'cost', _cost, 'reward', _reward), _reward);

  UPDATE public.phon_balances SET balance = balance + _reward, updated_at = now() WHERE user_id = _uid;

  RETURN jsonb_build_object('ok', true, 'tier', _tier, 'rarity', _rarity, 'cost', _cost, 'reward_phon', _reward, 'net_phon', _reward - _cost);
END;
$$;

REVOKE ALL ON FUNCTION public.open_mock_lootbox(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.open_mock_lootbox(text) TO authenticated;