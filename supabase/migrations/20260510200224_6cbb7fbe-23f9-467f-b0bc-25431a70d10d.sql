-- Arena pool (singleton, transparent)
CREATE TABLE public.arena_pool (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  balance BIGINT NOT NULL DEFAULT 0 CHECK (balance >= 0),
  total_collected BIGINT NOT NULL DEFAULT 0,
  total_paid BIGINT NOT NULL DEFAULT 0,
  operator_margin BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO public.arena_pool(id) VALUES (1);
ALTER TABLE public.arena_pool ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ap_public_read" ON public.arena_pool FOR SELECT TO authenticated USING (true);

-- Arena rounds
CREATE TABLE public.arena_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  opponent_id UUID,
  winner_id UUID,
  mode TEXT NOT NULL CHECK (mode IN ('solo', 'duel')),
  symbol TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('long','short')),
  leverage INT NOT NULL CHECK (leverage BETWEEN 1 AND 100),
  margin BIGINT NOT NULL CHECK (margin > 0),
  sl_pct NUMERIC NOT NULL CHECK (sl_pct BETWEEN -100 AND -0.5),
  tp_pct NUMERIC NOT NULL CHECK (tp_pct BETWEEN 0.5 AND 1000),
  amp_factor NUMERIC NOT NULL DEFAULT 100,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','waiting','settled','cancelled')),
  exit_pnl_pct NUMERIC,
  reward BIGINT,
  operator_rake BIGINT,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  settled_at TIMESTAMPTZ
);
ALTER TABLE public.arena_rounds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ar_self_read" ON public.arena_rounds FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR opponent_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE INDEX idx_ar_user ON public.arena_rounds(user_id, opened_at DESC);
CREATE INDEX idx_ar_status ON public.arena_rounds(status) WHERE status IN ('open','waiting');

-- Open new round (server-side validation + SL/TP enforced)
CREATE OR REPLACE FUNCTION public.arena_open_round(
  p_mode TEXT, p_symbol TEXT, p_side TEXT, p_leverage INT,
  p_margin BIGINT, p_sl_pct NUMERIC, p_tp_pct NUMERIC
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid UUID := auth.uid(); _bal BIGINT; _id UUID; _status TEXT;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF p_mode NOT IN ('solo','duel') THEN RAISE EXCEPTION 'invalid_mode'; END IF;
  IF p_side NOT IN ('long','short') THEN RAISE EXCEPTION 'invalid_side'; END IF;
  IF p_leverage < 1 OR p_leverage > 100 THEN RAISE EXCEPTION 'invalid_leverage'; END IF;
  IF p_margin <= 0 OR p_margin > 100000000 THEN RAISE EXCEPTION 'invalid_margin'; END IF;
  -- Server-side SL/TP clamp (mandatory)
  IF p_sl_pct IS NULL OR p_sl_pct > -0.5 OR p_sl_pct < -100 THEN RAISE EXCEPTION 'invalid_sl'; END IF;
  IF p_tp_pct IS NULL OR p_tp_pct < 0.5 OR p_tp_pct > 1000 THEN RAISE EXCEPTION 'invalid_tp'; END IF;

  SELECT balance INTO _bal FROM public.wallet_balances WHERE user_id = _uid FOR UPDATE;
  IF _bal IS NULL OR _bal < p_margin THEN RAISE EXCEPTION 'insufficient_balance'; END IF;

  UPDATE public.wallet_balances SET balance = balance - p_margin, updated_at = now() WHERE user_id = _uid;
  UPDATE public.arena_pool SET balance = balance + p_margin, total_collected = total_collected + p_margin, updated_at = now() WHERE id = 1;

  _status := CASE WHEN p_mode = 'duel' THEN 'waiting' ELSE 'open' END;
  INSERT INTO public.arena_rounds(user_id, mode, symbol, side, leverage, margin, sl_pct, tp_pct, status)
  VALUES (_uid, p_mode, p_symbol, p_side, p_leverage, p_margin, p_sl_pct, p_tp_pct, _status)
  RETURNING id INTO _id;

  RETURN jsonb_build_object('ok', true, 'id', _id, 'status', _status);
END $$;

-- Join an open duel round
CREATE OR REPLACE FUNCTION public.arena_join_duel(p_round_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid UUID := auth.uid(); _r RECORD; _bal BIGINT;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  SELECT * INTO _r FROM public.arena_rounds WHERE id = p_round_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'round_not_found'; END IF;
  IF _r.mode <> 'duel' OR _r.status <> 'waiting' THEN RAISE EXCEPTION 'round_not_joinable'; END IF;
  IF _r.user_id = _uid THEN RAISE EXCEPTION 'cannot_join_own'; END IF;

  SELECT balance INTO _bal FROM public.wallet_balances WHERE user_id = _uid FOR UPDATE;
  IF _bal IS NULL OR _bal < _r.margin THEN RAISE EXCEPTION 'insufficient_balance'; END IF;

  UPDATE public.wallet_balances SET balance = balance - _r.margin, updated_at = now() WHERE user_id = _uid;
  UPDATE public.arena_pool SET balance = balance + _r.margin, total_collected = total_collected + _r.margin, updated_at = now() WHERE id = 1;
  UPDATE public.arena_rounds SET opponent_id = _uid, status = 'open' WHERE id = p_round_id;

  RETURN jsonb_build_object('ok', true);
END $$;

-- Settle round (admin/cron only). Reward = pnl_pct/100 * margin * amp_factor/100, capped by pool.
CREATE OR REPLACE FUNCTION public.arena_settle_round(p_round_id UUID, p_exit_pnl_pct NUMERIC)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _caller UUID := auth.uid(); _r RECORD; _pool BIGINT; _raw_reward NUMERIC; _reward BIGINT;
  _rake BIGINT; _net BIGINT; _winner UUID; _clamped NUMERIC;
BEGIN
  IF _caller IS NULL OR NOT public.has_role(_caller,'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT * INTO _r FROM public.arena_rounds WHERE id = p_round_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'round_not_found'; END IF;
  IF _r.status <> 'open' THEN RAISE EXCEPTION 'not_open'; END IF;

  -- Clamp exit PnL to SL..TP server-side
  _clamped := GREATEST(_r.sl_pct, LEAST(_r.tp_pct, p_exit_pnl_pct));
  _raw_reward := (_clamped / 100.0) * _r.margin * (_r.amp_factor / 100.0);

  IF _r.mode = 'duel' THEN
    -- Winner = round creator if positive, else opponent. Loser forfeits margin.
    _winner := CASE WHEN _clamped >= 0 THEN _r.user_id ELSE _r.opponent_id END;
    -- Winner-take-all of both margins, minus rake
    _reward := _r.margin * 2;
  ELSE
    _winner := _r.user_id;
    -- Solo: payout = margin + raw_reward (can be negative => 0)
    _reward := GREATEST(0, (_r.margin + _raw_reward))::BIGINT;
  END IF;

  -- Cap to pool balance for zero-loss
  SELECT balance INTO _pool FROM public.arena_pool WHERE id = 1 FOR UPDATE;
  _reward := LEAST(_reward, _pool);

  -- Operator rake 10%
  _rake := FLOOR(_reward * 0.10)::BIGINT;
  _net := _reward - _rake;

  IF _net > 0 THEN
    INSERT INTO public.wallet_balances(user_id, balance) VALUES (_winner, _net)
    ON CONFLICT (user_id) DO UPDATE SET balance = public.wallet_balances.balance + _net, updated_at = now();
  END IF;

  UPDATE public.arena_pool
    SET balance = balance - _reward,
        total_paid = total_paid + _net,
        operator_margin = operator_margin + _rake,
        updated_at = now()
   WHERE id = 1;

  UPDATE public.arena_rounds
    SET status = 'settled', exit_pnl_pct = _clamped, reward = _net,
        operator_rake = _rake, winner_id = _winner, settled_at = now()
   WHERE id = p_round_id;

  RETURN jsonb_build_object('ok', true, 'reward', _net, 'rake', _rake, 'winner', _winner);
END $$;

-- Register baseline
INSERT INTO public.function_permissions_baseline(function_name, function_args, allowed_roles, category, note) VALUES
  ('arena_open_round','p_mode text, p_symbol text, p_side text, p_leverage integer, p_margin bigint, p_sl_pct numeric, p_tp_pct numeric', ARRAY['authenticated']::text[], 'arena', 'Phase 5: Arena 라운드 시작 - 서버사이드 SL/TP 강제'),
  ('arena_join_duel','p_round_id uuid', ARRAY['authenticated']::text[], 'arena', 'Phase 5: Duel 모드 두번째 참가자'),
  ('arena_settle_round','p_round_id uuid, p_exit_pnl_pct numeric', ARRAY['authenticated']::text[], 'arena', 'Phase 5: 라운드 정산 - 내부 has_role 가드, 100x 증폭, 풀 캡')
ON CONFLICT (function_name, function_args) DO UPDATE
  SET allowed_roles = EXCLUDED.allowed_roles, note = EXCLUDED.note, updated_at = now();