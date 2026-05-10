CREATE OR REPLACE FUNCTION public.arena_open_round(
  p_mode TEXT, p_symbol TEXT, p_side TEXT, p_leverage INT,
  p_margin BIGINT, p_sl_pct NUMERIC, p_tp_pct NUMERIC
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid UUID := auth.uid(); _avail BIGINT; _id UUID; _status TEXT;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF p_mode NOT IN ('solo','duel') THEN RAISE EXCEPTION 'invalid_mode'; END IF;
  IF p_side NOT IN ('long','short') THEN RAISE EXCEPTION 'invalid_side'; END IF;
  IF p_leverage < 1 OR p_leverage > 100 THEN RAISE EXCEPTION 'invalid_leverage'; END IF;
  IF p_margin <= 0 OR p_margin > 100000000 THEN RAISE EXCEPTION 'invalid_margin'; END IF;
  IF p_sl_pct IS NULL OR p_sl_pct > -0.5 OR p_sl_pct < -100 THEN RAISE EXCEPTION 'invalid_sl'; END IF;
  IF p_tp_pct IS NULL OR p_tp_pct < 0.5 OR p_tp_pct > 1000 THEN RAISE EXCEPTION 'invalid_tp'; END IF;

  SELECT available_balance INTO _avail FROM public.wallet_balances WHERE user_id = _uid FOR UPDATE;
  IF _avail IS NULL OR _avail < p_margin THEN RAISE EXCEPTION 'insufficient_balance'; END IF;

  UPDATE public.wallet_balances
    SET available_balance = available_balance - p_margin,
        total_balance = total_balance - p_margin,
        updated_at = now()
  WHERE user_id = _uid;
  UPDATE public.arena_pool
    SET balance = balance + p_margin, total_collected = total_collected + p_margin, updated_at = now()
  WHERE id = 1;

  _status := CASE WHEN p_mode = 'duel' THEN 'waiting' ELSE 'open' END;
  INSERT INTO public.arena_rounds(user_id, mode, symbol, side, leverage, margin, sl_pct, tp_pct, status)
  VALUES (_uid, p_mode, p_symbol, p_side, p_leverage, p_margin, p_sl_pct, p_tp_pct, _status)
  RETURNING id INTO _id;

  RETURN jsonb_build_object('ok', true, 'id', _id, 'status', _status);
END $$;

CREATE OR REPLACE FUNCTION public.arena_join_duel(p_round_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid UUID := auth.uid(); _r RECORD; _avail BIGINT;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  SELECT * INTO _r FROM public.arena_rounds WHERE id = p_round_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'round_not_found'; END IF;
  IF _r.mode <> 'duel' OR _r.status <> 'waiting' THEN RAISE EXCEPTION 'round_not_joinable'; END IF;
  IF _r.user_id = _uid THEN RAISE EXCEPTION 'cannot_join_own'; END IF;

  SELECT available_balance INTO _avail FROM public.wallet_balances WHERE user_id = _uid FOR UPDATE;
  IF _avail IS NULL OR _avail < _r.margin THEN RAISE EXCEPTION 'insufficient_balance'; END IF;

  UPDATE public.wallet_balances
    SET available_balance = available_balance - _r.margin,
        total_balance = total_balance - _r.margin,
        updated_at = now()
  WHERE user_id = _uid;
  UPDATE public.arena_pool
    SET balance = balance + _r.margin, total_collected = total_collected + _r.margin, updated_at = now()
  WHERE id = 1;
  UPDATE public.arena_rounds SET opponent_id = _uid, status = 'open' WHERE id = p_round_id;

  RETURN jsonb_build_object('ok', true);
END $$;

CREATE OR REPLACE FUNCTION public.arena_settle_round(p_round_id UUID, p_exit_pnl_pct NUMERIC)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _caller UUID := auth.uid(); _r RECORD; _pool BIGINT; _raw_reward NUMERIC; _reward BIGINT;
  _rake BIGINT; _jp_fund BIGINT; _op_retain BIGINT; _net BIGINT; _winner UUID; _clamped NUMERIC;
BEGIN
  IF _caller IS NULL OR NOT public.has_role(_caller,'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT * INTO _r FROM public.arena_rounds WHERE id = p_round_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'round_not_found'; END IF;
  IF _r.status <> 'open' THEN RAISE EXCEPTION 'not_open'; END IF;

  _clamped := GREATEST(_r.sl_pct, LEAST(_r.tp_pct, p_exit_pnl_pct));
  _raw_reward := (_clamped / 100.0) * _r.margin * (_r.amp_factor / 100.0);

  IF _r.mode = 'duel' THEN
    _winner := CASE WHEN _clamped >= 0 THEN _r.user_id ELSE _r.opponent_id END;
    _reward := _r.margin * 2;
  ELSE
    _winner := _r.user_id;
    _reward := GREATEST(0, (_r.margin + _raw_reward))::BIGINT;
  END IF;

  SELECT balance INTO _pool FROM public.arena_pool WHERE id = 1 FOR UPDATE;
  _reward := LEAST(_reward, _pool);

  -- Operator rake 10%, split: 45% → jackpot funding, 55% → operator retain
  _rake := FLOOR(_reward * 0.10)::BIGINT;
  _jp_fund := FLOOR(_rake * 0.45)::BIGINT;
  _op_retain := _rake - _jp_fund;
  _net := _reward - _rake;

  IF _net > 0 THEN
    INSERT INTO public.wallet_balances(user_id, available_balance, total_balance)
      VALUES (_winner, _net, _net)
    ON CONFLICT (user_id) DO UPDATE SET
      available_balance = public.wallet_balances.available_balance + _net,
      total_balance = public.wallet_balances.total_balance + _net,
      updated_at = now();
  END IF;

  UPDATE public.arena_pool
    SET balance = balance - _reward,
        total_paid = total_paid + _net,
        operator_margin = operator_margin + _op_retain,
        updated_at = now()
   WHERE id = 1;

  -- Phase 5: Jackpot funding from arena rake
  IF _jp_fund > 0 THEN
    UPDATE public.jackpot_pool SET amount = amount + _jp_fund, updated_at = now() WHERE id = 1;
    INSERT INTO public.jackpot_contributions(user_id, deposit_amount, contribution_amount, contribution_pct)
    VALUES (_winner, _jp_fund, _jp_fund, 45.0);
  END IF;

  UPDATE public.arena_rounds
    SET status = 'settled', exit_pnl_pct = _clamped, reward = _net,
        operator_rake = _op_retain, winner_id = _winner, settled_at = now()
   WHERE id = p_round_id;

  RETURN jsonb_build_object('ok', true, 'reward', _net, 'rake', _op_retain, 'jackpot_funded', _jp_fund, 'winner', _winner);
END $$;