CREATE OR REPLACE FUNCTION public.spin_slot_demo(
  _game_code text,
  _bet_chips numeric,
  _client_seed text,
  _is_buy_bonus boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_game record;
  v_balance numeric;
  v_bet_total numeric;
  v_server_seed text;
  v_nonce bigint;
  v_result jsonb;
  v_payout numeric;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'auth_required';
  END IF;

  SELECT *
    INTO v_game
  FROM public.slot_games
  WHERE game_code = _game_code
    AND active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'game_not_found';
  END IF;

  IF _bet_chips IS NULL OR _bet_chips <= 0 THEN
    RAISE EXCEPTION 'bet_invalid';
  END IF;

  IF _client_seed IS NULL OR btrim(_client_seed) = '' THEN
    RAISE EXCEPTION 'client_seed_required';
  END IF;

  v_bet_total := CASE
    WHEN COALESCE(_is_buy_bonus, false) THEN _bet_chips * v_game.buy_bonus_multiplier
    ELSE _bet_chips
  END;

  INSERT INTO public.slot_demo_balances (user_id, balance_chips, last_refill_at)
  VALUES (v_user, 10000, now())
  ON CONFLICT (user_id) DO NOTHING;

  SELECT balance_chips
    INTO v_balance
  FROM public.slot_demo_balances
  WHERE user_id = v_user
  FOR UPDATE;

  IF v_balance < v_bet_total THEN
    RAISE EXCEPTION 'insufficient_demo_chips';
  END IF;

  UPDATE public.slot_demo_balances
     SET balance_chips = balance_chips - v_bet_total,
         updated_at = now()
   WHERE user_id = v_user;

  v_server_seed := encode(extensions.gen_random_bytes(32), 'hex');
  v_nonce := (extract(epoch FROM clock_timestamp()) * 1000)::bigint;
  v_result := public._slot_compute_spin(v_server_seed, _client_seed, v_nonce, COALESCE(_is_buy_bonus, false), 0);
  v_payout := _bet_chips * COALESCE((v_result->>'payout_mult')::numeric, 0);

  IF v_payout > 0 THEN
    UPDATE public.slot_demo_balances
       SET balance_chips = balance_chips + v_payout,
           updated_at = now()
     WHERE user_id = v_user;
  END IF;

  SELECT balance_chips
    INTO v_balance
  FROM public.slot_demo_balances
  WHERE user_id = v_user;

  RETURN jsonb_build_object(
    'symbols', v_result->'symbols',
    'win_lines', v_result->'win_lines',
    'payout_chips', v_payout,
    'bet_chips', v_bet_total,
    'balance_chips', v_balance,
    'bonus_triggered', COALESCE(v_result->'bonus_triggered', 'false'::jsonb),
    'bonus_multiplier', v_result->'bonus_multiplier',
    'client_seed', _client_seed,
    'nonce', v_nonce,
    'server_seed_hash', encode(digest(v_server_seed, 'sha256'), 'hex')
  );
END;
$$;

REVOKE ALL ON FUNCTION public.spin_slot_demo(text, numeric, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.spin_slot_demo(text, numeric, text, boolean) TO authenticated;

NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';