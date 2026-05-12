CREATE OR REPLACE FUNCTION public.crown_war_on_award()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  w_id BIGINT;
BEGIN
  IF NEW.event_type = 'crown_war_top3' THEN RETURN NEW; END IF;
  IF COALESCE(NEW.awarded_amount, 0) <= 0 THEN RETURN NEW; END IF;

  SELECT id INTO w_id FROM public.crown_wars
   WHERE status='active' AND ends_at > now() ORDER BY id DESC LIMIT 1;
  IF w_id IS NULL THEN RETURN NEW; END IF;

  INSERT INTO public.crown_war_participants(war_id, user_id, score, last_event_at)
  VALUES (w_id, NEW.user_id, 1, now())
  ON CONFLICT (war_id, user_id)
  DO UPDATE SET
    score = crown_war_participants.score + 1,
    last_event_at = now();

  RETURN NEW;
END $$;

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
  type_mult NUMERIC := 1.0;
  level_mult NUMERIC := 1.0;
  streak_mult NUMERIC := 1.0;
  expected INT;
  rpe NUMERIC;
  dkey TEXT;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  variance := 0.55 + random() * 2.35;
  reward := GREATEST(FLOOR(base_amt * 0.55)::int, LEAST(FLOOR(base_amt * 2.9)::int, FLOOR(base_amt * variance)::int));
  expected := FLOOR(base_amt * 1.5)::int;
  rpe := (reward - expected)::numeric / NULLIF(expected,0);
  dkey := 'crown_war_' || _war_id || '_top' || _rank;

  INSERT INTO public.crown_events(
    user_id, event_type, base_amount, awarded_amount, variance,
    level_mult, streak_mult, type_mult, expected_amount, rpe, meta, dedupe_key
  )
  VALUES (
    _user_id, 'crown_war_top3', base_amt, reward, variance,
    level_mult, streak_mult, type_mult, expected, rpe,
    jsonb_build_object('war_id', _war_id, 'rank', _rank, 'score', _score),
    dkey
  )
  ON CONFLICT (user_id, dedupe_key) DO NOTHING;

  UPDATE public.profiles
     SET crown_score = COALESCE(crown_score, 0) + reward
   WHERE id = _user_id;

  PERFORM public.recompute_empire_level(_user_id);

  RETURN jsonb_build_object('user_id', _user_id, 'reward', reward, 'variance', variance, 'rpe', rpe);
END $$;
REVOKE EXECUTE ON FUNCTION public.crown_war_award_direct(UUID, BIGINT, INT, INT) FROM PUBLIC, anon, authenticated;