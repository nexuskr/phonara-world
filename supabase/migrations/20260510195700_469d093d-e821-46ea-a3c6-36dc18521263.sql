
-- Phase 7: Recovery Bonus engine
CREATE TABLE IF NOT EXISTS public.recovery_bonus_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  deposit_amount bigint NOT NULL CHECK (deposit_amount >= 0),
  bonus_pct smallint NOT NULL CHECK (bonus_pct >= 0 AND bonus_pct <= 100),
  bonus_amount bigint NOT NULL CHECK (bonus_amount >= 0),
  funding_source text NOT NULL CHECK (funding_source IN ('jackpot_remainder', 'new_deposit')),
  user_tier text NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recovery_bonus_events_user_created
  ON public.recovery_bonus_events(user_id, created_at DESC);

ALTER TABLE public.recovery_bonus_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own recovery events readable" ON public.recovery_bonus_events;
CREATE POLICY "own recovery events readable"
  ON public.recovery_bonus_events
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- grant_recovery_bonus(p_amount, p_source) — SECURITY DEFINER RPC
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
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'auth_required' USING ERRCODE = '28000';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'invalid_amount';
  END IF;
  IF p_source NOT IN ('jackpot_remainder','new_deposit') THEN
    RAISE EXCEPTION 'invalid_source';
  END IF;

  SELECT lower(tier::text) INTO v_tier FROM public.profiles WHERE id = v_uid;
  v_tier := COALESCE(v_tier, 'normal');

  v_pct := CASE v_tier
    WHEN 'empire' THEN 60
    WHEN 'god'    THEN 50
    WHEN 'vip'    THEN 40
    ELSE 20            -- normal / starter equivalent
  END;
  v_bonus := (p_amount * v_pct) / 100;

  INSERT INTO public.recovery_bonus_events(
    user_id, deposit_amount, bonus_pct, bonus_amount, funding_source, user_tier
  ) VALUES (
    v_uid, p_amount, v_pct, v_bonus, p_source, v_tier
  ) RETURNING id INTO v_event_id;

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
    'tier', v_tier,
    'bonus_pct', v_pct,
    'bonus_amount', v_bonus
  );
END;
$$;

REVOKE ALL ON FUNCTION public.grant_recovery_bonus(bigint, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.grant_recovery_bonus(bigint, text) TO authenticated;

-- register in baseline for drift detection
INSERT INTO public.function_permissions_baseline(function_name, function_args, allowed_roles, category, note)
VALUES (
  'grant_recovery_bonus',
  'bigint, text',
  ARRAY['authenticated']::text[],
  'recovery_bonus',
  'Phase 7 Recovery Bonus engine — tier-based instant top-up after liquidation'
)
ON CONFLICT (function_name, function_args) DO UPDATE
SET allowed_roles = EXCLUDED.allowed_roles,
    category = EXCLUDED.category,
    note = EXCLUDED.note;
