-- Phase 7 — Recovery Bonus 무손실 회로 봉합

-- 1) Eligibility table
CREATE TABLE IF NOT EXISTS public.recovery_bonus_eligibility (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  liquidation_amount bigint NOT NULL CHECK (liquidation_amount >= 0),
  eligible_until timestamptz NOT NULL,
  consumed_at timestamptz,
  consumed_event_id uuid,
  source text NOT NULL DEFAULT 'liquidation_watcher',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recovery_elig_user_open
  ON public.recovery_bonus_eligibility(user_id, consumed_at, eligible_until DESC);

ALTER TABLE public.recovery_bonus_eligibility ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own eligibility readable" ON public.recovery_bonus_eligibility;
CREATE POLICY "own eligibility readable"
  ON public.recovery_bonus_eligibility
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- 2) record_recovery_eligibility — admin or service-role only
CREATE OR REPLACE FUNCTION public.record_recovery_eligibility(
  p_user_id uuid,
  p_liquidation_amount bigint,
  p_window_hours int DEFAULT 24,
  p_source text DEFAULT 'liquidation_watcher'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF p_user_id IS NULL OR p_liquidation_amount IS NULL OR p_liquidation_amount <= 0 THEN
    RAISE EXCEPTION 'invalid_input';
  END IF;
  -- only admin or service_role can call directly
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.recovery_bonus_eligibility(user_id, liquidation_amount, eligible_until, source)
  VALUES (p_user_id, p_liquidation_amount, now() + make_interval(hours => p_window_hours), p_source)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_recovery_eligibility(uuid, bigint, int, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_recovery_eligibility(uuid, bigint, int, text) TO service_role;

-- 3) grant_recovery_bonus — 운영자 무손실 회로
CREATE OR REPLACE FUNCTION public.grant_recovery_bonus(
  p_amount bigint,
  p_source text DEFAULT 'new_deposit'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_tier text;
  v_pct smallint;
  v_bonus bigint;
  v_event_id uuid;
  v_elig_id uuid;
  v_pool_balance bigint;
  v_from_pool bigint := 0;
  v_from_new_deposit bigint := 0;
  v_funding text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'auth_required' USING ERRCODE = '28000';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'invalid_amount';
  END IF;

  -- find open eligibility (FIFO)
  SELECT id INTO v_elig_id
  FROM public.recovery_bonus_eligibility
  WHERE user_id = v_uid
    AND consumed_at IS NULL
    AND eligible_until > now()
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE;

  IF v_elig_id IS NULL THEN
    RAISE EXCEPTION 'no_eligibility' USING ERRCODE = '22023',
      DETAIL = '청산 이후 보너스 자격 윈도우가 없거나 만료되었습니다.';
  END IF;

  SELECT lower(tier::text) INTO v_tier FROM public.profiles WHERE id = v_uid;
  v_tier := COALESCE(v_tier, 'normal');

  v_pct := CASE v_tier
    WHEN 'empire' THEN 60
    WHEN 'god'    THEN 50
    WHEN 'vip'    THEN 40
    ELSE 20
  END;
  v_bonus := (p_amount * v_pct) / 100;

  -- funding circuit (운영자 무손실): pool 우선, 부족분은 새 입금분에서 충당
  SELECT COALESCE(amount, 0) INTO v_pool_balance FROM public.jackpot_pool WHERE id = 1 FOR UPDATE;

  v_from_pool := LEAST(v_bonus, GREATEST(v_pool_balance, 0));
  v_from_new_deposit := v_bonus - v_from_pool;

  -- 새 입금분 충당이 입금 금액을 초과할 수 없음 → 부족하면 보너스 캡
  IF v_from_new_deposit > p_amount THEN
    v_from_new_deposit := p_amount;
    v_bonus := v_from_pool + v_from_new_deposit;
  END IF;

  -- 풀에서 차감
  IF v_from_pool > 0 THEN
    UPDATE public.jackpot_pool SET amount = amount - v_from_pool, updated_at = now() WHERE id = 1;
  END IF;

  v_funding := CASE WHEN v_from_pool > 0 AND v_from_new_deposit = 0 THEN 'jackpot_remainder'
                    WHEN v_from_pool = 0 THEN 'new_deposit'
                    ELSE 'mixed' END;

  INSERT INTO public.recovery_bonus_events(
    user_id, deposit_amount, bonus_pct, bonus_amount, funding_source, user_tier, note
  ) VALUES (
    v_uid, p_amount, v_pct, v_bonus, CASE v_funding WHEN 'mixed' THEN 'new_deposit' ELSE v_funding END, v_tier,
    'pool=' || v_from_pool || ' / new_deposit=' || v_from_new_deposit
  ) RETURNING id INTO v_event_id;

  -- consume eligibility
  UPDATE public.recovery_bonus_eligibility
  SET consumed_at = now(), consumed_event_id = v_event_id
  WHERE id = v_elig_id;

  -- credit wallet
  INSERT INTO public.wallet_balances(user_id, total_balance, available_balance)
  VALUES (v_uid, v_bonus, v_bonus)
  ON CONFLICT (user_id) DO UPDATE
    SET total_balance     = wallet_balances.total_balance + EXCLUDED.total_balance,
        available_balance = wallet_balances.available_balance + EXCLUDED.available_balance,
        updated_at = now();

  RETURN jsonb_build_object(
    'ok', true,
    'event_id', v_event_id,
    'eligibility_id', v_elig_id,
    'tier', v_tier,
    'bonus_pct', v_pct,
    'bonus_amount', v_bonus,
    'funded_from_pool', v_from_pool,
    'funded_from_new_deposit', v_from_new_deposit,
    'funding', v_funding
  );
END;
$$;

REVOKE ALL ON FUNCTION public.grant_recovery_bonus(bigint, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.grant_recovery_bonus(bigint, text) TO authenticated;

-- 4) baseline registration
INSERT INTO public.function_permissions_baseline(function_name, function_args, allowed_roles, category, note)
VALUES
  ('record_recovery_eligibility', 'uuid, bigint, integer, text', ARRAY['service_role']::text[], 'recovery_bonus',
   'Phase 7 — admin/system only, opens 24h eligibility window after liquidation'),
  ('grant_recovery_bonus', 'bigint, text', ARRAY['authenticated']::text[], 'recovery_bonus',
   'Phase 7 — requires open eligibility; funded from jackpot_pool first, then new deposit (operator zero-loss)')
ON CONFLICT (function_name, function_args) DO UPDATE
SET allowed_roles = EXCLUDED.allowed_roles,
    category = EXCLUDED.category,
    note = EXCLUDED.note;