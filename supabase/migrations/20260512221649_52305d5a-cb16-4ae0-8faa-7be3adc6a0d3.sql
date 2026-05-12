-- ============ PR-C: Crown Wars (Live PvP Crown Snipe) ============

-- Tables
CREATE TABLE IF NOT EXISTS public.crown_wars (
  id BIGSERIAL PRIMARY KEY,
  started_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  settled_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','settling','done')),
  top1_user_id UUID,
  top2_user_id UUID,
  top3_user_id UUID,
  top1_score INT,
  top2_score INT,
  top3_score INT,
  total_participants INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_crown_wars_active
  ON public.crown_wars(status) WHERE status = 'active';

CREATE TABLE IF NOT EXISTS public.crown_war_participants (
  war_id BIGINT NOT NULL REFERENCES public.crown_wars(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  score INT NOT NULL DEFAULT 0,
  last_event_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (war_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_cwp_war_score
  ON public.crown_war_participants(war_id, score DESC, last_event_at ASC);

-- RLS
ALTER TABLE public.crown_wars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crown_war_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "crown_wars select all auth"
  ON public.crown_wars FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "crown_war_participants select own"
  ON public.crown_war_participants FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "crown_war_participants admin select all"
  ON public.crown_war_participants FOR SELECT
  TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ============ Helpers ============

-- Get current active war (creates one if none)
CREATE OR REPLACE FUNCTION public.crown_war_ensure_active()
RETURNS public.crown_wars
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  w public.crown_wars;
  hour_start TIMESTAMPTZ;
BEGIN
  SELECT * INTO w FROM public.crown_wars
   WHERE status = 'active' AND ends_at > now()
   ORDER BY id DESC LIMIT 1;
  IF FOUND THEN RETURN w; END IF;

  hour_start := date_trunc('hour', now());
  INSERT INTO public.crown_wars(started_at, ends_at, status)
  VALUES (hour_start, hour_start + INTERVAL '55 minutes', 'active')
  ON CONFLICT DO NOTHING
  RETURNING * INTO w;
  IF w.id IS NULL THEN
    SELECT * INTO w FROM public.crown_wars WHERE status='active' ORDER BY id DESC LIMIT 1;
  END IF;
  RETURN w;
END $$;
REVOKE EXECUTE ON FUNCTION public.crown_war_ensure_active() FROM PUBLIC, anon, authenticated;

-- Trigger: when a user receives crown (any source), bump their score in the active war.
CREATE OR REPLACE FUNCTION public.crown_war_on_award()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  w_id BIGINT;
  delta INT;
BEGIN
  -- Skip self-loop (top3 awards) and zero/neg awards
  IF NEW.event_type = 'crown_war_top3' THEN RETURN NEW; END IF;
  IF COALESCE(NEW.amount, 0) <= 0 THEN RETURN NEW; END IF;

  SELECT id INTO w_id FROM public.crown_wars
   WHERE status='active' AND ends_at > now() ORDER BY id DESC LIMIT 1;
  IF w_id IS NULL THEN RETURN NEW; END IF;

  -- Each crown event = +1 score (snipe count, not amount). Encourages frequent action.
  delta := 1;

  INSERT INTO public.crown_war_participants(war_id, user_id, score, last_event_at)
  VALUES (w_id, NEW.user_id, delta, now())
  ON CONFLICT (war_id, user_id)
  DO UPDATE SET
    score = crown_war_participants.score + EXCLUDED.score,
    last_event_at = now();

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_crown_war_on_award ON public.crown_events;
CREATE TRIGGER trg_crown_war_on_award
AFTER INSERT ON public.crown_events
FOR EACH ROW EXECUTE FUNCTION public.crown_war_on_award();

-- ============ User-callable RPC: snapshot ============

CREATE OR REPLACE FUNCTION public.get_crown_war_snapshot()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  w public.crown_wars;
  my_score INT := 0;
  my_rank INT;
  total INT := 0;
  leaderboard jsonb;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('error','unauthorized'); END IF;

  SELECT * INTO w FROM public.crown_wars
   WHERE status='active' AND ends_at > now() ORDER BY id DESC LIMIT 1;

  IF w.id IS NULL THEN
    -- Return last finished war for transition display
    SELECT * INTO w FROM public.crown_wars
     WHERE status='done' ORDER BY id DESC LIMIT 1;
    IF w.id IS NULL THEN RETURN jsonb_build_object('war', null); END IF;
  END IF;

  SELECT score INTO my_score FROM public.crown_war_participants
    WHERE war_id = w.id AND user_id = uid;
  my_score := COALESCE(my_score, 0);

  SELECT COUNT(*) INTO total FROM public.crown_war_participants WHERE war_id = w.id;

  IF my_score > 0 THEN
    SELECT 1 + COUNT(*) INTO my_rank
      FROM public.crown_war_participants
     WHERE war_id = w.id
       AND (score > my_score OR (score = my_score AND last_event_at < (
         SELECT last_event_at FROM public.crown_war_participants
          WHERE war_id = w.id AND user_id = uid)));
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.rnk ASC), '[]'::jsonb) INTO leaderboard
  FROM (
    SELECT
      ROW_NUMBER() OVER (ORDER BY p.score DESC, p.last_event_at ASC) AS rnk,
      p.score,
      -- Mask nickname: first char + ●●● + last char
      CASE
        WHEN COALESCE(pr.nickname, '') = '' THEN 'Empire●●●'
        WHEN char_length(pr.nickname) <= 2 THEN substr(pr.nickname,1,1) || '●●'
        ELSE substr(pr.nickname,1,1) || repeat('●', greatest(1, char_length(pr.nickname)-2)) || substr(pr.nickname, char_length(pr.nickname), 1)
      END AS nick,
      COALESCE(pr.empire_level, 1) AS level,
      (p.user_id = uid) AS is_me
    FROM public.crown_war_participants p
    LEFT JOIN public.profiles pr ON pr.id = p.user_id
    WHERE p.war_id = w.id
    ORDER BY p.score DESC, p.last_event_at ASC
    LIMIT 10
  ) t;

  RETURN jsonb_build_object(
    'war', jsonb_build_object(
      'id', w.id,
      'started_at', w.started_at,
      'ends_at', w.ends_at,
      'status', w.status,
      'total_participants', GREATEST(total, w.total_participants)
    ),
    'me', jsonb_build_object('score', my_score, 'rank', my_rank),
    'leaderboard', leaderboard
  );
END $$;
REVOKE EXECUTE ON FUNCTION public.get_crown_war_snapshot() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_crown_war_snapshot() TO authenticated;

-- ============ Settlement ============

CREATE OR REPLACE FUNCTION public.settle_crown_war()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  w public.crown_wars;
  rec RECORD;
  awarded jsonb := '[]'::jsonb;
  hour_start TIMESTAMPTZ;
  total_n INT;
BEGIN
  -- Only admin or service role may invoke
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  -- 1) Settle expired active wars
  FOR w IN
    SELECT * FROM public.crown_wars
     WHERE status = 'active' AND ends_at <= now()
     ORDER BY id ASC
  LOOP
    UPDATE public.crown_wars SET status='settling' WHERE id = w.id;
    SELECT COUNT(*) INTO total_n FROM public.crown_war_participants WHERE war_id = w.id;

    -- Award top 3
    FOR rec IN
      SELECT user_id, score,
             ROW_NUMBER() OVER (ORDER BY score DESC, last_event_at ASC) AS rnk
        FROM public.crown_war_participants
       WHERE war_id = w.id
       ORDER BY score DESC, last_event_at ASC
       LIMIT 3
    LOOP
      -- Only award if score > 0
      IF rec.score > 0 THEN
        PERFORM public.award_crown(
          'crown_war_top3',
          200,
          jsonb_build_object('war_id', w.id, 'rank', rec.rnk, 'score', rec.score),
          'crown_war_' || w.id || '_top' || rec.rnk
        ) FROM (SELECT set_config('request.jwt.claim.sub', rec.user_id::text, true)) _;
        -- Note: award_crown reads auth.uid(); to award to a specific user we need a service-role variant.
      END IF;

      IF rec.rnk = 1 THEN UPDATE public.crown_wars SET top1_user_id=rec.user_id, top1_score=rec.score WHERE id=w.id; END IF;
      IF rec.rnk = 2 THEN UPDATE public.crown_wars SET top2_user_id=rec.user_id, top2_score=rec.score WHERE id=w.id; END IF;
      IF rec.rnk = 3 THEN UPDATE public.crown_wars SET top3_user_id=rec.user_id, top3_score=rec.score WHERE id=w.id; END IF;

      awarded := awarded || jsonb_build_object('rank', rec.rnk, 'user_id', rec.user_id, 'score', rec.score);
    END LOOP;

    UPDATE public.crown_wars
       SET status='done', settled_at=now(), total_participants=total_n
     WHERE id = w.id;
  END LOOP;

  -- 2) Ensure a fresh active war exists for the current hour
  hour_start := date_trunc('hour', now());
  IF NOT EXISTS (SELECT 1 FROM public.crown_wars WHERE status='active' AND ends_at > now()) THEN
    INSERT INTO public.crown_wars(started_at, ends_at, status)
    VALUES (hour_start, hour_start + INTERVAL '55 minutes', 'active')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN jsonb_build_object('awarded', awarded, 'now', now());
END $$;
REVOKE EXECUTE ON FUNCTION public.settle_crown_war() FROM PUBLIC, anon, authenticated;

-- Direct-award variant (service-role invocation by edge function)
CREATE OR REPLACE FUNCTION public.crown_war_award_direct(
  _user_id UUID,
  _war_id BIGINT,
  _rank INT,
  _score INT
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_amt INT := 200;
  variance NUMERIC;
  reward INT;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  variance := 0.55 + random() * 2.35; -- 0.55..2.9
  reward := GREATEST(FLOOR(base_amt * 0.55)::int, LEAST(FLOOR(base_amt * 2.9)::int, FLOOR(base_amt * variance)::int));

  -- Bump profile crown_score (mirrors award_crown side-effect, no recursion into trigger as event_type='crown_war_top3')
  INSERT INTO public.crown_events(user_id, event_type, amount, base, multiplier, dedupe_key, meta)
  VALUES (_user_id, 'crown_war_top3', reward, base_amt, variance,
          'crown_war_' || _war_id || '_top' || _rank,
          jsonb_build_object('war_id', _war_id, 'rank', _rank, 'score', _score))
  ON CONFLICT (dedupe_key) DO NOTHING;

  UPDATE public.profiles
     SET crown_score = COALESCE(crown_score, 0) + reward
   WHERE id = _user_id;
  PERFORM public.recompute_empire_level(_user_id);

  RETURN jsonb_build_object('user_id', _user_id, 'reward', reward, 'variance', variance);
END $$;
REVOKE EXECUTE ON FUNCTION public.crown_war_award_direct(UUID, BIGINT, INT, INT) FROM PUBLIC, anon, authenticated;

-- Drop the broken settle_crown_war that referenced auth.uid() trick; replace with cleaner version
CREATE OR REPLACE FUNCTION public.settle_crown_war()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  w public.crown_wars;
  rec RECORD;
  awarded jsonb := '[]'::jsonb;
  hour_start TIMESTAMPTZ;
  total_n INT;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  FOR w IN
    SELECT * FROM public.crown_wars
     WHERE status = 'active' AND ends_at <= now()
     ORDER BY id ASC
  LOOP
    UPDATE public.crown_wars SET status='settling' WHERE id = w.id;
    SELECT COUNT(*) INTO total_n FROM public.crown_war_participants WHERE war_id = w.id;

    FOR rec IN
      SELECT user_id, score,
             ROW_NUMBER() OVER (ORDER BY score DESC, last_event_at ASC) AS rnk
        FROM public.crown_war_participants
       WHERE war_id = w.id AND score > 0
       ORDER BY score DESC, last_event_at ASC
       LIMIT 3
    LOOP
      PERFORM public.crown_war_award_direct(rec.user_id, w.id, rec.rnk::int, rec.score);

      IF rec.rnk = 1 THEN UPDATE public.crown_wars SET top1_user_id=rec.user_id, top1_score=rec.score WHERE id=w.id; END IF;
      IF rec.rnk = 2 THEN UPDATE public.crown_wars SET top2_user_id=rec.user_id, top2_score=rec.score WHERE id=w.id; END IF;
      IF rec.rnk = 3 THEN UPDATE public.crown_wars SET top3_user_id=rec.user_id, top3_score=rec.score WHERE id=w.id; END IF;

      awarded := awarded || jsonb_build_object('rank', rec.rnk, 'user_id', rec.user_id, 'score', rec.score);
    END LOOP;

    UPDATE public.crown_wars
       SET status='done', settled_at=now(), total_participants=total_n
     WHERE id = w.id;
  END LOOP;

  hour_start := date_trunc('hour', now());
  IF NOT EXISTS (SELECT 1 FROM public.crown_wars WHERE status='active' AND ends_at > now()) THEN
    INSERT INTO public.crown_wars(started_at, ends_at, status)
    VALUES (hour_start, hour_start + INTERVAL '55 minutes', 'active')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN jsonb_build_object('awarded', awarded, 'now', now());
END $$;
REVOKE EXECUTE ON FUNCTION public.settle_crown_war() FROM PUBLIC, anon, authenticated;

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.crown_wars;
ALTER PUBLICATION supabase_realtime ADD TABLE public.crown_war_participants;

-- Bootstrap first war
SELECT public.crown_war_ensure_active();