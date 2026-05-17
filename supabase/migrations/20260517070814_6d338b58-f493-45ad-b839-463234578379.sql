
-- Gamification Pass 2 — Achievements (corrected)

CREATE TABLE IF NOT EXISTS public.achievement_catalog (
  id text PRIMARY KEY,
  category text NOT NULL CHECK (category IN ('trade','stake','empire','social','daily')),
  tier int NOT NULL CHECK (tier BETWEEN 1 AND 3),
  title text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL DEFAULT '🏆',
  requirement jsonb NOT NULL,
  reward_phon numeric NOT NULL DEFAULT 0,
  parent_id text REFERENCES public.achievement_catalog(id),
  sort int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.achievement_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "achv_catalog read" ON public.achievement_catalog
  FOR SELECT TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.achievement_progress (
  user_id uuid NOT NULL,
  achievement_id text NOT NULL REFERENCES public.achievement_catalog(id),
  progress numeric NOT NULL DEFAULT 0,
  unlocked_at timestamptz,
  claimed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, achievement_id)
);
ALTER TABLE public.achievement_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "achv_progress self read" ON public.achievement_progress
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE INDEX IF NOT EXISTS ix_achv_progress_user ON public.achievement_progress(user_id);
ALTER PUBLICATION supabase_realtime ADD TABLE public.achievement_progress;

CREATE TABLE IF NOT EXISTS public.achievement_audit (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL,
  achievement_id text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('progress','unlocked','claimed')),
  meta jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.achievement_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "achv_audit admin read" ON public.achievement_audit
  FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin'));
CREATE INDEX IF NOT EXISTS ix_achv_audit_user ON public.achievement_audit(user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public._achv_record(
  _uid uuid, _id text, _new_progress numeric, _meta jsonb DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_req numeric; v_progress numeric; v_unlocked timestamptz;
BEGIN
  IF _uid IS NULL OR _id IS NULL THEN RETURN; END IF;
  SELECT COALESCE((requirement->>'target')::numeric, 1) INTO v_req
    FROM public.achievement_catalog WHERE id = _id;
  IF v_req IS NULL THEN RETURN; END IF;

  INSERT INTO public.achievement_progress(user_id, achievement_id, progress, updated_at)
  VALUES (_uid, _id, LEAST(_new_progress, v_req), now())
  ON CONFLICT (user_id, achievement_id) DO UPDATE
    SET progress = GREATEST(public.achievement_progress.progress, EXCLUDED.progress),
        updated_at = now()
  RETURNING progress, unlocked_at INTO v_progress, v_unlocked;

  INSERT INTO public.achievement_audit(user_id, achievement_id, kind, meta)
  VALUES (_uid, _id, 'progress',
          jsonb_build_object('progress', v_progress, 'target', v_req) || COALESCE(_meta,'{}'::jsonb));

  IF v_unlocked IS NULL AND v_progress >= v_req THEN
    UPDATE public.achievement_progress
       SET unlocked_at = now(), updated_at = now()
       WHERE user_id = _uid AND achievement_id = _id AND unlocked_at IS NULL;
    INSERT INTO public.achievement_audit(user_id, achievement_id, kind, meta)
    VALUES (_uid, _id, 'unlocked', COALESCE(_meta,'{}'::jsonb));
    BEGIN
      PERFORM public.enqueue_fomo_notification(_uid, 'achievement_unlocked',
        jsonb_build_object('achievement_id', _id));
    EXCEPTION WHEN OTHERS THEN NULL; END;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public._achv_increment(
  _uid uuid, _id text, _delta numeric DEFAULT 1, _meta jsonb DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_cur numeric;
BEGIN
  SELECT COALESCE(progress,0) INTO v_cur
    FROM public.achievement_progress WHERE user_id=_uid AND achievement_id=_id;
  PERFORM public._achv_record(_uid, _id, COALESCE(v_cur,0) + _delta, _meta);
END $$;

CREATE OR REPLACE FUNCTION public.get_my_achievements()
RETURNS TABLE(
  id text, category text, tier int, title text, description text,
  icon text, target numeric, reward_phon numeric, parent_id text, sort int,
  progress numeric, unlocked_at timestamptz, claimed_at timestamptz
)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT a.id, a.category, a.tier, a.title, a.description, a.icon,
         COALESCE((a.requirement->>'target')::numeric, 1) AS target,
         a.reward_phon, a.parent_id, a.sort,
         COALESCE(p.progress, 0) AS progress, p.unlocked_at, p.claimed_at
  FROM public.achievement_catalog a
  LEFT JOIN public.achievement_progress p
    ON p.achievement_id = a.id AND p.user_id = auth.uid()
  ORDER BY a.category, a.sort, a.tier;
$$;

CREATE OR REPLACE FUNCTION public.claim_achievement(_id text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_reward numeric; v_unlocked timestamptz; v_claimed timestamptz;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;
  SELECT a.reward_phon, p.unlocked_at, p.claimed_at
    INTO v_reward, v_unlocked, v_claimed
  FROM public.achievement_catalog a
  LEFT JOIN public.achievement_progress p
    ON p.achievement_id = a.id AND p.user_id = v_uid
  WHERE a.id = _id;

  IF v_reward IS NULL THEN RAISE EXCEPTION 'achievement_not_found'; END IF;
  IF v_unlocked IS NULL THEN RAISE EXCEPTION 'not_unlocked_yet'; END IF;
  IF v_claimed IS NOT NULL THEN RAISE EXCEPTION 'already_claimed'; END IF;

  UPDATE public.achievement_progress
    SET claimed_at = now(), updated_at = now()
    WHERE user_id = v_uid AND achievement_id = _id AND claimed_at IS NULL;

  IF v_reward > 0 THEN
    INSERT INTO public.phon_transactions(user_id, kind, amount, meta)
    VALUES (v_uid, 'achievement_reward', v_reward,
            jsonb_build_object('achievement_id', _id));
    UPDATE public.phon_balances
       SET balance = balance + v_reward, updated_at = now()
       WHERE user_id = v_uid;
    IF NOT FOUND THEN
      INSERT INTO public.phon_balances(user_id, balance) VALUES (v_uid, v_reward);
    END IF;
  END IF;

  INSERT INTO public.achievement_audit(user_id, achievement_id, kind, meta)
  VALUES (v_uid, _id, 'claimed', jsonb_build_object('reward_phon', v_reward));

  RETURN jsonb_build_object('ok', true, 'reward_phon', v_reward);
END $$;

-- Observer triggers
CREATE OR REPLACE FUNCTION public._achv_on_position_close()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_pnl numeric;
BEGIN
  IF NEW.status = 'closed' AND COALESCE(OLD.status,'') <> 'closed' AND NEW.user_id IS NOT NULL THEN
    PERFORM public._achv_increment(NEW.user_id, 'trade_first', 1);
    PERFORM public._achv_increment(NEW.user_id, 'trade_10', 1);
    PERFORM public._achv_increment(NEW.user_id, 'trade_100', 1);
    PERFORM public._achv_increment(NEW.user_id, 'trade_1000', 1);
    v_pnl := COALESCE(NEW.realized_pnl, 0);
    IF NEW.bet_currency = 'phon' AND v_pnl > 0 THEN
      PERFORM public._achv_increment(NEW.user_id, 'phon_first_win', 1);
      PERFORM public._achv_increment(NEW.user_id, 'phon_profit_100k', v_pnl);
    END IF;
    IF v_pnl > 0 AND COALESCE(NEW.leverage,1) >= 10  THEN PERFORM public._achv_increment(NEW.user_id, 'lev_10x_win',  1); END IF;
    IF v_pnl > 0 AND COALESCE(NEW.leverage,1) >= 50  THEN PERFORM public._achv_increment(NEW.user_id, 'lev_50x_win',  1); END IF;
    IF v_pnl > 0 AND COALESCE(NEW.leverage,1) >= 100 THEN PERFORM public._achv_increment(NEW.user_id, 'lev_100x_win', 1); END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_achv_position_close ON public.live_positions;
CREATE TRIGGER trg_achv_position_close
  AFTER UPDATE ON public.live_positions
  FOR EACH ROW EXECUTE FUNCTION public._achv_on_position_close();

CREATE OR REPLACE FUNCTION public._achv_on_stake_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.user_id IS NOT NULL THEN
    PERFORM public._achv_increment(NEW.user_id, 'stake_first', 1);
    PERFORM public._achv_increment(NEW.user_id, 'stake_1k',   COALESCE(NEW.amount_phon,0));
    PERFORM public._achv_increment(NEW.user_id, 'stake_10k',  COALESCE(NEW.amount_phon,0));
    PERFORM public._achv_increment(NEW.user_id, 'stake_100k', COALESCE(NEW.amount_phon,0));
    PERFORM public._achv_increment(NEW.user_id, 'stake_1m',   COALESCE(NEW.amount_phon,0));
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_achv_stake_insert ON public.phon_stakes;
CREATE TRIGGER trg_achv_stake_insert
  AFTER INSERT ON public.phon_stakes
  FOR EACH ROW EXECUTE FUNCTION public._achv_on_stake_insert();

CREATE OR REPLACE FUNCTION public._achv_on_stake_yield()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid;
BEGIN
  SELECT user_id INTO v_uid FROM public.phon_stakes WHERE id = NEW.stake_id;
  IF v_uid IS NOT NULL THEN
    PERFORM public._achv_increment(v_uid, 'yield_30d', COALESCE(NEW.amount_phon,0));
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_achv_stake_yield ON public.phon_stake_yields;
CREATE TRIGGER trg_achv_stake_yield
  AFTER INSERT ON public.phon_stake_yields
  FOR EACH ROW EXECUTE FUNCTION public._achv_on_stake_yield();

CREATE OR REPLACE FUNCTION public._achv_on_crown()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.user_id IS NOT NULL THEN
    PERFORM public._achv_increment(NEW.user_id, 'crown_10',   1);
    PERFORM public._achv_increment(NEW.user_id, 'crown_100',  1);
    PERFORM public._achv_increment(NEW.user_id, 'crown_1000', 1);
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_achv_crown ON public.crown_events;
CREATE TRIGGER trg_achv_crown
  AFTER INSERT ON public.crown_events
  FOR EACH ROW EXECUTE FUNCTION public._achv_on_crown();

CREATE OR REPLACE FUNCTION public._achv_on_empire_level()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.empire_level IS DISTINCT FROM COALESCE(OLD.empire_level,0) AND NEW.user_id IS NOT NULL THEN
    IF NEW.empire_level >= 3  THEN PERFORM public._achv_record(NEW.user_id, 'empire_lord',    1); END IF;
    IF NEW.empire_level >= 7  THEN PERFORM public._achv_record(NEW.user_id, 'empire_baron',   1); END IF;
    IF NEW.empire_level >= 10 THEN PERFORM public._achv_record(NEW.user_id, 'empire_emperor', 1); END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_achv_empire_level ON public.profiles;
CREATE TRIGGER trg_achv_empire_level
  AFTER UPDATE OF empire_level ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public._achv_on_empire_level();

CREATE OR REPLACE FUNCTION public._achv_on_attendance()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.attendance_streak IS DISTINCT FROM COALESCE(OLD.attendance_streak,0) AND NEW.user_id IS NOT NULL THEN
    PERFORM public._achv_record(NEW.user_id, 'attend_7',   LEAST(NEW.attendance_streak, 7));
    PERFORM public._achv_record(NEW.user_id, 'attend_30',  LEAST(NEW.attendance_streak, 30));
    PERFORM public._achv_record(NEW.user_id, 'attend_100', LEAST(NEW.attendance_streak, 100));
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_achv_attendance ON public.profiles;
CREATE TRIGGER trg_achv_attendance
  AFTER UPDATE OF attendance_streak ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public._achv_on_attendance();

-- Seed 30 achievements
INSERT INTO public.achievement_catalog(id, category, tier, title, description, icon, requirement, reward_phon, parent_id, sort) VALUES
('trade_first',     'trade', 1, '첫 거래의 발자국',     '폐하의 첫 거래를 마쳤습니다',                '🎯', '{"target":1}',     100, NULL,          10),
('trade_10',        'trade', 1, '거래 10회',          '10번의 거래를 완수했습니다',                  '📈', '{"target":10}',    500, 'trade_first', 11),
('trade_100',       'trade', 2, '거래 100회',         '100번의 거래로 시장을 익혔습니다',             '📊', '{"target":100}',  3000, 'trade_10',    12),
('trade_1000',      'trade', 3, '거래 1000회 — 거장', '1000번의 거래, 거장의 반열에 올랐습니다',      '🏛️', '{"target":1000}',25000, 'trade_100',   13),
('phon_first_win',  'trade', 1, 'PHON 첫 승리',        'PHON으로 첫 수익을 거뒀습니다',               '💎', '{"target":1}',     300, NULL,          20),
('phon_profit_100k','trade', 2, 'PHON 수익 10만',     'PHON 베팅으로 누적 10만 PHON 수익 달성',       '💰', '{"target":100000}',5000, 'phon_first_win',21),
('lev_10x_win',     'trade', 1, '10배 레버리지 승리',  '10배 레버리지로 첫 승을 거뒀습니다',           '⚡', '{"target":1}',     500, NULL,          30),
('lev_50x_win',     'trade', 2, '50배 레버리지 승리',  '50배 레버리지의 짜릿함을 정복',                '🔥', '{"target":1}',    2000, 'lev_10x_win', 31),
('lev_100x_win',    'trade', 3, '100배 레버리지 승리', '100배의 신화 — 폐하만의 영역',                '💥', '{"target":1}',   10000, 'lev_50x_win', 32),

('stake_first', 'stake', 1, '첫 스테이크',          'PHON 스테이킹을 시작했습니다',                '🌱', '{"target":1}',       100, NULL,          10),
('stake_1k',    'stake', 1, '스테이커 1K',         '1,000 PHON을 스테이킹했습니다',                '🌿', '{"target":1000}',    300, 'stake_first', 11),
('stake_10k',   'stake', 2, '스테이커 10K',        '10,000 PHON을 스테이킹했습니다',               '🌳', '{"target":10000}',  1500, 'stake_1k',    12),
('stake_100k',  'stake', 2, '스테이커 100K',       '100,000 PHON을 스테이킹했습니다',              '🏯', '{"target":100000}', 7500, 'stake_10k',   13),
('stake_1m',    'stake', 3, '대지주 — 1M',         '1,000,000 PHON을 스테이킹한 대지주',           '🏰', '{"target":1000000}',50000,'stake_100k', 14),
('yield_30d',   'stake', 2, '30일의 결실',          '스테이킹 배당을 누적 30,000 PHON 받았습니다',  '🍯', '{"target":30000}',  3000, NULL,          20),

('empire_lord',    'empire', 1, 'Lord 등극',          '제국 Lv 3 Lord에 도달했습니다',                '🛡️', '{"target":1}',  500, NULL,           10),
('empire_baron',   'empire', 2, 'Baron 등극',         '제국 Lv 7 Baron에 도달했습니다',                '👑', '{"target":1}', 5000, 'empire_lord',  11),
('empire_emperor', 'empire', 3, 'Emperor 등극',       '제국 Lv 10 Emperor — 최고의 자리',              '🏆', '{"target":1}',50000, 'empire_baron', 12),
('crown_10',       'empire', 1, 'Crown 10회',         'Crown 폭발을 10번 경험했습니다',                '⭐', '{"target":10}',  300, NULL,           20),
('crown_100',      'empire', 2, 'Crown 100회',        'Crown 폭발을 100번 경험했습니다',               '🌟', '{"target":100}',3000, 'crown_10',     21),
('crown_1000',     'empire', 3, 'Crown 1000회',       'Crown 폭발 1000번 — 전설의 영역',               '💫', '{"target":1000}',30000,'crown_100',   22),
('founding_seat',  'empire', 2, '창립 좌석 차지',     'Founding Season 좌석을 차지했습니다',           '🪑', '{"target":1}', 5000, NULL,           30),
('vip_30d',        'empire', 2, 'VIP 30일',           'VIP Empire Pass를 30일 유지했습니다',           '💼', '{"target":30}',5000, NULL,           40),

('invite_first', 'social', 1, '첫 친구 초대',       '친구 1명을 PHONARA로 초대했습니다',             '🤝', '{"target":1}',   500, NULL,           10),
('invite_10',    'social', 2, '친구 10명 초대',     '친구 10명을 PHONARA로 초대했습니다',            '🫂', '{"target":10}', 5000, 'invite_first', 11),
('guild_join',   'social', 1, '첫 길드 가입',       '길드에 합류했습니다',                            '🏴', '{"target":1}',   300, NULL,           20),
('guild_win',    'social', 3, '길드 주간 1위',      '길드 주간 정산에서 1위를 차지했습니다',         '🏅', '{"target":1}', 25000, 'guild_join',   21),

('attend_7',     'daily', 1, '출석 7일',         '연속 7일 출석했습니다',                           '📅', '{"target":7}',     300, NULL,        10),
('attend_30',    'daily', 2, '출석 30일',        '연속 30일 출석 — 진정한 충성',                    '🗓️', '{"target":30}',  3000, 'attend_7',  11),
('attend_100',   'daily', 3, '출석 100일',       '연속 100일 — 폐하의 일상이 되었습니다',          '📜', '{"target":100}',30000, 'attend_30', 12),
('daily_bet_30', 'daily', 2, '30일 매일 베팅',   '30일 동안 매일 1회 이상 베팅했습니다',           '🎲', '{"target":30}',  3000, NULL,        20)
ON CONFLICT (id) DO UPDATE SET
  title=EXCLUDED.title, description=EXCLUDED.description, icon=EXCLUDED.icon,
  requirement=EXCLUDED.requirement, reward_phon=EXCLUDED.reward_phon,
  parent_id=EXCLUDED.parent_id, sort=EXCLUDED.sort;

-- Permission baseline (column is `note`; UNIQUE is (function_name, function_args))
INSERT INTO public.function_permissions_baseline(function_name, function_args, allowed_roles, category, note)
VALUES
  ('get_my_achievements', '', ARRAY['authenticated'], 'gamification', 'Pass 2 — own progress'),
  ('claim_achievement',   '_id text', ARRAY['authenticated'], 'gamification', 'Pass 2 — claim reward')
ON CONFLICT (function_name, function_args) DO UPDATE SET
  allowed_roles=EXCLUDED.allowed_roles, category=EXCLUDED.category, note=EXCLUDED.note;
