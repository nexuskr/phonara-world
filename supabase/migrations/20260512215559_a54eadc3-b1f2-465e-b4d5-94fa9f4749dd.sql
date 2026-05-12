
-- 1) Empire Boosters table
CREATE TABLE IF NOT EXISTS public.empire_boosters (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  kind TEXT NOT NULL DEFAULT 'baron_24h',
  fee_discount NUMERIC NOT NULL DEFAULT 0.30,
  crown_multiplier NUMERIC NOT NULL DEFAULT 1.5,
  leverage NUMERIC NOT NULL DEFAULT 7.0,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  source TEXT NOT NULL DEFAULT 'baron_promotion'
);

ALTER TABLE public.empire_boosters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own boosters readable" ON public.empire_boosters;
CREATE POLICY "own boosters readable"
ON public.empire_boosters FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_empire_boosters_user_active
  ON public.empire_boosters (user_id, expires_at DESC);

-- 2) Read RPC for current user
CREATE OR REPLACE FUNCTION public.get_active_empire_booster()
RETURNS TABLE (
  id BIGINT,
  kind TEXT,
  fee_discount NUMERIC,
  crown_multiplier NUMERIC,
  leverage NUMERIC,
  granted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, kind, fee_discount, crown_multiplier, leverage, granted_at, expires_at
  FROM public.empire_boosters
  WHERE user_id = auth.uid() AND expires_at > now()
  ORDER BY expires_at DESC
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_active_empire_booster() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_active_empire_booster() TO authenticated;

-- 3) recompute_empire_level — Baron 승급시 24h 부스터 + 강화된 알림 payload
CREATE OR REPLACE FUNCTION public.recompute_empire_level(_user_id UUID)
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_score BIGINT;
  v_old_level INT;
  v_new_level INT;
  v_expires TIMESTAMPTZ;
  v_variant INT;
BEGIN
  SELECT crown_score, empire_level INTO v_score, v_old_level
    FROM public.profiles WHERE id = _user_id FOR UPDATE;

  SELECT MAX(level) INTO v_new_level
    FROM public.empire_levels WHERE crown_required <= COALESCE(v_score, 0);
  v_new_level := COALESCE(v_new_level, 1);

  IF v_new_level <> v_old_level THEN
    UPDATE public.profiles SET empire_level = v_new_level, updated_at = now() WHERE id = _user_id;

    -- Baron(7) 최초 승급 시 24h Empire Booster 발급 + 강화 알림
    IF v_new_level >= 7 AND v_old_level < 7 THEN
      v_expires := now() + interval '24 hours';
      v_variant := 1 + (abs(hashtext(_user_id::text || now()::text)) % 3); -- 1~3
      
      INSERT INTO public.empire_boosters
        (user_id, kind, fee_discount, crown_multiplier, leverage, expires_at, source)
      VALUES
        (_user_id, 'baron_24h', 0.30, 1.5, 7.0, v_expires, 'baron_promotion');

      INSERT INTO public.fomo_notifications (user_id, kind, level, payload, dedupe_key)
      VALUES (_user_id, 'baron_promotion', v_new_level,
              jsonb_build_object(
                'seats_left', 50,
                'leverage', 7.0,
                'fee_discount', 0.30,
                'crown_multiplier', 1.5,
                'expires_at', v_expires,
                'variant', v_variant
              ),
              'baron_promotion_v2')
      ON CONFLICT (user_id, dedupe_key) DO NOTHING;
    END IF;
  END IF;
  RETURN v_new_level;
END;
$$;

REVOKE ALL ON FUNCTION public.recompute_empire_level(UUID) FROM PUBLIC, anon, authenticated;
