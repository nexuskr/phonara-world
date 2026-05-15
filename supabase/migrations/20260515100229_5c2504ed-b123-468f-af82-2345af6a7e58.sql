CREATE TABLE IF NOT EXISTS public.slot_jackpot_pools (
  game_code text PRIMARY KEY,
  pool_phon numeric NOT NULL DEFAULT 0,
  seed_phon numeric NOT NULL DEFAULT 100000,
  contribution_bps integer NOT NULL DEFAULT 50,
  last_won_at timestamptz,
  last_winner_user_id uuid,
  last_amount numeric,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.slot_jackpot_pools ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "jackpot_pools_public_read" ON public.slot_jackpot_pools;
CREATE POLICY "jackpot_pools_public_read"
  ON public.slot_jackpot_pools FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "jackpot_pools_admin_write" ON public.slot_jackpot_pools;
CREATE POLICY "jackpot_pools_admin_write"
  ON public.slot_jackpot_pools FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE IF NOT EXISTS public.slot_jackpot_wins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  winner_user_id uuid NOT NULL,
  game_code text NOT NULL,
  amount_phon numeric NOT NULL,
  spin_id uuid,
  won_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_jackpot_wins_recent
  ON public.slot_jackpot_wins (won_at DESC);

ALTER TABLE public.slot_jackpot_wins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "jackpot_wins_public_read" ON public.slot_jackpot_wins;
CREATE POLICY "jackpot_wins_public_read"
  ON public.slot_jackpot_wins FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "jackpot_wins_admin_write" ON public.slot_jackpot_wins;
CREATE POLICY "jackpot_wins_admin_write"
  ON public.slot_jackpot_wins FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.accrue_jackpot_from_spin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _bps integer;
BEGIN
  INSERT INTO public.slot_jackpot_pools (game_code, pool_phon, seed_phon)
  VALUES (NEW.game_code, 100000, 100000)
  ON CONFLICT (game_code) DO NOTHING;

  SELECT contribution_bps INTO _bps
    FROM public.slot_jackpot_pools
   WHERE game_code = NEW.game_code;

  UPDATE public.slot_jackpot_pools
     SET pool_phon = pool_phon + (NEW.bet_phon * COALESCE(_bps, 50) / 10000.0),
         updated_at = now()
   WHERE game_code = NEW.game_code;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_accrue_jackpot ON public.slot_spins;
CREATE TRIGGER trg_accrue_jackpot
  AFTER INSERT ON public.slot_spins
  FOR EACH ROW
  EXECUTE FUNCTION public.accrue_jackpot_from_spin();

CREATE OR REPLACE FUNCTION public.get_jackpot_pools()
RETURNS TABLE (
  game_code text,
  pool_phon numeric,
  seed_phon numeric,
  last_amount numeric,
  last_won_at timestamptz,
  last_winner_masked text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.game_code,
    p.pool_phon,
    p.seed_phon,
    p.last_amount,
    p.last_won_at,
    CASE
      WHEN p.last_winner_user_id IS NULL THEN NULL
      ELSE public.mask_nickname(COALESCE(pr.nickname, 'Player'))
    END AS last_winner_masked
  FROM public.slot_jackpot_pools p
  LEFT JOIN public.profiles pr ON pr.id = p.last_winner_user_id
  ORDER BY p.pool_phon DESC;
$$;

REVOKE ALL ON FUNCTION public.get_jackpot_pools() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_jackpot_pools() TO anon, authenticated;

INSERT INTO public.function_permissions_baseline (function_name, function_args, allowed_roles, category, note)
VALUES (
  'get_jackpot_pools', '', ARRAY['anon','authenticated'], 'slot',
  'Public jackpot snapshot — pool size + masked last winner'
)
ON CONFLICT (function_name, function_args) DO UPDATE
  SET allowed_roles = EXCLUDED.allowed_roles,
      category = EXCLUDED.category,
      note = EXCLUDED.note,
      updated_at = now();

ALTER PUBLICATION supabase_realtime ADD TABLE public.slot_jackpot_pools;

INSERT INTO public.slot_jackpot_pools (game_code, pool_phon, seed_phon, contribution_bps)
VALUES
  ('olympus_1000',       100000, 100000, 50),
  ('cosmic_forge_5000',  150000, 100000, 50),
  ('neon_tokyo_88',      120000, 100000, 50),
  ('pirates_curse_1500', 100000, 100000, 50),
  ('pharaohs_vault_2500',100000, 100000, 50),
  ('viking_thunder_4000',100000, 100000, 50),
  ('aztec_sun_1200',     100000, 100000, 50),
  ('cherry_sakura_500',  100000, 100000, 50)
ON CONFLICT (game_code) DO NOTHING;