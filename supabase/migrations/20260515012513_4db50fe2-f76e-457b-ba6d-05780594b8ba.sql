
-- 1. slot_games
CREATE TABLE IF NOT EXISTS public.slot_games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  studio TEXT NOT NULL DEFAULT 'Phonara Gaming',
  rtp NUMERIC(5,2) NOT NULL DEFAULT 96.00,
  max_multiplier INTEGER NOT NULL DEFAULT 1000,
  rows INTEGER NOT NULL DEFAULT 3,
  reels INTEGER NOT NULL DEFAULT 5,
  paylines INTEGER NOT NULL DEFAULT 20,
  min_bet_phon NUMERIC NOT NULL DEFAULT 1,
  max_bet_phon NUMERIC NOT NULL DEFAULT 100,
  buy_bonus_multiplier INTEGER NOT NULL DEFAULT 100,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.slot_games ENABLE ROW LEVEL SECURITY;
CREATE POLICY "slot_games_public_active_select" ON public.slot_games FOR SELECT USING (active = true);
CREATE POLICY "slot_games_admin_all" ON public.slot_games FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2. slot_spins
CREATE TABLE IF NOT EXISTS public.slot_spins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  game_code TEXT NOT NULL,
  bet_phon NUMERIC NOT NULL,
  payout_phon NUMERIC NOT NULL DEFAULT 0,
  symbols JSONB NOT NULL,
  win_lines JSONB NOT NULL DEFAULT '[]'::jsonb,
  bonus_triggered BOOLEAN NOT NULL DEFAULT false,
  bonus_multiplier INTEGER,
  is_buy_bonus BOOLEAN NOT NULL DEFAULT false,
  server_seed_hash TEXT NOT NULL,
  server_seed_revealed TEXT NOT NULL,
  client_seed TEXT NOT NULL,
  nonce BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_slot_spins_user_created ON public.slot_spins(user_id, created_at DESC);
ALTER TABLE public.slot_spins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "slot_spins_owner_select" ON public.slot_spins FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "slot_spins_admin_select" ON public.slot_spins FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- 3. slot_demo_balances
CREATE TABLE IF NOT EXISTS public.slot_demo_balances (
  user_id UUID PRIMARY KEY,
  balance_chips NUMERIC NOT NULL DEFAULT 10000,
  last_refill_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.slot_demo_balances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "slot_demo_balances_owner_select" ON public.slot_demo_balances FOR SELECT USING (auth.uid() = user_id);

INSERT INTO public.slot_games (game_code, name, studio, rtp, max_multiplier, rows, reels, paylines, min_bet_phon, max_bet_phon, buy_bonus_multiplier)
VALUES ('olympus_1000', 'Olympus 1000 by Phonara', 'Phonara Gaming', 96.00, 1000, 3, 5, 20, 1, 100, 100)
ON CONFLICT (game_code) DO NOTHING;

-- ============================================
-- RNG (Mulberry32 in plpgsql)
-- ============================================
CREATE OR REPLACE FUNCTION public._slot_mulberry32(_seed BIGINT, _index INTEGER)
RETURNS NUMERIC
LANGUAGE plpgsql IMMUTABLE
SET search_path = public
AS $$
DECLARE s BIGINT; t BIGINT;
BEGIN
  s := ((_seed + (_index::BIGINT * 1831565813)) & x'FFFFFFFF'::BIGINT);
  t := (s + x'6D2B79F5'::BIGINT) & x'FFFFFFFF'::BIGINT;
  t := ((t # (t >> 15)) * (t | 1)) & x'FFFFFFFF'::BIGINT;
  t := (t # (t + ((t # (t >> 7)) * (t | 61)))) & x'FFFFFFFF'::BIGINT;
  RETURN ((t # (t >> 14)) & x'FFFFFFFF'::BIGINT)::NUMERIC / 4294967296::NUMERIC;
END; $$;

CREATE OR REPLACE FUNCTION public._slot_compute_spin(
  _server_seed TEXT, _client_seed TEXT, _nonce BIGINT, _is_buy_bonus BOOLEAN, _rtp_boost_pct NUMERIC DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql IMMUTABLE
SET search_path = public, extensions
AS $$
DECLARE
  combined_seed BIGINT; reel INT; row_i INT; rnd NUMERIC; sym INT;
  symbols INT[][] := ARRAY[ARRAY[0,0,0,0,0],ARRAY[0,0,0,0,0],ARRAY[0,0,0,0,0]];
  symbol_weights INT[] := ARRAY[28,26,22,18,14,10,8,6,3,2,3];
  total_weight INT := 0; cum INT; w INT; i INT;
  scatter_count INT := 0; bonus_triggered BOOLEAN := false; bonus_mult INT := 0;
  paylines INT[][] := ARRAY[
    ARRAY[1,1,1,1,1], ARRAY[0,0,0,0,0], ARRAY[2,2,2,2,2],
    ARRAY[0,1,2,1,0], ARRAY[2,1,0,1,2],
    ARRAY[0,0,1,2,2], ARRAY[2,2,1,0,0],
    ARRAY[1,0,1,2,1], ARRAY[1,2,1,0,1],
    ARRAY[0,1,1,1,0], ARRAY[2,1,1,1,2],
    ARRAY[1,0,0,0,1], ARRAY[1,2,2,2,1],
    ARRAY[0,1,0,1,0], ARRAY[2,1,2,1,2],
    ARRAY[1,1,0,1,1], ARRAY[1,1,2,1,1],
    ARRAY[0,0,2,0,0], ARRAY[2,2,0,2,2],
    ARRAY[0,2,1,2,0]
  ];
  payouts NUMERIC[][] := ARRAY[
    ARRAY[0.2,0.5,1.5], ARRAY[0.2,0.5,1.5], ARRAY[0.3,0.8,2.0], ARRAY[0.4,1.0,2.5], ARRAY[0.5,1.5,4.0],
    ARRAY[1.0,3.0,8.0], ARRAY[1.5,5.0,12.0], ARRAY[2.5,8.0,25.0], ARRAY[5.0,20.0,60.0], ARRAY[5.0,20.0,60.0], ARRAY[0,0,0]
  ];
  total_payout_mult NUMERIC := 0; win_lines JSONB := '[]'::jsonb;
  line_idx INT; line_first INT; line_count INT; match_sym INT; cell_sym INT; k INT;
  bonus_segs NUMERIC[] := ARRAY[2,3,5,10,20,50,100,1000];
  bonus_w INT[] := ARRAY[300,250,180,130,80,40,18,2];
  bonus_w_total INT := 0; bonus_rnd NUMERIC; bonus_cum INT;
BEGIN
  combined_seed := ('x' || substr(encode(extensions.digest(_server_seed || ':' || _client_seed || ':' || _nonce::text, 'sha256'), 'hex'), 1, 12))::BIT(48)::BIGINT;
  FOREACH w IN ARRAY symbol_weights LOOP total_weight := total_weight + w; END LOOP;

  FOR reel IN 0..4 LOOP
    FOR row_i IN 0..2 LOOP
      rnd := public._slot_mulberry32(combined_seed, reel * 3 + row_i);
      cum := 0; sym := 0;
      FOR i IN 1..array_length(symbol_weights,1) LOOP
        cum := cum + symbol_weights[i];
        IF rnd * total_weight < cum THEN sym := i - 1; EXIT; END IF;
      END LOOP;
      symbols[row_i + 1][reel + 1] := sym;
      IF sym = 10 THEN scatter_count := scatter_count + 1; END IF;
    END LOOP;
  END LOOP;

  FOR line_idx IN 1..array_length(paylines,1) LOOP
    line_first := symbols[paylines[line_idx][1] + 1][1];
    IF line_first = 10 THEN CONTINUE; END IF;
    match_sym := line_first;
    IF match_sym = 9 THEN
      FOR k IN 2..5 LOOP
        cell_sym := symbols[paylines[line_idx][k] + 1][k];
        IF cell_sym <> 9 AND cell_sym <> 10 THEN match_sym := cell_sym; EXIT; END IF;
      END LOOP;
    END IF;
    line_count := 1;
    FOR k IN 2..5 LOOP
      cell_sym := symbols[paylines[line_idx][k] + 1][k];
      IF cell_sym = match_sym OR cell_sym = 9 THEN line_count := line_count + 1; ELSE EXIT; END IF;
    END LOOP;
    IF line_count >= 3 AND match_sym BETWEEN 0 AND 9 THEN
      total_payout_mult := total_payout_mult + payouts[match_sym + 1][line_count - 2];
      win_lines := win_lines || jsonb_build_object('line', line_idx, 'symbol', match_sym, 'count', line_count, 'mult', payouts[match_sym + 1][line_count - 2]);
    END IF;
  END LOOP;

  IF scatter_count >= 3 OR _is_buy_bonus THEN
    bonus_triggered := true;
    FOREACH w IN ARRAY bonus_w LOOP bonus_w_total := bonus_w_total + w; END LOOP;
    bonus_rnd := public._slot_mulberry32(combined_seed, 999);
    bonus_cum := 0;
    FOR i IN 1..array_length(bonus_w,1) LOOP
      bonus_cum := bonus_cum + bonus_w[i];
      IF bonus_rnd * bonus_w_total < bonus_cum THEN bonus_mult := bonus_segs[i]::INT; EXIT; END IF;
    END LOOP;
    total_payout_mult := total_payout_mult + bonus_mult;
  END IF;

  IF _rtp_boost_pct > 0 THEN
    total_payout_mult := total_payout_mult * (1 + _rtp_boost_pct / 100.0);
  END IF;
  IF total_payout_mult > 1000 THEN total_payout_mult := 1000; END IF;

  RETURN jsonb_build_object(
    'symbols', to_jsonb(symbols),
    'win_lines', win_lines,
    'payout_mult', total_payout_mult,
    'scatter_count', scatter_count,
    'bonus_triggered', bonus_triggered,
    'bonus_multiplier', bonus_mult
  );
END; $$;

-- ============================================
-- spin_slot_real
-- ============================================
CREATE OR REPLACE FUNCTION public.spin_slot_real(
  _game_code TEXT, _bet_phon NUMERIC, _client_seed TEXT, _is_buy_bonus BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user UUID := auth.uid(); v_game RECORD; v_balance NUMERIC; v_bet_total NUMERIC;
  v_server_seed TEXT; v_server_seed_hash TEXT; v_nonce BIGINT;
  v_result JSONB; v_payout NUMERIC; v_boost_pct NUMERIC := 0;
  v_kill RECORD;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;
  IF public.is_account_frozen(v_user) THEN RAISE EXCEPTION 'account_frozen'; END IF;

  SELECT key, enabled INTO v_kill FROM public.platform_kill_switches WHERE key = 'trading_halt';
  IF FOUND AND v_kill.enabled THEN RAISE EXCEPTION 'trading_halted'; END IF;

  SELECT * INTO v_game FROM public.slot_games WHERE game_code = _game_code AND active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'game_not_found'; END IF;

  IF _bet_phon < v_game.min_bet_phon OR _bet_phon > v_game.max_bet_phon THEN
    RAISE EXCEPTION 'bet_out_of_range';
  END IF;

  v_bet_total := CASE WHEN _is_buy_bonus THEN _bet_phon * v_game.buy_bonus_multiplier ELSE _bet_phon END;

  BEGIN
    SELECT LEAST(public.get_my_total_boost_pct(), 100) * 0.005 INTO v_boost_pct;
    IF v_boost_pct > 0.5 THEN v_boost_pct := 0.5; END IF;
  EXCEPTION WHEN OTHERS THEN v_boost_pct := 0; END;

  SELECT balance INTO v_balance FROM public.phon_balances WHERE user_id = v_user FOR UPDATE;
  IF v_balance IS NULL OR v_balance < v_bet_total THEN RAISE EXCEPTION 'insufficient_phon'; END IF;

  UPDATE public.phon_balances SET balance = balance - v_bet_total, updated_at = now() WHERE user_id = v_user;

  v_server_seed := encode(extensions.gen_random_bytes(32), 'hex');
  v_server_seed_hash := encode(extensions.digest(v_server_seed, 'sha256'), 'hex');
  v_nonce := (extract(epoch from clock_timestamp()) * 1000)::BIGINT;

  v_result := public._slot_compute_spin(v_server_seed, _client_seed, v_nonce, _is_buy_bonus, v_boost_pct);
  v_payout := _bet_phon * (v_result->>'payout_mult')::NUMERIC;

  IF v_payout > 0 THEN
    UPDATE public.phon_balances SET balance = balance + v_payout, updated_at = now() WHERE user_id = v_user;
  END IF;

  INSERT INTO public.slot_spins(user_id, game_code, bet_phon, payout_phon, symbols, win_lines, bonus_triggered, bonus_multiplier, is_buy_bonus, server_seed_hash, server_seed_revealed, client_seed, nonce)
  VALUES (v_user, _game_code, v_bet_total, v_payout, v_result->'symbols', v_result->'win_lines', (v_result->>'bonus_triggered')::BOOLEAN, NULLIF((v_result->>'bonus_multiplier')::INT, 0), _is_buy_bonus, v_server_seed_hash, v_server_seed, _client_seed, v_nonce);

  RETURN jsonb_build_object(
    'symbols', v_result->'symbols',
    'win_lines', v_result->'win_lines',
    'payout_phon', v_payout,
    'bet_phon', v_bet_total,
    'bonus_triggered', v_result->'bonus_triggered',
    'bonus_multiplier', v_result->'bonus_multiplier',
    'server_seed_hash', v_server_seed_hash,
    'server_seed', v_server_seed,
    'client_seed', _client_seed,
    'nonce', v_nonce,
    'rtp_boost_pct', v_boost_pct
  );
END; $$;

REVOKE ALL ON FUNCTION public.spin_slot_real(TEXT, NUMERIC, TEXT, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.spin_slot_real(TEXT, NUMERIC, TEXT, BOOLEAN) TO authenticated;

-- ============================================
-- spin_slot_demo
-- ============================================
CREATE OR REPLACE FUNCTION public.spin_slot_demo(
  _game_code TEXT, _bet_chips NUMERIC, _client_seed TEXT, _is_buy_bonus BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user UUID := auth.uid(); v_game RECORD; v_balance NUMERIC; v_bet_total NUMERIC;
  v_server_seed TEXT; v_nonce BIGINT; v_result JSONB; v_payout NUMERIC;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;
  SELECT * INTO v_game FROM public.slot_games WHERE game_code = _game_code AND active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'game_not_found'; END IF;
  IF _bet_chips <= 0 THEN RAISE EXCEPTION 'bet_invalid'; END IF;

  v_bet_total := CASE WHEN _is_buy_bonus THEN _bet_chips * v_game.buy_bonus_multiplier ELSE _bet_chips END;

  INSERT INTO public.slot_demo_balances(user_id, balance_chips, last_refill_at)
  VALUES (v_user, 10000, now()) ON CONFLICT (user_id) DO NOTHING;

  SELECT balance_chips INTO v_balance FROM public.slot_demo_balances WHERE user_id = v_user FOR UPDATE;
  IF v_balance < v_bet_total THEN RAISE EXCEPTION 'insufficient_demo_chips'; END IF;

  UPDATE public.slot_demo_balances SET balance_chips = balance_chips - v_bet_total, updated_at = now() WHERE user_id = v_user;

  v_server_seed := encode(extensions.gen_random_bytes(32), 'hex');
  v_nonce := (extract(epoch from clock_timestamp()) * 1000)::BIGINT;
  v_result := public._slot_compute_spin(v_server_seed, _client_seed, v_nonce, _is_buy_bonus, 0);
  v_payout := _bet_chips * (v_result->>'payout_mult')::NUMERIC;

  IF v_payout > 0 THEN
    UPDATE public.slot_demo_balances SET balance_chips = balance_chips + v_payout, updated_at = now() WHERE user_id = v_user;
  END IF;

  SELECT balance_chips INTO v_balance FROM public.slot_demo_balances WHERE user_id = v_user;

  RETURN jsonb_build_object(
    'symbols', v_result->'symbols',
    'win_lines', v_result->'win_lines',
    'payout_chips', v_payout,
    'bet_chips', v_bet_total,
    'balance_chips', v_balance,
    'bonus_triggered', v_result->'bonus_triggered',
    'bonus_multiplier', v_result->'bonus_multiplier'
  );
END; $$;

REVOKE ALL ON FUNCTION public.spin_slot_demo(TEXT, NUMERIC, TEXT, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.spin_slot_demo(TEXT, NUMERIC, TEXT, BOOLEAN) TO authenticated;

-- ============================================
-- claim_demo_refill
-- ============================================
CREATE OR REPLACE FUNCTION public.claim_demo_refill()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_user UUID := auth.uid(); v_row RECORD;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;
  INSERT INTO public.slot_demo_balances(user_id, balance_chips, last_refill_at)
  VALUES (v_user, 10000, now()) ON CONFLICT (user_id) DO NOTHING;
  SELECT * INTO v_row FROM public.slot_demo_balances WHERE user_id = v_user FOR UPDATE;
  IF v_row.balance_chips >= 5000 THEN
    RETURN jsonb_build_object('refilled', false, 'balance_chips', v_row.balance_chips, 'reason', 'balance_too_high');
  END IF;
  IF v_row.last_refill_at > now() - interval '1 day' THEN
    RETURN jsonb_build_object('refilled', false, 'balance_chips', v_row.balance_chips, 'reason', 'cooldown');
  END IF;
  UPDATE public.slot_demo_balances SET balance_chips = 10000, last_refill_at = now(), updated_at = now() WHERE user_id = v_user;
  RETURN jsonb_build_object('refilled', true, 'balance_chips', 10000);
END; $$;

REVOKE ALL ON FUNCTION public.claim_demo_refill() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_demo_refill() TO authenticated;

-- Permission baseline
INSERT INTO public.function_permissions_baseline(function_name, function_args, allowed_roles, category, note) VALUES
  ('spin_slot_real', 'text, numeric, text, boolean', ARRAY['authenticated'], 'casino', 'Olympus 1000 real-mode spin'),
  ('spin_slot_demo', 'text, numeric, text, boolean', ARRAY['authenticated'], 'casino', 'Olympus 1000 demo-mode spin'),
  ('claim_demo_refill', '', ARRAY['authenticated'], 'casino', 'Daily demo chip refill')
ON CONFLICT (function_name, function_args) DO UPDATE SET allowed_roles = EXCLUDED.allowed_roles, note = EXCLUDED.note, updated_at = now();
