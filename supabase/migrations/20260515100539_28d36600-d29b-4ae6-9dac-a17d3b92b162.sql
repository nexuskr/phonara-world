CREATE OR REPLACE FUNCTION public.try_jackpot_hit(
  _game_code text,
  _spin_id uuid,
  _bet_phon numeric
)
RETURNS TABLE (hit boolean, amount_phon numeric, pool_after numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _pool numeric;
  _seed numeric;
  _payout numeric := 0;
  _roll numeric;
  _prob numeric;
  _existing uuid;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'auth_required';
  END IF;
  IF _bet_phon IS NULL OR _bet_phon <= 0 THEN
    hit := false; amount_phon := 0; pool_after := 0; RETURN NEXT; RETURN;
  END IF;

  -- Idempotency: if this spin already hit, return prior result
  SELECT id, amount_phon INTO _existing, _payout
    FROM public.slot_jackpot_wins
   WHERE spin_id = _spin_id;
  IF _existing IS NOT NULL THEN
    SELECT pool_phon INTO _pool FROM public.slot_jackpot_pools WHERE game_code = _game_code;
    hit := true; amount_phon := _payout; pool_after := COALESCE(_pool, 0);
    RETURN NEXT; RETURN;
  END IF;

  -- Verify spin belongs to caller
  PERFORM 1 FROM public.slot_spins WHERE id = _spin_id AND user_id = _uid;
  IF NOT FOUND THEN
    hit := false; amount_phon := 0; pool_after := 0; RETURN NEXT; RETURN;
  END IF;

  -- Probability: bet / 5,000,000 per spin  (1000 PHON => 1/5000)
  _prob := LEAST(0.01, _bet_phon / 5000000.0);
  _roll := random();

  -- Lock pool
  SELECT pool_phon, seed_phon INTO _pool, _seed
    FROM public.slot_jackpot_pools
   WHERE game_code = _game_code
   FOR UPDATE;

  IF _pool IS NULL OR _roll >= _prob THEN
    hit := false; amount_phon := 0; pool_after := COALESCE(_pool, 0);
    RETURN NEXT; RETURN;
  END IF;

  -- Hit! Payout = pool above seed (keep seed for next round)
  _payout := GREATEST(_pool - _seed, _seed);  -- guarantee at least seed

  -- Drain pool to seed
  UPDATE public.slot_jackpot_pools
     SET pool_phon = _seed,
         last_amount = _payout,
         last_won_at = now(),
         last_winner_user_id = _uid,
         updated_at = now()
   WHERE game_code = _game_code;

  -- Credit winner
  INSERT INTO public.phon_balances (user_id, balance)
  VALUES (_uid, _payout)
  ON CONFLICT (user_id) DO UPDATE
    SET balance = public.phon_balances.balance + _payout,
        updated_at = now();

  INSERT INTO public.slot_jackpot_wins (winner_user_id, game_code, amount_phon, spin_id)
  VALUES (_uid, _game_code, _payout, _spin_id);

  hit := true; amount_phon := _payout; pool_after := _seed;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.try_jackpot_hit(text, uuid, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.try_jackpot_hit(text, uuid, numeric) TO authenticated;

INSERT INTO public.function_permissions_baseline (function_name, function_args, allowed_roles, category, note)
VALUES (
  'try_jackpot_hit', 'text, uuid, numeric', ARRAY['authenticated'], 'slot',
  'Per-spin progressive jackpot roll — credits winner, drains pool to seed, idempotent on spin_id'
)
ON CONFLICT (function_name, function_args) DO UPDATE
  SET allowed_roles = EXCLUDED.allowed_roles,
      category = EXCLUDED.category,
      note = EXCLUDED.note,
      updated_at = now();

ALTER PUBLICATION supabase_realtime ADD TABLE public.slot_jackpot_wins;