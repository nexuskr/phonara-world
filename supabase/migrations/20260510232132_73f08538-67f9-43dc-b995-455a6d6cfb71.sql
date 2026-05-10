
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS persona TEXT NOT NULL DEFAULT 'gen30'
    CHECK (persona IN ('gen20','gen30','gen40','gen5060','gen6070','freelancer'));

CREATE INDEX IF NOT EXISTS idx_profiles_persona ON public.profiles(persona);

CREATE TABLE IF NOT EXISTS public.mission_personas (
  mission_id TEXT NOT NULL,
  persona TEXT NOT NULL CHECK (persona IN ('gen20','gen30','gen40','gen5060','gen6070','freelancer')),
  priority SMALLINT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (mission_id, persona)
);

ALTER TABLE public.mission_personas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mission_personas readable by all authenticated" ON public.mission_personas;
CREATE POLICY "mission_personas readable by all authenticated"
  ON public.mission_personas FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "mission_personas admin write" ON public.mission_personas;
CREATE POLICY "mission_personas admin write"
  ON public.mission_personas FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.mission_personas (mission_id, persona, priority) VALUES
  ('coin_paper_first_win','gen20',3),('coin_paper_first_win','gen30',3),('coin_paper_first_win','gen40',3),
  ('coin_paper_first_win','gen5060',2),('coin_paper_first_win','gen6070',1),('coin_paper_first_win','freelancer',3),
  ('weekly_streak_compound','gen20',2),('weekly_streak_compound','gen30',3),('weekly_streak_compound','gen40',3),
  ('weekly_streak_compound','gen5060',3),('weekly_streak_compound','gen6070',3),('weekly_streak_compound','freelancer',2),
  ('viral_sns_share','gen20',3),('viral_sns_share','gen30',2),('viral_sns_share','freelancer',2),
  ('family_invite','gen40',2),('family_invite','gen5060',3),('family_invite','gen6070',3),
  ('market_pulse_quiz','gen20',1),('market_pulse_quiz','gen30',3),('market_pulse_quiz','gen40',3),('market_pulse_quiz','freelancer',3),
  ('night_owl_boost','gen20',3),('night_owl_boost','freelancer',3),('night_owl_boost','gen30',1),
  ('m5','gen30',2),('m5','gen40',2),('m5','freelancer',2),
  ('m6','gen20',2),('m6','freelancer',3),('m6','gen30',1),
  ('m9','freelancer',3),('m9','gen30',1),
  ('m10','gen20',2),('m10','freelancer',3),
  ('m11','gen30',2),('m11','gen40',2),('m11','freelancer',1),
  ('empire_day_double','gen30',2),('empire_day_double','gen40',2),('empire_day_double','gen5060',2),('empire_day_double','gen6070',2)
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.assign_persona()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _bd DATE;
  _age INT;
  _persona TEXT;
  _is_freelancer BOOLEAN := false;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT birth_date INTO _bd FROM public.profiles WHERE user_id = _uid;

  IF _bd IS NULL THEN
    _persona := 'gen30';
  ELSE
    _age := DATE_PART('year', age(_bd));
    IF _age < 30 THEN _persona := 'gen20';
    ELSIF _age < 40 THEN _persona := 'gen30';
    ELSIF _age < 50 THEN _persona := 'gen40';
    ELSIF _age < 60 THEN _persona := 'gen5060';
    ELSE _persona := 'gen6070';
    END IF;
  END IF;

  SELECT (COUNT(*) FILTER (WHERE EXTRACT(HOUR FROM created_at) >= 22 OR EXTRACT(HOUR FROM created_at) < 6)::FLOAT
          / NULLIF(COUNT(*),0)) > 0.3
    INTO _is_freelancer
  FROM public.mission_history
  WHERE user_id = _uid AND created_at > now() - INTERVAL '14 days';

  IF _is_freelancer THEN _persona := 'freelancer'; END IF;

  UPDATE public.profiles SET persona = _persona WHERE user_id = _uid;
  RETURN _persona;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_recommended_missions()
RETURNS TABLE(mission_id TEXT, priority SMALLINT)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _persona TEXT;
BEGIN
  IF _uid IS NULL THEN
    RETURN;
  END IF;
  SELECT persona INTO _persona FROM public.profiles WHERE user_id = _uid;
  IF _persona IS NULL THEN _persona := 'gen30'; END IF;
  RETURN QUERY
    SELECT mp.mission_id, mp.priority
    FROM public.mission_personas mp
    WHERE mp.persona = _persona
    ORDER BY mp.priority DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.assign_persona() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_recommended_missions() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assign_persona() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_recommended_missions() TO authenticated;

INSERT INTO public.function_permissions_baseline (function_name, function_args, allowed_roles, category, note)
VALUES
  ('assign_persona','',ARRAY['authenticated'],'user','P1: classify user persona from birth_date + activity'),
  ('get_recommended_missions','',ARRAY['authenticated'],'user','P1: persona-targeted mission ids')
ON CONFLICT (function_name, function_args) DO UPDATE
  SET allowed_roles = EXCLUDED.allowed_roles,
      category = EXCLUDED.category,
      note = EXCLUDED.note,
      updated_at = now();
