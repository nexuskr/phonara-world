
-- ============================================================
-- 1. nft_collection table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.nft_collection (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL CHECK (type IN ('crown','emperor','founder')),
  level text NOT NULL CHECK (level IN ('bronze','gold','diamond')),
  boost_pct integer NOT NULL DEFAULT 0 CHECK (boost_pct BETWEEN 0 AND 50),
  source text NOT NULL CHECK (source IN ('deposit','baron','founding','admin')),
  source_ref text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_nft_collection_idem
  ON public.nft_collection(user_id, source, source_ref);
CREATE INDEX IF NOT EXISTS idx_nft_collection_user
  ON public.nft_collection(user_id, created_at DESC);

ALTER TABLE public.nft_collection ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS nft_select_own ON public.nft_collection;
CREATE POLICY nft_select_own ON public.nft_collection
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS nft_admin_all ON public.nft_collection;
CREATE POLICY nft_admin_all ON public.nft_collection
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

ALTER PUBLICATION supabase_realtime ADD TABLE public.nft_collection;

-- ============================================================
-- 2. Internal helpers (SECURITY DEFINER, NOT exposed to clients)
-- ============================================================
CREATE OR REPLACE FUNCTION public._get_total_boost_pct_for(_user uuid)
RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT LEAST(100, COALESCE(SUM(boost_pct),0))::int
  FROM public.nft_collection WHERE user_id = _user;
$$;

CREATE OR REPLACE FUNCTION public._get_max_leverage_for(_user uuid)
RETURNS integer
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_phon numeric := 0;
  v_base int;
  v_boost int;
BEGIN
  SELECT COALESCE(balance,0) INTO v_phon
    FROM public.phon_balances WHERE user_id = _user;
  v_base := CASE
    WHEN v_phon >= 5000 THEN 100
    WHEN v_phon >= 1200 THEN 50
    WHEN v_phon >= 500  THEN 25
    ELSE 10
  END;
  v_boost := public._get_total_boost_pct_for(_user);
  RETURN floor(v_base * (1 + v_boost/100.0))::int;
END;
$$;

-- ============================================================
-- 3. User-facing RPCs
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_my_total_boost_pct()
RETURNS integer
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  RETURN public._get_total_boost_pct_for(v_uid);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_max_leverage()
RETURNS integer
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  RETURN public._get_max_leverage_for(v_uid);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_nft_collection()
RETURNS TABLE(
  id uuid, type text, level text, boost_pct int,
  source text, created_at timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  RETURN QUERY
    SELECT n.id, n.type, n.level, n.boost_pct, n.source, n.created_at
      FROM public.nft_collection n
     WHERE n.user_id = v_uid
     ORDER BY n.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_next_nft_threshold()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_phon numeric;
  v_usdt_to_next numeric;
  v_next text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  SELECT COALESCE(balance,0) INTO v_phon
    FROM public.phon_balances WHERE user_id = v_uid;
  -- Convert PHON back to ~USDT (1 USDT = 1300 PHON in deposit credit)
  -- gold = 50,000 KRW threshold, diamond = 100,000 KRW
  -- Simplification: assume 1 USDT ≈ 1,300 KRW
  IF v_phon < 65000 THEN
    v_next := 'gold';
    v_usdt_to_next := ceil((65000 - v_phon) / 1300.0);
  ELSIF v_phon < 130000 THEN
    v_next := 'diamond';
    v_usdt_to_next := ceil((130000 - v_phon) / 1300.0);
  ELSE
    v_next := NULL;
    v_usdt_to_next := 0;
  END IF;
  RETURN jsonb_build_object(
    'next_level', v_next,
    'usdt_needed', v_usdt_to_next,
    'krw_needed', v_usdt_to_next * 1300
  );
END;
$$;

-- ============================================================
-- 4. Internal grant functions (called by credit_crypto_deposit only)
-- ============================================================
CREATE OR REPLACE FUNCTION public.grant_phon_for_deposit(
  _user uuid, _phon numeric, _ref text
) RETURNS numeric
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_bonus numeric;
BEGIN
  -- Only callable by service_role (auth.uid() is null) or admin
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  -- 10% PHON bonus on top of base credit
  v_bonus := floor(_phon * 0.1);
  IF v_bonus <= 0 THEN RETURN 0; END IF;

  -- Idempotency via phon_transactions.ref + meta.kind
  IF EXISTS (
    SELECT 1 FROM public.phon_transactions
     WHERE user_id = _user
       AND ref = _ref
       AND meta->>'bonus_kind' = 'deposit_10pct'
  ) THEN
    RETURN 0;
  END IF;

  INSERT INTO public.phon_balances(user_id, balance, updated_at)
  VALUES (_user, v_bonus, now())
  ON CONFLICT (user_id) DO UPDATE
    SET balance = phon_balances.balance + EXCLUDED.balance,
        updated_at = now();

  INSERT INTO public.phon_transactions(user_id, amount, kind, ref, meta)
  VALUES (_user, v_bonus, 'deposit_usdt', _ref,
          jsonb_build_object('bonus_kind','deposit_10pct'));

  RETURN v_bonus;
END;
$$;

CREATE OR REPLACE FUNCTION public.grant_nft_for_deposit(
  _user uuid, _phon numeric, _ref text, _is_first boolean
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_level text;
  v_boost int;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  -- Tier by PHON granted (proxy for KRW: 1 USDT ≈ 1,300 PHON, 100k KRW ≈ 100k PHON)
  IF _phon >= 130000 THEN
    v_level := 'diamond'; v_boost := 25;
  ELSIF _phon >= 65000 THEN
    v_level := 'gold';    v_boost := 15;
  ELSE
    v_level := 'bronze';  v_boost := 5;
  END IF;

  IF _is_first THEN v_boost := v_boost + 10; END IF;

  INSERT INTO public.nft_collection(user_id, type, level, boost_pct, source, source_ref)
  VALUES (_user, 'crown', v_level, v_boost, 'deposit', _ref)
  ON CONFLICT (user_id, source, source_ref) DO NOTHING;

  RETURN jsonb_build_object(
    'level', v_level, 'type','crown',
    'boost_pct', v_boost, 'first_bonus', _is_first
  );
END;
$$;

-- ============================================================
-- 5. Patch credit_crypto_deposit to call grants and extend response
-- ============================================================
CREATE OR REPLACE FUNCTION public.credit_crypto_deposit(
  _tx_hash text, _amount numeric, _from_addr text, _to_addr text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $function$
DECLARE
  v_intent public.crypto_deposit_intents;
  v_phon numeric;
  v_caller_uid uuid := auth.uid();
  v_first boolean;
  v_phon_bonus numeric;
  v_nft jsonb;
  v_max_lev int;
BEGIN
  IF v_caller_uid IS NOT NULL AND NOT public.has_role(v_caller_uid, 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF _tx_hash IS NULL OR length(_tx_hash) < 8 THEN
    RAISE EXCEPTION 'invalid_tx_hash';
  END IF;
  IF EXISTS (SELECT 1 FROM public.crypto_deposit_intents WHERE matched_tx_hash = _tx_hash) THEN
    RETURN jsonb_build_object('status','duplicate','tx_hash',_tx_hash);
  END IF;

  SELECT * INTO v_intent FROM public.crypto_deposit_intents
   WHERE status='pending' AND expires_at > now()
     AND round(unique_amount,4) = round(_amount,4)
     AND lower(receive_address) = lower(_to_addr)
   ORDER BY created_at ASC LIMIT 1;

  IF v_intent.id IS NULL THEN
    RETURN jsonb_build_object('status','no_match','amount',_amount);
  END IF;

  UPDATE public.crypto_deposit_intents
     SET status='filled', matched_tx_hash=_tx_hash,
         matched_from_addr=_from_addr, matched_at=now()
   WHERE id = v_intent.id;

  v_phon := round(v_intent.unique_amount * 1300);

  -- First-deposit detection BEFORE inserting base credit
  v_first := NOT EXISTS (
    SELECT 1 FROM public.phon_transactions
     WHERE user_id = v_intent.user_id AND kind = 'deposit_usdt'
  );

  -- Base PHON credit
  INSERT INTO public.phon_balances(user_id, balance, updated_at)
  VALUES (v_intent.user_id, v_phon, now())
  ON CONFLICT (user_id) DO UPDATE
    SET balance = phon_balances.balance + EXCLUDED.balance,
        updated_at = now();

  INSERT INTO public.phon_transactions(user_id, amount, kind, ref, meta)
  VALUES (v_intent.user_id, v_phon, 'deposit_usdt', _tx_hash,
          jsonb_build_object('usdt', v_intent.unique_amount,
                             'from', _from_addr, 'to', _to_addr,
                             'intent_id', v_intent.id));

  -- Bonus PHON (10%) + NFT
  v_phon_bonus := public.grant_phon_for_deposit(v_intent.user_id, v_phon, _tx_hash);
  v_nft        := public.grant_nft_for_deposit(v_intent.user_id, v_phon, _tx_hash, v_first);
  v_max_lev    := public._get_max_leverage_for(v_intent.user_id);

  RETURN jsonb_build_object(
    'status','credited',
    'user_id', v_intent.user_id,
    'usdt', v_intent.unique_amount,
    'phon', v_phon,
    'phon_bonus', v_phon_bonus,
    'nft_level', v_nft->>'level',
    'nft_type',  v_nft->>'type',
    'boost_pct', (v_nft->>'boost_pct')::int,
    'first_bonus', v_first,
    'max_leverage', v_max_lev,
    'intent_id', v_intent.id
  );
END;
$function$;

-- ============================================================
-- 6. Leverage gate trigger on live_positions
-- ============================================================
CREATE OR REPLACE FUNCTION public.trg_enforce_leverage_gate()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_max int;
BEGIN
  -- Only enforce against the position's owner, not service_role/admin maintenance
  IF NEW.user_id IS NULL THEN RETURN NEW; END IF;
  v_max := public._get_max_leverage_for(NEW.user_id);
  IF NEW.leverage > v_max THEN
    RAISE EXCEPTION 'leverage_exceeds_phon_tier'
      USING DETAIL = jsonb_build_object('requested', NEW.leverage, 'max', v_max)::text;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_leverage_gate ON public.live_positions;
CREATE TRIGGER trg_enforce_leverage_gate
BEFORE INSERT ON public.live_positions
FOR EACH ROW EXECUTE FUNCTION public.trg_enforce_leverage_gate();

-- ============================================================
-- 7. Permissions baseline registration
-- ============================================================
INSERT INTO public.function_permissions_baseline(function_name, function_args, allowed_roles, category, note)
VALUES
  ('_get_total_boost_pct_for', '_user uuid', '{}', 'system_only', 'NFT boost helper'),
  ('_get_max_leverage_for',    '_user uuid', '{}', 'system_only', 'Leverage gate helper'),
  ('get_my_total_boost_pct',   '',           '{authenticated}', 'user_self', 'Own NFT boost'),
  ('get_my_max_leverage',      '',           '{authenticated}', 'user_self', 'Own max leverage'),
  ('get_my_nft_collection',    '',           '{authenticated}', 'user_self', 'Own NFT list'),
  ('get_next_nft_threshold',   '',           '{authenticated}', 'user_self', 'Next NFT tier hint'),
  ('grant_phon_for_deposit',   '_user uuid, _phon numeric, _ref text', '{}', 'system_only', 'Internal: deposit PHON bonus'),
  ('grant_nft_for_deposit',    '_user uuid, _phon numeric, _ref text, _is_first boolean', '{}', 'system_only', 'Internal: deposit NFT grant'),
  ('trg_enforce_leverage_gate','',           '{}', 'system_only', 'BEFORE INSERT trigger on live_positions')
ON CONFLICT (function_name, function_args) DO UPDATE
  SET allowed_roles = EXCLUDED.allowed_roles,
      category = EXCLUDED.category,
      note = EXCLUDED.note,
      updated_at = now();

-- Restrict execution
REVOKE ALL ON FUNCTION public._get_total_boost_pct_for(uuid) FROM public, authenticated, anon;
REVOKE ALL ON FUNCTION public._get_max_leverage_for(uuid) FROM public, authenticated, anon;
REVOKE ALL ON FUNCTION public.grant_phon_for_deposit(uuid, numeric, text) FROM public, authenticated, anon;
REVOKE ALL ON FUNCTION public.grant_nft_for_deposit(uuid, numeric, text, boolean) FROM public, authenticated, anon;

GRANT EXECUTE ON FUNCTION public.get_my_total_boost_pct() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_max_leverage()    TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_nft_collection()  TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_next_nft_threshold() TO authenticated;
