
-- ============================================================
-- Gamification Pass 1: PHON Level + Daily Chest
-- ============================================================

-- 1. PHON Levels
CREATE TABLE IF NOT EXISTS public.phon_levels (
  user_id uuid PRIMARY KEY,
  level integer NOT NULL DEFAULT 1,
  xp bigint NOT NULL DEFAULT 0,
  total_xp bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.phon_levels ENABLE ROW LEVEL SECURITY;
CREATE POLICY pl_self_select ON public.phon_levels FOR SELECT
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE IF NOT EXISTS public.phon_level_events (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL,
  kind text NOT NULL,
  xp_delta bigint NOT NULL,
  source_ref text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ple_user_idx ON public.phon_level_events(user_id, created_at DESC);
ALTER TABLE public.phon_level_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY ple_self_select ON public.phon_level_events FOR SELECT
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE IF NOT EXISTS public.phon_level_rewards_claimed (
  user_id uuid NOT NULL,
  level integer NOT NULL,
  phon_bonus bigint NOT NULL DEFAULT 0,
  booster_granted boolean NOT NULL DEFAULT false,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, level)
);
ALTER TABLE public.phon_level_rewards_claimed ENABLE ROW LEVEL SECURITY;
CREATE POLICY plrc_self_select ON public.phon_level_rewards_claimed FOR SELECT
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

-- XP curve: xp_to_next(N) = floor(100 * 1.15^(N-1)), capped at level 100
CREATE OR REPLACE FUNCTION public.phon_xp_to_next(_level integer)
RETURNS bigint LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN _level >= 100 THEN 0
              ELSE GREATEST(100, floor(100 * power(1.15, GREATEST(_level,1) - 1))::bigint)
         END;
$$;

-- Internal: grant XP, handle level-ups (bonus + booster every 10 levels)
CREATE OR REPLACE FUNCTION public.grant_phon_xp(_user_id uuid, _kind text, _xp bigint, _source_ref text DEFAULT NULL)
RETURNS TABLE(new_level integer, new_xp bigint, leveled_up boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_level integer; v_xp bigint; v_total bigint;
  v_needed bigint; v_leveled boolean := false;
  v_bonus bigint;
BEGIN
  IF _user_id IS NULL OR _xp IS NULL OR _xp <= 0 THEN
    RETURN QUERY SELECT 1, 0::bigint, false; RETURN;
  END IF;

  INSERT INTO public.phon_levels(user_id) VALUES (_user_id) ON CONFLICT (user_id) DO NOTHING;
  SELECT level, xp, total_xp INTO v_level, v_xp, v_total
    FROM public.phon_levels WHERE user_id = _user_id FOR UPDATE;

  v_xp := v_xp + _xp;
  v_total := v_total + _xp;

  LOOP
    v_needed := public.phon_xp_to_next(v_level);
    EXIT WHEN v_level >= 100 OR v_xp < v_needed;
    v_xp := v_xp - v_needed;
    v_level := v_level + 1;
    v_leveled := true;

    -- Level-up reward: 1000 * level PHON (idempotent via unique key)
    v_bonus := 1000::bigint * v_level;
    INSERT INTO public.phon_level_rewards_claimed(user_id, level, phon_bonus, booster_granted)
    VALUES (_user_id, v_level, v_bonus, (v_level % 10 = 0))
    ON CONFLICT (user_id, level) DO NOTHING;

    IF FOUND THEN
      -- Credit PHON
      INSERT INTO public.phon_balances(user_id, balance) VALUES (_user_id, v_bonus)
      ON CONFLICT (user_id) DO UPDATE SET balance = phon_balances.balance + EXCLUDED.balance, updated_at = now();

      -- Every 10 levels: 24h Empire Booster
      IF v_level % 10 = 0 THEN
        INSERT INTO public.empire_boosters(user_id, kind, fee_discount, crown_multiplier, leverage, expires_at, source)
        VALUES (_user_id, 'phon_level_24h', 0.20, 1.3, 5.0, now() + interval '24 hours', 'phon_level_' || v_level::text);
      END IF;

      -- Notify
      PERFORM public.enqueue_fomo_notification(
        _user_id, 'level_up',
        '폐하의 위엄이 한 단계 더 깊어졌습니다',
        'PHON 레벨 ' || v_level::text || ' 달성 · 보너스 ' || v_bonus::text || ' PHON 지급',
        '확인', '/profile',
        jsonb_build_object('level', v_level, 'bonus', v_bonus),
        4::smallint,
        'phon_level_' || _user_id::text || '_' || v_level::text,
        168
      );
    END IF;
  END LOOP;

  IF v_level >= 100 THEN v_xp := 0; END IF;

  UPDATE public.phon_levels
    SET level = v_level, xp = v_xp, total_xp = v_total, updated_at = now()
    WHERE user_id = _user_id;

  INSERT INTO public.phon_level_events(user_id, kind, xp_delta, source_ref)
    VALUES (_user_id, _kind, _xp, _source_ref);

  RETURN QUERY SELECT v_level, v_xp, v_leveled;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.grant_phon_xp(uuid, text, bigint, text) FROM PUBLIC, anon, authenticated;

-- Public read for self
CREATE OR REPLACE FUNCTION public.get_my_phon_level()
RETURNS TABLE(level integer, xp bigint, xp_to_next bigint, total_xp bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;
  INSERT INTO public.phon_levels(user_id) VALUES (v_uid) ON CONFLICT (user_id) DO NOTHING;
  RETURN QUERY
  SELECT pl.level, pl.xp, public.phon_xp_to_next(pl.level), pl.total_xp
    FROM public.phon_levels pl WHERE pl.user_id = v_uid;
END;
$$;

-- Idempotent re-claim (safety net)
CREATE OR REPLACE FUNCTION public.claim_phon_level_reward(_level integer)
RETURNS TABLE(granted boolean, phon_bonus bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_cur integer; v_bonus bigint;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;
  SELECT level INTO v_cur FROM public.phon_levels WHERE user_id = v_uid;
  IF COALESCE(v_cur,1) < _level THEN
    RETURN QUERY SELECT false, 0::bigint; RETURN;
  END IF;
  v_bonus := 1000::bigint * _level;
  INSERT INTO public.phon_level_rewards_claimed(user_id, level, phon_bonus)
    VALUES (v_uid, _level, v_bonus)
    ON CONFLICT (user_id, level) DO NOTHING;
  IF FOUND THEN
    INSERT INTO public.phon_balances(user_id, balance) VALUES (v_uid, v_bonus)
    ON CONFLICT (user_id) DO UPDATE SET balance = phon_balances.balance + EXCLUDED.balance, updated_at = now();
    RETURN QUERY SELECT true, v_bonus;
  ELSE
    RETURN QUERY SELECT false, 0::bigint;
  END IF;
END;
$$;

-- Triggers: achievement unlock -> XP
CREATE OR REPLACE FUNCTION public.trg_ua_grant_xp()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _ap integer;
BEGIN
  SELECT ap INTO _ap FROM public.achievements_catalog WHERE key = NEW.achievement_key;
  IF COALESCE(_ap,0) > 0 THEN
    PERFORM public.grant_phon_xp(NEW.user_id, 'achievement', (_ap * 10)::bigint, NEW.achievement_key);
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_ua_grant_xp ON public.user_achievements;
CREATE TRIGGER trg_ua_grant_xp AFTER INSERT ON public.user_achievements
  FOR EACH ROW EXECUTE FUNCTION public.trg_ua_grant_xp();

-- Trigger: streak milestone -> XP
CREATE OR REPLACE FUNCTION public.trg_sm_grant_xp()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.grant_phon_xp(NEW.user_id, 'streak', (NEW.streak_len * 50)::bigint, 'streak_' || NEW.streak_len::text);
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_sm_grant_xp ON public.streak_milestones;
CREATE TRIGGER trg_sm_grant_xp AFTER INSERT ON public.streak_milestones
  FOR EACH ROW EXECUTE FUNCTION public.trg_sm_grant_xp();

-- ============================================================
-- 2. Daily Chest
-- ============================================================
CREATE TABLE IF NOT EXISTS public.daily_chest_opens (
  user_id uuid NOT NULL,
  opened_date date NOT NULL DEFAULT CURRENT_DATE,
  streak_day integer NOT NULL,
  tier text NOT NULL,
  phon_reward bigint NOT NULL DEFAULT 0,
  xp_reward bigint NOT NULL DEFAULT 0,
  booster_hours integer NOT NULL DEFAULT 0,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  opened_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, opened_date)
);
CREATE INDEX IF NOT EXISTS dco_user_idx ON public.daily_chest_opens(user_id, opened_at DESC);
ALTER TABLE public.daily_chest_opens ENABLE ROW LEVEL SECURITY;
CREATE POLICY dco_self_select ON public.daily_chest_opens FOR SELECT
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

-- Determine chest tier from streak day
CREATE OR REPLACE FUNCTION public.chest_tier_for_streak(_streak integer)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN _streak >= 14 THEN 'legendary'
    WHEN _streak >= 7  THEN 'gold'
    WHEN _streak >= 3  THEN 'silver'
    ELSE 'bronze'
  END;
$$;

CREATE OR REPLACE FUNCTION public.get_daily_chest_state()
RETURNS TABLE(can_open boolean, streak_day integer, tier_preview text, last_opened_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_streak integer; v_last timestamptz; v_today_opened boolean;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;
  SELECT COALESCE(attendance_streak,0) INTO v_streak FROM public.profiles WHERE id = v_uid;
  SELECT opened_at INTO v_last FROM public.daily_chest_opens
    WHERE user_id = v_uid ORDER BY opened_at DESC LIMIT 1;
  v_today_opened := EXISTS(SELECT 1 FROM public.daily_chest_opens
    WHERE user_id = v_uid AND opened_date = CURRENT_DATE);
  RETURN QUERY SELECT (NOT v_today_opened), COALESCE(v_streak,0),
    public.chest_tier_for_streak(COALESCE(v_streak,0)), v_last;
END;
$$;

CREATE OR REPLACE FUNCTION public.open_daily_chest()
RETURNS TABLE(tier text, phon_reward bigint, xp_reward bigint, booster_hours integer, payload jsonb)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_streak integer; v_tier text;
  v_phon bigint := 0; v_xp bigint := 0; v_boost integer := 0;
  v_rand numeric;
  v_payload jsonb := '{}'::jsonb;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;

  IF EXISTS(SELECT 1 FROM public.daily_chest_opens WHERE user_id = v_uid AND opened_date = CURRENT_DATE) THEN
    RAISE EXCEPTION 'chest_already_opened_today';
  END IF;

  SELECT COALESCE(attendance_streak,0) INTO v_streak FROM public.profiles WHERE id = v_uid;
  v_tier := public.chest_tier_for_streak(v_streak);
  v_rand := random();

  IF v_tier = 'bronze' THEN
    v_phon := 500 + floor(v_rand * 1500)::bigint;  -- 500~2000
    v_xp := 50;
  ELSIF v_tier = 'silver' THEN
    v_phon := 2000 + floor(v_rand * 4000)::bigint; -- 2000~6000
    v_xp := 150;
  ELSIF v_tier = 'gold' THEN
    v_phon := 6000 + floor(v_rand * 9000)::bigint;  -- 6000~15000
    v_xp := 400;
    v_boost := 6;
  ELSE -- legendary
    v_phon := 15000 + floor(v_rand * 35000)::bigint; -- 15000~50000
    v_xp := 1000;
    v_boost := 24;
  END IF;

  v_payload := jsonb_build_object('roll', v_rand, 'streak_day', v_streak);

  INSERT INTO public.daily_chest_opens(user_id, opened_date, streak_day, tier, phon_reward, xp_reward, booster_hours, payload)
  VALUES (v_uid, CURRENT_DATE, v_streak, v_tier, v_phon, v_xp, v_boost, v_payload);

  -- Credit PHON
  INSERT INTO public.phon_balances(user_id, balance) VALUES (v_uid, v_phon)
  ON CONFLICT (user_id) DO UPDATE SET balance = phon_balances.balance + EXCLUDED.balance, updated_at = now();

  -- XP
  PERFORM public.grant_phon_xp(v_uid, 'daily_chest_' || v_tier, v_xp, CURRENT_DATE::text);

  -- Booster
  IF v_boost > 0 THEN
    INSERT INTO public.empire_boosters(user_id, kind, fee_discount, crown_multiplier, leverage, expires_at, source)
    VALUES (v_uid, 'daily_chest_' || v_tier,
      CASE WHEN v_tier='legendary' THEN 0.25 ELSE 0.10 END,
      CASE WHEN v_tier='legendary' THEN 1.5  ELSE 1.2 END,
      CASE WHEN v_tier='legendary' THEN 5.0  ELSE 3.0 END,
      now() + (v_boost::text || ' hours')::interval,
      'daily_chest_' || CURRENT_DATE::text);
  END IF;

  -- Legendary FOMO notification
  IF v_tier = 'legendary' THEN
    PERFORM public.enqueue_fomo_notification(
      v_uid, 'chest_legendary',
      '전설의 보물상자가 폐하 앞에 놓였습니다',
      v_phon::text || ' PHON + 24시간 Empire Booster 획득',
      '확인', '/dashboard',
      v_payload, 3::smallint,
      'chest_leg_' || v_uid::text || '_' || CURRENT_DATE::text, 72
    );
  END IF;

  RETURN QUERY SELECT v_tier, v_phon, v_xp, v_boost, v_payload;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_phon_level() TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_phon_level_reward(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_daily_chest_state() TO authenticated;
GRANT EXECUTE ON FUNCTION public.open_daily_chest() TO authenticated;
