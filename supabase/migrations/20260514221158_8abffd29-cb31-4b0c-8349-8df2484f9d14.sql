-- ============ STORY ENGINE ============
CREATE TABLE IF NOT EXISTS public.imperial_stories (
  id BIGSERIAL PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('new_emperor','jackpot','baron_promotion','galaxy_seat','founding_seat','crown_war_finale')),
  headline TEXT NOT NULL,
  subline TEXT,
  hero_user_id UUID,
  hero_nickname TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  pin_until TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  dedupe_key TEXT UNIQUE
);
CREATE INDEX IF NOT EXISTS idx_imperial_stories_recent ON public.imperial_stories (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_imperial_stories_expires ON public.imperial_stories (expires_at);
ALTER TABLE public.imperial_stories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stories_public_read" ON public.imperial_stories FOR SELECT USING (expires_at > now());

CREATE OR REPLACE FUNCTION public.enqueue_imperial_story(
  _kind TEXT, _headline TEXT, _subline TEXT,
  _hero_user UUID, _hero_nick TEXT, _payload JSONB DEFAULT '{}'::jsonb,
  _dedupe TEXT DEFAULT NULL, _ttl_hours INT DEFAULT 168
) RETURNS BIGINT LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _id BIGINT;
BEGIN
  INSERT INTO imperial_stories (kind, headline, subline, hero_user_id, hero_nickname, payload, dedupe_key, expires_at)
  VALUES (_kind, _headline, _subline, _hero_user, _hero_nick, COALESCE(_payload,'{}'::jsonb), _dedupe, now() + (_ttl_hours||' hours')::interval)
  ON CONFLICT (dedupe_key) DO NOTHING
  RETURNING id INTO _id;
  RETURN _id;
END $$;
REVOKE ALL ON FUNCTION public.enqueue_imperial_story(TEXT,TEXT,TEXT,UUID,TEXT,JSONB,TEXT,INT) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.get_imperial_stories(_limit INT DEFAULT 20)
RETURNS TABLE(id BIGINT, kind TEXT, headline TEXT, subline TEXT, hero_nickname TEXT, payload JSONB, created_at TIMESTAMPTZ)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT id, kind, headline, subline, hero_nickname, payload, created_at
  FROM imperial_stories
  WHERE expires_at > now()
  ORDER BY COALESCE(pin_until, created_at) DESC, created_at DESC
  LIMIT GREATEST(1, LEAST(50, _limit));
$$;
GRANT EXECUTE ON FUNCTION public.get_imperial_stories(INT) TO authenticated, anon;

CREATE OR REPLACE FUNCTION public.trg_atelier_jackpot_story() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _nick TEXT;
BEGIN
  IF NEW.outcome = 'jackpot' THEN
    SELECT nickname INTO _nick FROM profiles WHERE id = NEW.user_id;
    PERFORM enqueue_imperial_story(
      'jackpot',
      '💎 JACKPOT 폭발! ' || COALESCE(_nick,'익명 황제') || ' 합성 대박',
      '+10%p 부스트 보너스 NFT 획득',
      NEW.user_id, _nick,
      jsonb_build_object('nft_level', NEW.target_level, 'cost', NEW.cost_phon),
      'jackpot:'||NEW.id::text, 168
    );
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS atelier_jackpot_story ON public.atelier_runs;
CREATE TRIGGER atelier_jackpot_story AFTER INSERT ON public.atelier_runs
FOR EACH ROW EXECUTE FUNCTION public.trg_atelier_jackpot_story();

CREATE OR REPLACE FUNCTION public.trg_baron_promotion_story() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _nick TEXT; _emoji TEXT;
BEGIN
  IF NEW.empire_level IS NOT NULL AND COALESCE(OLD.empire_level,0) < NEW.empire_level AND NEW.empire_level >= 7 THEN
    SELECT nickname INTO _nick FROM profiles WHERE id = NEW.id;
    _emoji := CASE NEW.empire_level WHEN 7 THEN '🏰' WHEN 8 THEN '⚔️' WHEN 9 THEN '👑' WHEN 10 THEN '🌌' ELSE '⭐' END;
    PERFORM enqueue_imperial_story(
      'baron_promotion',
      _emoji||' '||COALESCE(_nick,'익명 황제')||' Tier '||NEW.empire_level||' 등극',
      '24h Empire Booster 자동 발급',
      NEW.id, _nick,
      jsonb_build_object('level', NEW.empire_level),
      'baron:'||NEW.id::text||':'||NEW.empire_level::text, 168
    );
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS baron_promotion_story ON public.profiles;
CREATE TRIGGER baron_promotion_story AFTER UPDATE OF empire_level ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.trg_baron_promotion_story();

-- ============ GALAXY 100-SEAT AUCTION ============
CREATE TABLE IF NOT EXISTS public.galaxy_seats (
  seat_no INT PRIMARY KEY CHECK (seat_no BETWEEN 1 AND 100),
  holder_user_id UUID,
  holder_nickname TEXT,
  current_bid NUMERIC(20,2) NOT NULL DEFAULT 100,
  bid_count INT NOT NULL DEFAULT 0,
  last_bid_at TIMESTAMPTZ,
  booster_expires_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO public.galaxy_seats (seat_no, current_bid)
SELECT g, CASE WHEN g <= 10 THEN 1000 WHEN g <= 30 THEN 500 ELSE 100 END
FROM generate_series(1,100) g
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS public.galaxy_bid_history (
  id BIGSERIAL PRIMARY KEY,
  seat_no INT NOT NULL REFERENCES public.galaxy_seats(seat_no),
  bidder_user_id UUID NOT NULL,
  bid_phon NUMERIC(20,2) NOT NULL,
  prev_holder UUID,
  refund_phon NUMERIC(20,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.galaxy_seats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.galaxy_bid_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "galaxy_seats_public_read" ON public.galaxy_seats FOR SELECT USING (true);
CREATE POLICY "galaxy_bid_history_self" ON public.galaxy_bid_history FOR SELECT USING (bidder_user_id = auth.uid() OR has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.bid_galaxy_seat(_seat_no INT, _bid_phon NUMERIC)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  _uid UUID := auth.uid();
  _seat RECORD;
  _balance NUMERIC;
  _refund NUMERIC := 0;
  _nick TEXT;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF _bid_phon < 100 THEN RAISE EXCEPTION 'bid_too_low'; END IF;
  IF _seat_no NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'invalid_seat'; END IF;

  SELECT * INTO _seat FROM galaxy_seats WHERE seat_no = _seat_no FOR UPDATE;
  IF _bid_phon < _seat.current_bid * 1.1 THEN
    RAISE EXCEPTION 'bid_must_exceed_10pct' USING DETAIL = 'min='||(_seat.current_bid*1.1)::text;
  END IF;
  IF _seat.holder_user_id = _uid THEN RAISE EXCEPTION 'already_holder'; END IF;

  SELECT balance INTO _balance FROM phon_balances WHERE user_id = _uid FOR UPDATE;
  IF COALESCE(_balance,0) < _bid_phon THEN RAISE EXCEPTION 'insufficient_phon'; END IF;

  UPDATE phon_balances SET balance = balance - _bid_phon, updated_at = now() WHERE user_id = _uid;

  IF _seat.holder_user_id IS NOT NULL THEN
    _refund := _seat.current_bid * 0.9;
    INSERT INTO phon_balances (user_id, balance) VALUES (_seat.holder_user_id, _refund)
    ON CONFLICT (user_id) DO UPDATE SET balance = phon_balances.balance + EXCLUDED.balance, updated_at = now();
  END IF;

  SELECT nickname INTO _nick FROM profiles WHERE id = _uid;

  UPDATE galaxy_seats
  SET holder_user_id = _uid, holder_nickname = _nick,
      current_bid = _bid_phon, bid_count = bid_count + 1,
      last_bid_at = now(), booster_expires_at = now() + interval '30 days', updated_at = now()
  WHERE seat_no = _seat_no;

  INSERT INTO empire_boosters (user_id, kind, fee_discount, crown_multiplier, leverage, granted_at, expires_at, source)
  VALUES (_uid, 'galaxy_seat', 0.5, 2.0, 2, now(), now() + interval '30 days', 'galaxy_seat:'||_seat_no::text);

  INSERT INTO galaxy_bid_history (seat_no, bidder_user_id, bid_phon, prev_holder, refund_phon)
  VALUES (_seat_no, _uid, _bid_phon, _seat.holder_user_id, _refund);

  PERFORM enqueue_imperial_story(
    'galaxy_seat',
    '🌌 Galaxy Seat #'||_seat_no||' 점령! '||COALESCE(_nick,'익명 황제'),
    _bid_phon::text||' PHON 입찰 · 30일 Booster 활성',
    _uid, _nick,
    jsonb_build_object('seat_no', _seat_no, 'bid', _bid_phon),
    'galaxy:'||_seat_no::text||':'||extract(epoch from now())::bigint::text, 168
  );

  RETURN jsonb_build_object('ok', true, 'seat_no', _seat_no, 'bid', _bid_phon, 'refund_to_prev', _refund);
END $$;
GRANT EXECUTE ON FUNCTION public.bid_galaxy_seat(INT, NUMERIC) TO authenticated;

-- ============ IMPERIAL JOURNEY 100-STAGE ============
CREATE TABLE IF NOT EXISTS public.imperial_journey_stages (
  stage_no INT PRIMARY KEY CHECK (stage_no BETWEEN 1 AND 100),
  act_id INT NOT NULL,
  title TEXT NOT NULL,
  requirement_kind TEXT NOT NULL,
  requirement_value NUMERIC NOT NULL,
  reward_phon NUMERIC(20,2) NOT NULL DEFAULT 0,
  reward_crown INT NOT NULL DEFAULT 0,
  description TEXT
);
ALTER TABLE public.imperial_journey_stages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "journey_stages_public_read" ON public.imperial_journey_stages FOR SELECT USING (true);

INSERT INTO public.imperial_journey_stages (stage_no, act_id, title, requirement_kind, requirement_value, reward_phon, reward_crown, description) VALUES
(1,1,'회원가입','signup',1,10,5,'시작'),
(2,1,'프로필 완성','profile',1,20,10,'프로필 채우기'),
(3,1,'첫 출석','attendance',1,30,15,'첫 출석 체크'),
(4,1,'5일 출석','attendance',5,80,30,'5일 연속'),
(5,1,'첫 거래','trade',1,100,40,'첫 트레이딩'),
(10,2,'10거래 달성','trade',10,250,80,'베테랑 입문'),
(20,2,'NFT 보유','nft',1,500,150,'첫 NFT'),
(30,3,'PHON 1000','phon',1000,800,250,'PHON 1k 보유'),
(40,3,'합성 1회','atelier',1,1000,300,'NFT 합성'),
(50,4,'PHON 5000','phon',5000,2000,600,'중반 마일스톤'),
(60,4,'NFT 3개','nft',3,2500,800,'컬렉션'),
(70,5,'PHON 10000','phon',10000,5000,1500,'1만 PHON'),
(80,5,'합성 5회','atelier',5,7000,2000,'합성 베테랑'),
(90,6,'PHON 50000','phon',50000,15000,4000,'고래'),
(100,7,'COSMIC EMPEROR','phon',100000,50000,10000,'우주 황제 등극')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS public.imperial_journey_claims (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  stage_no INT NOT NULL REFERENCES public.imperial_journey_stages(stage_no),
  reward_phon NUMERIC(20,2) NOT NULL,
  reward_crown INT NOT NULL,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, stage_no)
);
ALTER TABLE public.imperial_journey_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "journey_claims_self" ON public.imperial_journey_claims FOR SELECT USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.claim_journey_stage(_stage_no INT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  _uid UUID := auth.uid();
  _stage RECORD;
  _ok BOOLEAN := false;
  _phon NUMERIC; _trade INT; _nft INT; _atel INT; _att INT;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  SELECT * INTO _stage FROM imperial_journey_stages WHERE stage_no = _stage_no;
  IF _stage IS NULL THEN RAISE EXCEPTION 'stage_not_found'; END IF;

  IF EXISTS (SELECT 1 FROM imperial_journey_claims WHERE user_id = _uid AND stage_no = _stage_no) THEN
    RAISE EXCEPTION 'already_claimed';
  END IF;

  CASE _stage.requirement_kind
    WHEN 'signup' THEN _ok := true;
    WHEN 'profile' THEN SELECT (nickname IS NOT NULL) INTO _ok FROM profiles WHERE id = _uid;
    WHEN 'attendance' THEN
      SELECT COALESCE(attendance_streak,0) INTO _att FROM profiles WHERE id = _uid;
      _ok := _att >= _stage.requirement_value;
    WHEN 'trade' THEN
      SELECT COUNT(*) INTO _trade FROM live_positions WHERE user_id = _uid AND status IN ('closed','open');
      _ok := _trade >= _stage.requirement_value;
    WHEN 'phon' THEN
      SELECT COALESCE(balance,0) INTO _phon FROM phon_balances WHERE user_id = _uid;
      _ok := _phon >= _stage.requirement_value;
    WHEN 'nft' THEN
      SELECT COUNT(*) INTO _nft FROM nft_collection WHERE user_id = _uid;
      _ok := _nft >= _stage.requirement_value;
    WHEN 'atelier' THEN
      SELECT COUNT(*) INTO _atel FROM atelier_runs WHERE user_id = _uid AND outcome IN ('success','jackpot');
      _ok := _atel >= _stage.requirement_value;
    ELSE _ok := false;
  END CASE;

  IF NOT _ok THEN RAISE EXCEPTION 'requirement_not_met'; END IF;

  INSERT INTO imperial_journey_claims (user_id, stage_no, reward_phon, reward_crown)
  VALUES (_uid, _stage_no, _stage.reward_phon, _stage.reward_crown);

  IF _stage.reward_phon > 0 THEN
    INSERT INTO phon_balances (user_id, balance) VALUES (_uid, _stage.reward_phon)
    ON CONFLICT (user_id) DO UPDATE SET balance = phon_balances.balance + EXCLUDED.balance, updated_at = now();
  END IF;
  IF _stage.reward_crown > 0 THEN
    PERFORM award_crown('journey_stage', _stage.reward_crown, jsonb_build_object('stage', _stage_no), 'journey:'||_uid::text||':'||_stage_no::text);
  END IF;

  RETURN jsonb_build_object('ok', true, 'stage', _stage_no, 'phon', _stage.reward_phon, 'crown', _stage.reward_crown);
END $$;
GRANT EXECUTE ON FUNCTION public.claim_journey_stage(INT) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_my_journey_claims()
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE _uid UUID := auth.uid(); _result JSONB;
BEGIN
  IF _uid IS NULL THEN RETURN '[]'::jsonb; END IF;
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'stage_no', s.stage_no, 'title', s.title, 'requirement_kind', s.requirement_kind,
    'requirement_value', s.requirement_value, 'reward_phon', s.reward_phon, 'reward_crown', s.reward_crown,
    'claimed', c.id IS NOT NULL, 'claimed_at', c.claimed_at
  ) ORDER BY s.stage_no), '[]'::jsonb) INTO _result
  FROM imperial_journey_stages s
  LEFT JOIN imperial_journey_claims c ON c.stage_no = s.stage_no AND c.user_id = _uid;
  RETURN _result;
END $$;
GRANT EXECUTE ON FUNCTION public.get_my_journey_claims() TO authenticated;

-- ============ EMPEROR DAILY DIVIDEND ============
CREATE TABLE IF NOT EXISTS public.emperor_dividend_log (
  id BIGSERIAL PRIMARY KEY,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  emperor_user_id UUID,
  emperor_nickname TEXT,
  pool_snapshot NUMERIC(20,2) NOT NULL,
  dividend_phon NUMERIC(20,2) NOT NULL,
  dedupe_key TEXT UNIQUE
);
ALTER TABLE public.emperor_dividend_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dividend_log_public_read" ON public.emperor_dividend_log FOR SELECT USING (true);

CREATE OR REPLACE FUNCTION public.pay_emperor_daily_dividend()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  _emperor UUID; _nick TEXT; _pool NUMERIC; _div NUMERIC;
  _today TEXT := to_char(now() AT TIME ZONE 'Asia/Seoul','YYYYMMDD');
BEGIN
  IF EXISTS (SELECT 1 FROM emperor_dividend_log WHERE dedupe_key = 'div:'||_today) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_paid_today');
  END IF;

  SELECT user_id INTO _emperor FROM crown_events
  WHERE created_at > now() - interval '24 hours'
  GROUP BY user_id ORDER BY SUM(awarded_amount) DESC LIMIT 1;

  IF _emperor IS NULL THEN
    INSERT INTO emperor_dividend_log (pool_snapshot, dividend_phon, dedupe_key) VALUES (0, 0, 'div:'||_today);
    RETURN jsonb_build_object('ok', false, 'reason', 'no_emperor');
  END IF;

  SELECT COALESCE(amount,0) INTO _pool FROM jackpot_pool ORDER BY id LIMIT 1;
  _div := ROUND(_pool * 0.01, 2);
  IF _div < 1 THEN _div := 0; END IF;

  SELECT nickname INTO _nick FROM profiles WHERE id = _emperor;

  INSERT INTO emperor_dividend_log (emperor_user_id, emperor_nickname, pool_snapshot, dividend_phon, dedupe_key)
  VALUES (_emperor, _nick, _pool, _div, 'div:'||_today);

  IF _div > 0 THEN
    INSERT INTO phon_balances (user_id, balance) VALUES (_emperor, _div)
    ON CONFLICT (user_id) DO UPDATE SET balance = phon_balances.balance + EXCLUDED.balance, updated_at = now();
    UPDATE jackpot_pool SET amount = GREATEST(0, amount - _div), updated_at = now() WHERE id = (SELECT id FROM jackpot_pool ORDER BY id LIMIT 1);

    PERFORM enqueue_imperial_story(
      'new_emperor',
      '👑 오늘의 황제: '||COALESCE(_nick,'익명')||' · '||_div::text||' PHON 배당',
      'Crown Pool 1% 일일 배당 지급',
      _emperor, _nick,
      jsonb_build_object('dividend', _div, 'pool', _pool),
      'div_story:'||_today, 36
    );

    PERFORM enqueue_fomo_notification(
      _emperor, 'emperor_dividend',
      '오늘의 황제 배당 도착!',
      _div::text||' PHON 이 지갑에 입금되었습니다.',
      '/wallet','지갑 보기',
      jsonb_build_object('amount', _div), 9, 'div_fomo:'||_today, 24
    );
  END IF;

  RETURN jsonb_build_object('ok', true, 'emperor', _emperor, 'dividend', _div, 'pool', _pool);
END $$;
REVOKE ALL ON FUNCTION public.pay_emperor_daily_dividend() FROM PUBLIC;

INSERT INTO public.function_permissions_baseline (function_name, function_args, allowed_roles, category, note)
VALUES
  ('get_imperial_stories','_limit integer','{authenticated,anon}','public_read','Phase C-2 stories'),
  ('bid_galaxy_seat','_seat_no integer, _bid_phon numeric','{authenticated}','user_action','Phase C-3 galaxy auction'),
  ('claim_journey_stage','_stage_no integer','{authenticated}','user_action','Phase C-3 journey claim'),
  ('get_my_journey_claims','','{authenticated}','self_read','Phase C-3 journey list'),
  ('enqueue_imperial_story','_kind text, _headline text, _subline text, _hero_user uuid, _hero_nick text, _payload jsonb, _dedupe text, _ttl_hours integer','{}','internal','story enqueuer'),
  ('pay_emperor_daily_dividend','','{}','cron','daily emperor dividend')
ON CONFLICT (function_name, function_args) DO UPDATE SET allowed_roles = EXCLUDED.allowed_roles, category = EXCLUDED.category, note = EXCLUDED.note, updated_at = now();