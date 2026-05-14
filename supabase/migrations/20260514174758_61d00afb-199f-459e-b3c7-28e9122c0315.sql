
-- 1) profiles 컬럼 추가
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS main_nft_id uuid REFERENCES public.nft_collection(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS nft_change_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_nft_change_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_profiles_main_nft_id ON public.profiles(main_nft_id);

-- 2) nft_collection 컬럼 추가
ALTER TABLE public.nft_collection
  ADD COLUMN IF NOT EXISTS external_image_url text,
  ADD COLUMN IF NOT EXISTS external_metadata_url text;

-- 3) guard 트리거 갱신: 새 민감 컬럼 차단
CREATE OR REPLACE FUNCTION public.guard_profile_sensitive_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_is_admin BOOLEAN := COALESCE(public.has_role(auth.uid(), 'admin'), false);
  v_is_definer BOOLEAN := (current_setting('role', true) = 'rds_superuser')
                          OR (auth.role() = 'service_role');
BEGIN
  IF v_is_admin OR v_is_definer THEN RETURN NEW; END IF;

  IF NEW.tier IS DISTINCT FROM OLD.tier
     OR NEW.withdraw_pin_hash IS DISTINCT FROM OLD.withdraw_pin_hash
     OR NEW.total_coin_deposits IS DISTINCT FROM OLD.total_coin_deposits
     OR NEW.total_withdrawn IS DISTINCT FROM OLD.total_withdrawn
     OR NEW.coin_master_unlocked IS DISTINCT FROM OLD.coin_master_unlocked
     OR NEW.referral_code IS DISTINCT FROM OLD.referral_code
     OR NEW.referred_by IS DISTINCT FROM OLD.referred_by
     OR NEW.attendance_streak IS DISTINCT FROM OLD.attendance_streak
     OR NEW.last_attendance IS DISTINCT FROM OLD.last_attendance
     OR NEW.empire_level IS DISTINCT FROM OLD.empire_level
     OR NEW.crown_score IS DISTINCT FROM OLD.crown_score
     OR NEW.main_nft_id IS DISTINCT FROM OLD.main_nft_id
     OR NEW.nft_change_count IS DISTINCT FROM OLD.nft_change_count
     OR NEW.last_nft_change_at IS DISTINCT FROM OLD.last_nft_change_at
  THEN
    RAISE EXCEPTION 'forbidden: sensitive column update requires admin/definer';
  END IF;
  RETURN NEW;
END;
$$;

-- 4) set_main_nft RPC
CREATE OR REPLACE FUNCTION public.set_main_nft(_nft_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_owns boolean;
  v_count int;
  v_last timestamptz;
  v_bal numeric;
  v_cost numeric := 0;
  v_cooldown_remaining_sec int := 0;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;

  -- Allow clearing main NFT
  IF _nft_id IS NULL THEN
    UPDATE public.profiles SET main_nft_id = NULL WHERE id = v_uid;
    RETURN jsonb_build_object('ok', true, 'cleared', true);
  END IF;

  -- Ownership check
  SELECT EXISTS (
    SELECT 1 FROM public.nft_collection
    WHERE id = _nft_id AND user_id = v_uid
  ) INTO v_owns;
  IF NOT v_owns THEN RAISE EXCEPTION 'nft_not_owned'; END IF;

  SELECT nft_change_count, last_nft_change_at
    INTO v_count, v_last
    FROM public.profiles WHERE id = v_uid FOR UPDATE;

  -- Cost & cooldown logic
  IF v_count >= 3 THEN
    v_cost := 100;
    -- 24h cooldown applies from 4th change onwards
    IF v_last IS NOT NULL AND v_last > now() - interval '24 hours' THEN
      v_cooldown_remaining_sec := EXTRACT(EPOCH FROM (v_last + interval '24 hours' - now()))::int;
      RAISE EXCEPTION 'cooldown_active: % seconds remaining', v_cooldown_remaining_sec
        USING ERRCODE = 'P0001';
    END IF;

    -- Charge PHON
    SELECT balance INTO v_bal FROM public.phon_balances
      WHERE user_id = v_uid FOR UPDATE;
    IF COALESCE(v_bal, 0) < v_cost THEN
      RAISE EXCEPTION 'insufficient_phon';
    END IF;
    UPDATE public.phon_balances
      SET balance = balance - v_cost, updated_at = now()
      WHERE user_id = v_uid;
    INSERT INTO public.phon_transactions(user_id, amount, kind, ref, meta)
      VALUES (v_uid, -v_cost, 'main_nft_change', _nft_id::text,
              jsonb_build_object('change_number', v_count + 1));
  END IF;

  -- Apply update (bypasses guard via SECURITY DEFINER)
  UPDATE public.profiles
    SET main_nft_id = _nft_id,
        nft_change_count = v_count + 1,
        last_nft_change_at = now()
    WHERE id = v_uid;

  RETURN jsonb_build_object(
    'ok', true,
    'main_nft_id', _nft_id,
    'cost', v_cost,
    'new_count', v_count + 1,
    'free_remaining', GREATEST(0, 3 - (v_count + 1))
  );
END;
$$;

-- 5) get_main_nft (single)
CREATE OR REPLACE FUNCTION public.get_main_nft(_user_id uuid)
RETURNS TABLE(
  user_id uuid,
  nft_id uuid,
  type text,
  level text,
  boost_pct integer,
  external_image_url text,
  source text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT p.id, n.id, n.type, n.level, n.boost_pct, n.external_image_url, n.source
    FROM public.profiles p
    LEFT JOIN public.nft_collection n ON n.id = p.main_nft_id
   WHERE p.id = _user_id
     AND p.main_nft_id IS NOT NULL;
$$;

-- 6) get_main_nft_batch (for chat / lists)
CREATE OR REPLACE FUNCTION public.get_main_nft_batch(_user_ids uuid[])
RETURNS TABLE(
  user_id uuid,
  nft_id uuid,
  type text,
  level text,
  boost_pct integer,
  external_image_url text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT p.id, n.id, n.type, n.level, n.boost_pct, n.external_image_url
    FROM public.profiles p
    JOIN public.nft_collection n ON n.id = p.main_nft_id
   WHERE p.id = ANY(_user_ids);
$$;

-- 7) get_my_main_nft_status (for change UI: cost/cooldown/free remaining)
CREATE OR REPLACE FUNCTION public.get_my_main_nft_status()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_count int;
  v_last timestamptz;
  v_main uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  SELECT main_nft_id, nft_change_count, last_nft_change_at
    INTO v_main, v_count, v_last
    FROM public.profiles WHERE id = v_uid;
  RETURN jsonb_build_object(
    'main_nft_id', v_main,
    'change_count', COALESCE(v_count, 0),
    'free_remaining', GREATEST(0, 3 - COALESCE(v_count, 0)),
    'next_cost_phon', CASE WHEN COALESCE(v_count,0) >= 3 THEN 100 ELSE 0 END,
    'cooldown_until', CASE WHEN COALESCE(v_count,0) >= 3 AND v_last IS NOT NULL
                           THEN v_last + interval '24 hours' ELSE NULL END
  );
END;
$$;
