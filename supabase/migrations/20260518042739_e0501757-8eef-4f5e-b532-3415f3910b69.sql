
-- ============================================================
-- Phase 4 Phase 1: Observer Mode Onboarding Ignition
-- All new objects: imperial_ prefix. Atomic + Idempotent + Observable.
-- Money-flow 8 paths: UNTOUCHED (no edits to imperial_place_phon_bet,
-- _settle_*, _apply_house_edge_split, credit_crypto_deposit,
-- request_withdrawal, apply_token_burn, _grant_phon_for_deposit,
-- _grant_nft_for_deposit).
-- ============================================================

-- 1. Grants ledger
CREATE TABLE IF NOT EXISTS public.imperial_onboarding_grants (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL,
  source       text NOT NULL CHECK (source IN ('signup','daily_login','invite')),
  amount_phon  numeric NOT NULL CHECK (amount_phon > 0),
  granted_at   timestamptz NOT NULL DEFAULT now(),
  granted_date date NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date,
  meta         jsonb NOT NULL DEFAULT '{}'::jsonb
);

-- One signup grant per user
CREATE UNIQUE INDEX IF NOT EXISTS imperial_onboarding_grants_signup_uniq
  ON public.imperial_onboarding_grants(user_id)
  WHERE source = 'signup';

-- One daily_login grant per user per UTC day
CREATE UNIQUE INDEX IF NOT EXISTS imperial_onboarding_grants_daily_uniq
  ON public.imperial_onboarding_grants(user_id, granted_date)
  WHERE source = 'daily_login';

CREATE INDEX IF NOT EXISTS imperial_onboarding_grants_user_idx
  ON public.imperial_onboarding_grants(user_id, granted_at DESC);

ALTER TABLE public.imperial_onboarding_grants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS imperial_onboarding_grants_self_read ON public.imperial_onboarding_grants;
CREATE POLICY imperial_onboarding_grants_self_read
  ON public.imperial_onboarding_grants FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

-- No INSERT/UPDATE/DELETE policies — only SECURITY DEFINER RPCs write.

-- 2. RPC: claim signup bonus (15,000 PHON, one-time)
CREATE OR REPLACE FUNCTION public.imperial_claim_signup_bonus()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid     uuid := auth.uid();
  v_amount  numeric := 15000;
  v_existing record;
  v_new_balance numeric;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000';
  END IF;

  -- Idempotent: if already claimed, return existing state
  SELECT * INTO v_existing
  FROM public.imperial_onboarding_grants
  WHERE user_id = v_uid AND source = 'signup'
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'status','already_claimed',
      'amount_phon', v_existing.amount_phon,
      'granted_at', v_existing.granted_at
    );
  END IF;

  -- Atomic: insert grant + credit balance in single tx
  INSERT INTO public.imperial_onboarding_grants(user_id, source, amount_phon, meta)
  VALUES (v_uid, 'signup', v_amount, jsonb_build_object('phase','observer','tier',0));

  INSERT INTO public.phon_balances(user_id, balance)
  VALUES (v_uid, v_amount)
  ON CONFLICT (user_id) DO UPDATE
    SET balance = phon_balances.balance + EXCLUDED.balance,
        updated_at = now()
  RETURNING balance INTO v_new_balance;

  -- Observability
  BEGIN
    PERFORM public.imperial_log_observability(
      'onboarding',
      'info',
      jsonb_build_object('kind','signup_bonus','user_id',v_uid,'amount',v_amount)
    );
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN jsonb_build_object(
    'status','granted',
    'amount_phon', v_amount,
    'new_balance', v_new_balance
  );
END;
$$;

REVOKE ALL ON FUNCTION public.imperial_claim_signup_bonus() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.imperial_claim_signup_bonus() TO authenticated;

-- 3. RPC: claim daily login bonus (500 PHON, once per UTC day)
CREATE OR REPLACE FUNCTION public.imperial_claim_daily_login_bonus()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid     uuid := auth.uid();
  v_amount  numeric := 500;
  v_today   date := (now() AT TIME ZONE 'UTC')::date;
  v_existing record;
  v_new_balance numeric;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000';
  END IF;

  SELECT * INTO v_existing
  FROM public.imperial_onboarding_grants
  WHERE user_id = v_uid
    AND source = 'daily_login'
    AND granted_date = v_today
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'status','already_claimed',
      'amount_phon', v_existing.amount_phon,
      'next_reset_at', ((v_today + 1)::timestamp AT TIME ZONE 'UTC')
    );
  END IF;

  INSERT INTO public.imperial_onboarding_grants(user_id, source, amount_phon, meta, granted_date)
  VALUES (v_uid, 'daily_login', v_amount, jsonb_build_object('phase','observer'), v_today);

  INSERT INTO public.phon_balances(user_id, balance)
  VALUES (v_uid, v_amount)
  ON CONFLICT (user_id) DO UPDATE
    SET balance = phon_balances.balance + EXCLUDED.balance,
        updated_at = now()
  RETURNING balance INTO v_new_balance;

  BEGIN
    PERFORM public.imperial_log_observability(
      'onboarding',
      'info',
      jsonb_build_object('kind','daily_login_bonus','user_id',v_uid,'amount',v_amount)
    );
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN jsonb_build_object(
    'status','granted',
    'amount_phon', v_amount,
    'new_balance', v_new_balance,
    'next_reset_at', ((v_today + 1)::timestamp AT TIME ZONE 'UTC')
  );
END;
$$;

REVOKE ALL ON FUNCTION public.imperial_claim_daily_login_bonus() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.imperial_claim_daily_login_bonus() TO authenticated;

-- 4. RPC: onboarding state
CREATE OR REPLACE FUNCTION public.imperial_get_onboarding_state()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_today date := (now() AT TIME ZONE 'UTC')::date;
  v_signup boolean;
  v_daily  boolean;
  v_total  numeric;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('signup_claimed', false, 'daily_claimed_today', false);
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.imperial_onboarding_grants
    WHERE user_id = v_uid AND source='signup'
  ) INTO v_signup;

  SELECT EXISTS(
    SELECT 1 FROM public.imperial_onboarding_grants
    WHERE user_id = v_uid AND source='daily_login' AND granted_date = v_today
  ) INTO v_daily;

  SELECT COALESCE(SUM(amount_phon),0)
  FROM public.imperial_onboarding_grants
  WHERE user_id = v_uid
  INTO v_total;

  RETURN jsonb_build_object(
    'signup_claimed', v_signup,
    'daily_claimed_today', v_daily,
    'next_reset_at', ((v_today + 1)::timestamp AT TIME ZONE 'UTC'),
    'total_granted_phon', v_total
  );
END;
$$;

REVOKE ALL ON FUNCTION public.imperial_get_onboarding_state() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.imperial_get_onboarding_state() TO authenticated;

-- 5. Register in permission baseline
INSERT INTO public.function_permissions_baseline(function_name, function_args, allowed_roles, category, note) VALUES
  ('imperial_claim_signup_bonus',      '',  ARRAY['authenticated']::text[], 'onboarding', 'Phase 4 P1: 15k PHON welcome (idempotent)'),
  ('imperial_claim_daily_login_bonus', '',  ARRAY['authenticated']::text[], 'onboarding', 'Phase 4 P1: 500 PHON daily login (UTC)'),
  ('imperial_get_onboarding_state',    '',  ARRAY['authenticated']::text[], 'onboarding', 'Phase 4 P1: onboarding state snapshot')
ON CONFLICT (function_name, function_args) DO UPDATE
  SET allowed_roles = EXCLUDED.allowed_roles,
      category = EXCLUDED.category,
      note = EXCLUDED.note;
