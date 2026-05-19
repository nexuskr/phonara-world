CREATE TABLE IF NOT EXISTS public.imperial_pf_server_seeds (
  id               bigserial PRIMARY KEY,
  game             text        NOT NULL,
  round_id         bigint      NOT NULL,
  server_seed      text        NOT NULL,
  server_seed_hash text        NOT NULL,
  nonce_start      bigint      NOT NULL DEFAULT 0,
  committed_at     timestamptz NOT NULL DEFAULT now(),
  revealed_at      timestamptz,
  CONSTRAINT imperial_pf_server_seeds_game_round_uniq UNIQUE (game, round_id),
  CONSTRAINT imperial_pf_server_seeds_game_chk
    CHECK (game IN ('crash','plinko','roulette','blackjack','baccarat','powerball','wheel','mines','dice','limbo','keno'))
);

CREATE INDEX IF NOT EXISTS idx_imperial_pf_server_seeds_game_committed
  ON public.imperial_pf_server_seeds (game, committed_at DESC);

ALTER TABLE public.imperial_pf_server_seeds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "imperial_pf_seeds_admin_select" ON public.imperial_pf_server_seeds;
CREATE POLICY "imperial_pf_seeds_admin_select"
  ON public.imperial_pf_server_seeds
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE VIEW public.imperial_pf_public AS
  SELECT id, game, round_id, server_seed_hash, nonce_start, committed_at, revealed_at
  FROM public.imperial_pf_server_seeds;

GRANT SELECT ON public.imperial_pf_public TO authenticated, anon;

CREATE OR REPLACE FUNCTION public.imperial_pf_commit(
  p_game     text,
  p_round_id bigint
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_uid    uuid := auth.uid();
  v_seed   text;
  v_hash   text;
  v_existing text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'auth_required' USING ERRCODE = '28000';
  END IF;
  IF p_game IS NULL OR p_round_id IS NULL THEN
    RAISE EXCEPTION 'invalid_args';
  END IF;

  SELECT server_seed_hash INTO v_existing
  FROM public.imperial_pf_server_seeds
  WHERE game = p_game AND round_id = p_round_id;

  IF v_existing IS NOT NULL THEN
    RETURN v_existing;
  END IF;

  v_seed := encode(extensions.gen_random_bytes(32), 'hex');
  v_hash := encode(extensions.digest(v_seed, 'sha256'), 'hex');

  INSERT INTO public.imperial_pf_server_seeds (game, round_id, server_seed, server_seed_hash)
  VALUES (p_game, p_round_id, v_seed, v_hash)
  ON CONFLICT (game, round_id) DO NOTHING
  RETURNING server_seed_hash INTO v_hash;

  IF v_hash IS NULL THEN
    SELECT server_seed_hash INTO v_hash
    FROM public.imperial_pf_server_seeds
    WHERE game = p_game AND round_id = p_round_id;
  END IF;

  RETURN v_hash;
END;
$$;

CREATE OR REPLACE FUNCTION public.imperial_pf_reveal(
  p_round_id bigint,
  p_game     text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid  uuid := auth.uid();
  v_seed text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'auth_required' USING ERRCODE = '28000';
  END IF;

  UPDATE public.imperial_pf_server_seeds
     SET revealed_at = COALESCE(revealed_at, now())
   WHERE game = p_game AND round_id = p_round_id
   RETURNING server_seed INTO v_seed;

  IF v_seed IS NULL THEN
    RAISE EXCEPTION 'pf_round_not_found';
  END IF;

  RETURN v_seed;
END;
$$;

CREATE OR REPLACE FUNCTION public.imperial_pf_verify(
  p_seed  text,
  p_hash  text,
  p_nonce bigint
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT CASE
    WHEN p_seed IS NULL OR p_hash IS NULL THEN false
    ELSE encode(extensions.digest(p_seed, 'sha256'), 'hex') = lower(p_hash)
  END;
$$;

REVOKE ALL ON FUNCTION public.imperial_pf_commit(text, bigint) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.imperial_pf_reveal(bigint, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.imperial_pf_verify(text, text, bigint) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.imperial_pf_commit(text, bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.imperial_pf_reveal(bigint, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.imperial_pf_verify(text, text, bigint) TO authenticated;

INSERT INTO public.function_permissions_baseline (function_name, function_args, allowed_roles, category, note)
VALUES
  ('imperial_pf_commit', 'p_game text, p_round_id bigint',         ARRAY['authenticated']::text[], 'games_pf', 'Phase 2 PF v2 — commit server seed'),
  ('imperial_pf_reveal', 'p_round_id bigint, p_game text',         ARRAY['authenticated']::text[], 'games_pf', 'Phase 2 PF v2 — reveal server seed'),
  ('imperial_pf_verify', 'p_seed text, p_hash text, p_nonce bigint', ARRAY['authenticated']::text[], 'games_pf', 'Phase 2 PF v2 — pure hash verify')
ON CONFLICT (function_name, function_args) DO UPDATE
  SET allowed_roles = EXCLUDED.allowed_roles,
      category      = EXCLUDED.category,
      note          = EXCLUDED.note,
      updated_at    = now();
