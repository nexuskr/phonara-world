
CREATE TABLE IF NOT EXISTS public.apex_races (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('daily','weekly')),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  prize_pool_phon numeric(20,4) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','settled','cancelled')),
  settled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.apex_races ENABLE ROW LEVEL SECURITY;
CREATE POLICY "races public read" ON public.apex_races FOR SELECT USING (true);
CREATE POLICY "races admin write" ON public.apex_races FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.apex_race_entries (
  race_id uuid NOT NULL REFERENCES public.apex_races(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  wagered_phon numeric(20,4) NOT NULL DEFAULT 0,
  rank int,
  prize_phon numeric(20,4) NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (race_id, user_id)
);
ALTER TABLE public.apex_race_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "entries owner read" ON public.apex_race_entries FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.apex_race_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  race_id uuid NOT NULL REFERENCES public.apex_races(id),
  user_id uuid NOT NULL,
  amount_phon numeric(20,4) NOT NULL,
  paid_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(race_id, user_id)
);
ALTER TABLE public.apex_race_payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payouts owner read" ON public.apex_race_payouts FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

CREATE INDEX IF NOT EXISTS idx_apex_races_active ON public.apex_races(status, ends_at);
CREATE INDEX IF NOT EXISTS idx_apex_race_entries_wager ON public.apex_race_entries(race_id, wagered_phon DESC);

CREATE TABLE IF NOT EXISTS public.apex_rakeback_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  period text NOT NULL CHECK (period IN ('daily','weekly')),
  period_end timestamptz NOT NULL,
  accrued_phon numeric(20,4) NOT NULL DEFAULT 0,
  paid_phon numeric(20,4) NOT NULL DEFAULT 0,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, period, period_end)
);
ALTER TABLE public.apex_rakeback_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rakeback owner read" ON public.apex_rakeback_ledger FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.apex_withdraw_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  network text NOT NULL CHECK (network IN ('TRC20','ERC20','BSC')),
  address text NOT NULL,
  amount_usdt numeric(20,6) NOT NULL CHECK (amount_usdt > 0),
  fee_usdt numeric(20,6) NOT NULL DEFAULT 0,
  gas_subsidy_usdt numeric(20,6) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed','cancelled')),
  tx_hash text,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  error_message text
);
ALTER TABLE public.apex_withdraw_intents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cashout owner read" ON public.apex_withdraw_intents FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "cashout admin write" ON public.apex_withdraw_intents FOR UPDATE USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE INDEX IF NOT EXISTS idx_apex_withdraw_intents_user ON public.apex_withdraw_intents(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_apex_withdraw_intents_status ON public.apex_withdraw_intents(status, created_at);

CREATE TABLE IF NOT EXISTS public.apex_withdraw_velocity_guards (
  user_id uuid NOT NULL,
  window_start timestamptz NOT NULL,
  count int NOT NULL DEFAULT 0,
  total_usdt numeric(20,6) NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, window_start)
);
ALTER TABLE public.apex_withdraw_velocity_guards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "velocity admin read" ON public.apex_withdraw_velocity_guards FOR SELECT USING (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.apex_get_current_races()
RETURNS TABLE(race_id uuid, kind text, starts_at timestamptz, ends_at timestamptz,
  prize_pool_phon numeric, my_wagered numeric, my_rank int, total_entries bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.id, r.kind, r.starts_at, r.ends_at, r.prize_pool_phon,
    COALESCE(e.wagered_phon, 0), e.rank,
    (SELECT count(*) FROM apex_race_entries WHERE race_id = r.id)
  FROM apex_races r
  LEFT JOIN apex_race_entries e ON e.race_id = r.id AND e.user_id = auth.uid()
  WHERE r.status = 'active' AND r.ends_at > now()
  ORDER BY r.ends_at ASC;
$$;

CREATE OR REPLACE FUNCTION public.apex_get_race_leaderboard(_race_id uuid, _limit int DEFAULT 50)
RETURNS TABLE(rank int, masked_nick text, wagered_phon numeric, prize_phon numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    COALESCE(e.rank, (ROW_NUMBER() OVER (ORDER BY e.wagered_phon DESC))::int),
    COALESCE(LEFT(p.nickname, 2), 'U_') || '***' || COALESCE(RIGHT(p.nickname, 1), ''),
    e.wagered_phon, e.prize_phon
  FROM apex_race_entries e
  LEFT JOIN profiles p ON p.id = e.user_id
  WHERE e.race_id = _race_id
  ORDER BY e.wagered_phon DESC
  LIMIT GREATEST(1, LEAST(_limit, 200));
$$;

CREATE OR REPLACE FUNCTION public.apex_settle_race(_race_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_race apex_races%ROWTYPE;
  v_count int := 0;
  rec record;
  v_share numeric;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR auth.uid() IS NULL) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT * INTO v_race FROM apex_races WHERE id = _race_id FOR UPDATE;
  IF v_race.id IS NULL OR v_race.status <> 'active' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_active');
  END IF;
  WITH ranked AS (
    SELECT user_id, wagered_phon,
      ROW_NUMBER() OVER (ORDER BY wagered_phon DESC) AS rk
    FROM apex_race_entries WHERE race_id = _race_id AND wagered_phon > 0
  )
  UPDATE apex_race_entries e SET rank = r.rk::int
  FROM ranked r WHERE e.race_id = _race_id AND e.user_id = r.user_id;

  FOR rec IN
    SELECT user_id, rank FROM apex_race_entries
    WHERE race_id = _race_id AND rank BETWEEN 1 AND 10 ORDER BY rank
  LOOP
    v_share := CASE rec.rank
      WHEN 1 THEN 0.40 WHEN 2 THEN 0.20 WHEN 3 THEN 0.12
      WHEN 4 THEN 0.08 WHEN 5 THEN 0.06 WHEN 6 THEN 0.04
      WHEN 7 THEN 0.04 WHEN 8 THEN 0.03 WHEN 9 THEN 0.02
      ELSE 0.01 END;
    INSERT INTO apex_race_payouts(race_id, user_id, amount_phon)
    VALUES (_race_id, rec.user_id, ROUND(v_race.prize_pool_phon * v_share, 4))
    ON CONFLICT (race_id, user_id) DO NOTHING;
    UPDATE apex_race_entries SET prize_phon = ROUND(v_race.prize_pool_phon * v_share, 4)
      WHERE race_id = _race_id AND user_id = rec.user_id;
    v_count := v_count + 1;
  END LOOP;

  UPDATE apex_races SET status = 'settled', settled_at = now() WHERE id = _race_id;
  RETURN jsonb_build_object('ok', true, 'paid_count', v_count, 'pool', v_race.prize_pool_phon);
END;
$$;

CREATE OR REPLACE FUNCTION public.apex_claim_rakeback()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_amt numeric := 0;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;
  UPDATE apex_rakeback_ledger
     SET paid_phon = accrued_phon, paid_at = now()
   WHERE user_id = v_uid AND paid_at IS NULL
     AND period_end <= now() AND accrued_phon > paid_phon
   RETURNING accrued_phon - paid_phon INTO v_amt;
  RETURN jsonb_build_object('ok', true, 'claimed_phon', COALESCE(v_amt, 0));
END;
$$;

CREATE OR REPLACE FUNCTION public.apex_request_cashout(_network text, _address text, _amount_usdt numeric)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_aal text; v_count int; v_fee numeric; v_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;
  v_aal := (current_setting('request.jwt.claims', true)::jsonb ->> 'aal');
  IF v_aal IS DISTINCT FROM 'aal2' THEN RAISE EXCEPTION 'aal2_required'; END IF;
  IF _network NOT IN ('TRC20','ERC20','BSC') THEN RAISE EXCEPTION 'bad_network'; END IF;
  IF _amount_usdt < 10 THEN RAISE EXCEPTION 'min_10_usdt'; END IF;
  IF length(coalesce(_address,'')) < 20 THEN RAISE EXCEPTION 'bad_address'; END IF;

  SELECT count(*) INTO v_count FROM apex_withdraw_intents
    WHERE user_id = v_uid AND created_at > now() - interval '10 minutes';
  IF v_count >= 3 THEN
    INSERT INTO anomaly_events(rule, user_id, severity, meta, dedupe_key)
    VALUES ('apex_cashout_velocity', v_uid, 'warn',
            jsonb_build_object('window','10m','count',v_count),
            'apex_cashout_v_' || v_uid::text || '_' || to_char(now(),'YYYYMMDD'))
    ON CONFLICT DO NOTHING;
    RAISE EXCEPTION 'velocity_10m';
  END IF;
  SELECT count(*) INTO v_count FROM apex_withdraw_intents
    WHERE user_id = v_uid AND created_at > now() - interval '1 hour';
  IF v_count >= 5 THEN RAISE EXCEPTION 'velocity_1h'; END IF;

  v_fee := CASE _network WHEN 'TRC20' THEN 1.0 WHEN 'BSC' THEN 0.5 WHEN 'ERC20' THEN 8.0 END;
  INSERT INTO apex_withdraw_intents(user_id, network, address, amount_usdt, fee_usdt)
  VALUES (v_uid, _network, _address, _amount_usdt, v_fee)
  RETURNING id INTO v_id;
  RETURN jsonb_build_object('ok', true, 'intent_id', v_id, 'fee_usdt', v_fee);
END;
$$;

CREATE OR REPLACE FUNCTION public.apex_get_my_cashouts(_limit int DEFAULT 20)
RETURNS SETOF public.apex_withdraw_intents
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT * FROM apex_withdraw_intents WHERE user_id = auth.uid()
  ORDER BY created_at DESC LIMIT GREATEST(1, LEAST(_limit, 100));
$$;

CREATE OR REPLACE FUNCTION public.apex_admin_process_cashout(_intent_id uuid, _tx_hash text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_aal text;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  v_aal := (current_setting('request.jwt.claims', true)::jsonb ->> 'aal');
  IF v_aal IS DISTINCT FROM 'aal2' THEN RAISE EXCEPTION 'aal2_required'; END IF;
  UPDATE apex_withdraw_intents
     SET status='completed', tx_hash=_tx_hash, processed_at=now()
   WHERE id=_intent_id AND status IN ('pending','processing');
  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.apex_get_current_races() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apex_get_race_leaderboard(uuid, int) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apex_claim_rakeback() TO authenticated;
GRANT EXECUTE ON FUNCTION public.apex_request_cashout(text, text, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apex_get_my_cashouts(int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apex_admin_process_cashout(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apex_settle_race(uuid) TO authenticated;
