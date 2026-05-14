
-- ============================================================================
-- Phase C Week 1 — Monetization Engine
-- ============================================================================

-- ---------- atelier_config ----------
CREATE TABLE IF NOT EXISTS public.atelier_config (
  id smallint PRIMARY KEY DEFAULT 1,
  cost_bronze_to_gold int NOT NULL DEFAULT 250,
  cost_gold_to_diamond int NOT NULL DEFAULT 750,
  success_pct int NOT NULL DEFAULT 80,
  fail_pct int NOT NULL DEFAULT 15,
  jackpot_pct int NOT NULL DEFAULT 5,
  jackpot_boost_bonus int NOT NULL DEFAULT 10,
  fail_phon_refund_pct int NOT NULL DEFAULT 50,
  daily_limit_per_user int NOT NULL DEFAULT 25,
  enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT atelier_singleton CHECK (id = 1),
  CONSTRAINT atelier_pct_sum CHECK (success_pct + fail_pct + jackpot_pct = 100)
);
INSERT INTO public.atelier_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
ALTER TABLE public.atelier_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS atelier_config_read ON public.atelier_config;
CREATE POLICY atelier_config_read ON public.atelier_config FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS atelier_config_admin ON public.atelier_config;
CREATE POLICY atelier_config_admin ON public.atelier_config FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ---------- atelier_runs ----------
CREATE TABLE IF NOT EXISTS public.atelier_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  src_type text NOT NULL,
  src_level text NOT NULL,
  cost_phon int NOT NULL,
  outcome text NOT NULL CHECK (outcome IN ('success','fail','jackpot')),
  result_nft_id uuid,
  refund_nft_id uuid,
  refund_phon int NOT NULL DEFAULT 0,
  boost_pct int,
  server_seed_hash text NOT NULL,
  source_ids uuid[] NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_atelier_runs_user_time ON public.atelier_runs(user_id, created_at DESC);
ALTER TABLE public.atelier_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS atelier_runs_self ON public.atelier_runs;
CREATE POLICY atelier_runs_self ON public.atelier_runs FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- ---------- nft_listings ----------
CREATE TABLE IF NOT EXISTS public.nft_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nft_id uuid NOT NULL REFERENCES public.nft_collection(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL,
  price_phon numeric(20,4) NOT NULL CHECK (price_phon > 0),
  kind text NOT NULL DEFAULT 'fixed' CHECK (kind IN ('fixed')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','sold','cancelled','expired')),
  listed_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  closed_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_listing_per_nft
  ON public.nft_listings(nft_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_nft_listings_active ON public.nft_listings(status, listed_at DESC);
ALTER TABLE public.nft_listings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS nft_listings_public ON public.nft_listings;
CREATE POLICY nft_listings_public ON public.nft_listings FOR SELECT TO authenticated USING (true);

-- ---------- nft_trades ----------
CREATE TABLE IF NOT EXISTS public.nft_trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.nft_listings(id),
  nft_id uuid NOT NULL,
  seller_id uuid NOT NULL,
  buyer_id uuid NOT NULL,
  price_phon numeric(20,4) NOT NULL,
  fee_phon numeric(20,4) NOT NULL,
  burn_phon numeric(20,4) NOT NULL,
  pool_phon numeric(20,4) NOT NULL,
  net_to_seller numeric(20,4) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_nft_trades_time ON public.nft_trades(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_nft_trades_seller ON public.nft_trades(seller_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_nft_trades_buyer ON public.nft_trades(buyer_id, created_at DESC);
ALTER TABLE public.nft_trades ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS nft_trades_self ON public.nft_trades;
CREATE POLICY nft_trades_self ON public.nft_trades FOR SELECT TO authenticated
  USING (seller_id = auth.uid() OR buyer_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- ---------- fuse_nft (재작성: 유료 + RNG) ----------
CREATE OR REPLACE FUNCTION public.fuse_nft(_nft_ids uuid[])
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  uid uuid := auth.uid();
  cfg public.atelier_config%ROWTYPE;
  rec record;
  src_type text;
  src_level text;
  next_level text;
  base_boost int;
  cost int;
  v_bal numeric;
  v_today int;
  roll int;
  outcome text;
  new_id uuid;
  refund_nft_id uuid;
  refund_phon int := 0;
  final_boost int;
  seed text;
  seed_hash text;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='42501'; END IF;
  IF _nft_ids IS NULL OR array_length(_nft_ids,1) <> 3 THEN
    RAISE EXCEPTION 'fuse_requires_exactly_3_nfts';
  END IF;

  SELECT * INTO cfg FROM public.atelier_config WHERE id=1;
  IF NOT cfg.enabled THEN RAISE EXCEPTION 'atelier_disabled'; END IF;

  -- daily limit
  SELECT COUNT(*) INTO v_today FROM public.atelier_runs
    WHERE user_id = uid AND created_at > now() - interval '24 hours';
  IF v_today >= cfg.daily_limit_per_user THEN
    RAISE EXCEPTION 'atelier_daily_limit_exceeded';
  END IF;

  -- lock + verify
  SELECT COUNT(*) AS c, MIN(type) AS t_min, MAX(type) AS t_max,
         MIN(level) AS l_min, MAX(level) AS l_max
    INTO rec
    FROM public.nft_collection
   WHERE id = ANY(_nft_ids) AND user_id = uid
     AND COALESCE(locked_for_migration,false) = false
   FOR UPDATE;

  IF rec.c <> 3 THEN RAISE EXCEPTION 'nfts_not_owned_or_locked'; END IF;
  IF rec.t_min <> rec.t_max THEN RAISE EXCEPTION 'fuse_requires_same_type'; END IF;
  IF rec.l_min <> rec.l_max THEN RAISE EXCEPTION 'fuse_requires_same_level'; END IF;

  src_type := rec.t_min; src_level := rec.l_min;

  IF src_level = 'bronze' THEN
    next_level := 'gold'; base_boost := 25; cost := cfg.cost_bronze_to_gold;
  ELSIF src_level = 'gold' THEN
    next_level := 'diamond'; base_boost := 50; cost := cfg.cost_gold_to_diamond;
  ELSE
    RAISE EXCEPTION 'cannot_fuse_diamond';
  END IF;

  -- charge PHON
  SELECT balance INTO v_bal FROM public.phon_balances WHERE user_id = uid FOR UPDATE;
  IF COALESCE(v_bal,0) < cost THEN RAISE EXCEPTION 'insufficient_phon'; END IF;
  UPDATE public.phon_balances SET balance = balance - cost, updated_at = now() WHERE user_id = uid;
  INSERT INTO public.phon_transactions(user_id, amount, kind, ref, meta)
    VALUES (uid, -cost, 'atelier_fuse', src_type||'_'||src_level||'_to_'||next_level, '{}'::jsonb);

  -- RNG
  roll := (floor(random() * 100))::int;
  IF roll < cfg.success_pct THEN outcome := 'success';
  ELSIF roll < cfg.success_pct + cfg.fail_pct THEN outcome := 'fail';
  ELSE outcome := 'jackpot';
  END IF;

  -- server seed hash (audit)
  seed := uid::text || ':' || (now()::text) || ':' || (random()::text);
  seed_hash := encode(digest(seed, 'sha256'),'hex');

  -- always burn the 3 sources
  DELETE FROM public.nft_collection WHERE id = ANY(_nft_ids) AND user_id = uid;

  IF outcome = 'success' THEN
    new_id := gen_random_uuid();
    final_boost := base_boost;
    INSERT INTO public.nft_collection(id,user_id,type,level,boost_pct,source,source_ref,created_at)
      VALUES (new_id, uid, src_type, next_level, final_boost, 'fusion', new_id::text, now());

  ELSIF outcome = 'jackpot' THEN
    new_id := gen_random_uuid();
    final_boost := LEAST(base_boost + cfg.jackpot_boost_bonus, 50);
    INSERT INTO public.nft_collection(id,user_id,type,level,boost_pct,source,source_ref,created_at)
      VALUES (new_id, uid, src_type, next_level, final_boost, 'fusion_jackpot', new_id::text, now());
    -- jackpot 알림
    BEGIN
      PERFORM public.enqueue_fomo_notification(
        uid, 'atelier_jackpot',
        '💎 Atelier 잭팟!',
        '1-in-20 jackpot — '||src_type||' '||next_level||' (+'||final_boost||'%)',
        'view',
        '/empire/atelier',
        jsonb_build_object('type',src_type,'level',next_level,'boost',final_boost),
        2,
        'atelier_jackpot:'||new_id::text
      );
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

  ELSE -- fail
    refund_nft_id := gen_random_uuid();
    final_boost := base_boost / 2;  -- bronze→gold base 25 / 2 = 12 등 (작은 위로)
    -- 재료 1개 반환 (같은 type/level)
    INSERT INTO public.nft_collection(id,user_id,type,level,boost_pct,source,source_ref,created_at)
      VALUES (refund_nft_id, uid, src_type, src_level,
              CASE WHEN src_level='bronze' THEN 10 ELSE 25 END,
              'fusion_fail_refund', refund_nft_id::text, now());
    refund_phon := (cost * cfg.fail_phon_refund_pct / 100)::int;
    IF refund_phon > 0 THEN
      UPDATE public.phon_balances SET balance = balance + refund_phon, updated_at = now() WHERE user_id = uid;
      INSERT INTO public.phon_transactions(user_id,amount,kind,ref,meta)
        VALUES (uid, refund_phon, 'atelier_fuse_refund', 'fail_refund', '{}'::jsonb);
    END IF;
  END IF;

  INSERT INTO public.atelier_runs(user_id, src_type, src_level, cost_phon, outcome, result_nft_id, refund_nft_id, refund_phon, boost_pct, server_seed_hash, source_ids)
    VALUES (uid, src_type, src_level, cost, outcome, new_id, refund_nft_id, refund_phon, final_boost, seed_hash, _nft_ids);

  RETURN jsonb_build_object(
    'ok', true,
    'outcome', outcome,
    'cost_phon', cost,
    'refund_phon', refund_phon,
    'new_nft_id', new_id,
    'refund_nft_id', refund_nft_id,
    'type', src_type,
    'level', CASE WHEN outcome='fail' THEN src_level ELSE next_level END,
    'boost_pct', final_boost,
    'seed_hash', seed_hash
  );
END;
$$;
REVOKE ALL ON FUNCTION public.fuse_nft(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fuse_nft(uuid[]) TO authenticated, service_role;

-- ---------- list_nft ----------
CREATE OR REPLACE FUNCTION public.list_nft(_nft_id uuid, _price_phon numeric)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE uid uuid := auth.uid(); v_owner uuid; v_locked boolean; lid uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  IF _price_phon IS NULL OR _price_phon <= 0 THEN RAISE EXCEPTION 'invalid_price'; END IF;
  IF _price_phon > 10000000 THEN RAISE EXCEPTION 'price_too_high'; END IF;

  SELECT user_id, COALESCE(locked_for_migration,false) INTO v_owner, v_locked
    FROM public.nft_collection WHERE id=_nft_id FOR UPDATE;
  IF v_owner IS NULL THEN RAISE EXCEPTION 'nft_not_found'; END IF;
  IF v_owner <> uid THEN RAISE EXCEPTION 'not_owner'; END IF;
  IF v_locked THEN RAISE EXCEPTION 'nft_locked'; END IF;

  IF EXISTS (SELECT 1 FROM public.nft_listings WHERE nft_id=_nft_id AND status='active') THEN
    RAISE EXCEPTION 'already_listed';
  END IF;

  INSERT INTO public.nft_listings(nft_id, seller_id, price_phon, kind, status)
    VALUES (_nft_id, uid, _price_phon, 'fixed', 'active')
    RETURNING id INTO lid;

  RETURN jsonb_build_object('ok',true,'listing_id',lid);
END; $$;
REVOKE ALL ON FUNCTION public.list_nft(uuid,numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_nft(uuid,numeric) TO authenticated, service_role;

-- ---------- cancel_listing ----------
CREATE OR REPLACE FUNCTION public.cancel_listing(_listing_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE uid uuid := auth.uid(); v_seller uuid; v_status text;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  SELECT seller_id, status INTO v_seller, v_status FROM public.nft_listings
    WHERE id=_listing_id FOR UPDATE;
  IF v_seller IS NULL THEN RAISE EXCEPTION 'listing_not_found'; END IF;
  IF v_seller <> uid AND NOT public.has_role(uid,'admin') THEN RAISE EXCEPTION 'not_seller'; END IF;
  IF v_status <> 'active' THEN RAISE EXCEPTION 'listing_not_active'; END IF;

  UPDATE public.nft_listings SET status='cancelled', closed_at=now() WHERE id=_listing_id;
  RETURN jsonb_build_object('ok',true);
END; $$;
REVOKE ALL ON FUNCTION public.cancel_listing(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_listing(uuid) TO authenticated, service_role;

-- ---------- buy_nft ----------
CREATE OR REPLACE FUNCTION public.buy_nft(_listing_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  uid uuid := auth.uid();
  l record;
  v_buyer_bal numeric;
  v_fee numeric;
  v_burn numeric;
  v_pool numeric;
  v_net numeric;
  trade_id uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;

  SELECT * INTO l FROM public.nft_listings WHERE id=_listing_id FOR UPDATE;
  IF l.id IS NULL THEN RAISE EXCEPTION 'listing_not_found'; END IF;
  IF l.status <> 'active' THEN RAISE EXCEPTION 'listing_not_active'; END IF;
  IF l.seller_id = uid THEN RAISE EXCEPTION 'cannot_buy_own_listing'; END IF;

  -- buyer balance
  SELECT balance INTO v_buyer_bal FROM public.phon_balances WHERE user_id=uid FOR UPDATE;
  IF COALESCE(v_buyer_bal,0) < l.price_phon THEN RAISE EXCEPTION 'insufficient_phon'; END IF;

  -- fees: 6% total = 3% burn + 3% pool
  v_fee  := round(l.price_phon * 0.06, 4);
  v_burn := round(l.price_phon * 0.03, 4);
  v_pool := v_fee - v_burn;
  v_net  := l.price_phon - v_fee;

  -- debit buyer
  UPDATE public.phon_balances SET balance = balance - l.price_phon, updated_at=now() WHERE user_id=uid;
  INSERT INTO public.phon_transactions(user_id,amount,kind,ref,meta)
    VALUES (uid, -l.price_phon, 'marketplace_buy', l.id::text,
            jsonb_build_object('nft_id', l.nft_id, 'seller', l.seller_id));

  -- credit seller (net)
  INSERT INTO public.phon_balances(user_id, balance, updated_at)
    VALUES (l.seller_id, v_net, now())
    ON CONFLICT (user_id) DO UPDATE SET balance = phon_balances.balance + EXCLUDED.balance, updated_at = now();
  INSERT INTO public.phon_transactions(user_id,amount,kind,ref,meta)
    VALUES (l.seller_id, v_net, 'marketplace_sell', l.id::text,
            jsonb_build_object('nft_id', l.nft_id, 'buyer', uid, 'fee', v_fee));

  -- transfer NFT ownership (bypass guard via session var)
  PERFORM set_config('app.allow_nft_transfer', 'true', true);
  UPDATE public.nft_collection SET user_id = uid WHERE id = l.nft_id AND user_id = l.seller_id;
  PERFORM set_config('app.allow_nft_transfer', 'false', true);

  -- close listing
  UPDATE public.nft_listings SET status='sold', closed_at=now() WHERE id=l.id;

  -- record trade
  INSERT INTO public.nft_trades(listing_id, nft_id, seller_id, buyer_id, price_phon, fee_phon, burn_phon, pool_phon, net_to_seller)
    VALUES (l.id, l.nft_id, l.seller_id, uid, l.price_phon, v_fee, v_burn, v_pool, v_net)
    RETURNING id INTO trade_id;

  RETURN jsonb_build_object(
    'ok', true,
    'trade_id', trade_id,
    'price_phon', l.price_phon,
    'fee_phon', v_fee,
    'net_to_seller', v_net
  );
END; $$;
REVOKE ALL ON FUNCTION public.buy_nft(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.buy_nft(uuid) TO authenticated, service_role;

-- ---------- NFT ownership transfer guard ----------
CREATE OR REPLACE FUNCTION public.guard_nft_ownership_transfer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    IF current_setting('app.allow_nft_transfer', true) = 'true' THEN
      RETURN NEW;
    END IF;
    IF public.has_role(auth.uid(),'admin') THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'nft_ownership_transfer_blocked';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_guard_nft_ownership ON public.nft_collection;
CREATE TRIGGER trg_guard_nft_ownership
BEFORE UPDATE ON public.nft_collection
FOR EACH ROW EXECUTE FUNCTION public.guard_nft_ownership_transfer();

-- ---------- function_permissions_baseline 등록 ----------
INSERT INTO public.function_permissions_baseline (function_name, function_args, allowed_roles, category, note)
VALUES
  ('list_nft', 'uuid, numeric', ARRAY['authenticated','service_role'], 'marketplace',
   'List owned NFT for fixed-price sale. Phase C-1.'),
  ('cancel_listing', 'uuid', ARRAY['authenticated','service_role'], 'marketplace',
   'Cancel own active listing (admin can cancel any).'),
  ('buy_nft', 'uuid', ARRAY['authenticated','service_role'], 'marketplace',
   'Buy active NFT listing with PHON. 6% platform fee (3% burn + 3% pool).')
ON CONFLICT (function_name, function_args) DO UPDATE
SET allowed_roles = EXCLUDED.allowed_roles, category = EXCLUDED.category, note = EXCLUDED.note, updated_at = now();

-- fuse_nft 메모 갱신
UPDATE public.function_permissions_baseline
SET note = 'PAID fusion (PHON cost) with 80/15/5 RNG: success/fail(refund)/jackpot. Phase C-1.',
    updated_at = now()
WHERE function_name='fuse_nft';
