
-- 1) handbook_progress
CREATE TABLE IF NOT EXISTS public.handbook_progress (
  user_id uuid PRIMARY KEY,
  steps_completed jsonb NOT NULL DEFAULT '{}'::jsonb,
  bonus_paid boolean NOT NULL DEFAULT false,
  bonus_paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.handbook_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS hp_self_select ON public.handbook_progress;
CREATE POLICY hp_self_select ON public.handbook_progress
  FOR SELECT TO public
  USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role));

-- inserts/updates handled exclusively via SECURITY DEFINER RPC; no direct write policies.

-- 2) mark_handbook_step
CREATE OR REPLACE FUNCTION public.mark_handbook_step(_step text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _allowed text[] := ARRAY['step1','step2','step3','step4','step5','step6'];
  _row public.handbook_progress%ROWTYPE;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF NOT (_step = ANY(_allowed)) THEN RAISE EXCEPTION 'invalid_step'; END IF;

  INSERT INTO public.handbook_progress(user_id, steps_completed)
    VALUES (_uid, jsonb_build_object(_step, true))
  ON CONFLICT (user_id) DO UPDATE
    SET steps_completed = public.handbook_progress.steps_completed || jsonb_build_object(_step, true),
        updated_at = now()
  RETURNING * INTO _row;

  RETURN jsonb_build_object('ok', true, 'steps', _row.steps_completed, 'bonus_paid', _row.bonus_paid);
END $$;

-- 3) claim_handbook_bonus
CREATE OR REPLACE FUNCTION public.claim_handbook_bonus()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _row public.handbook_progress%ROWTYPE;
  _amount bigint := 2000;
  _wallet public.wallet_balances%ROWTYPE;
  _today date := (now() AT TIME ZONE 'Asia/Seoul')::date;
  _month text := to_char(now() AT TIME ZONE 'Asia/Seoul', 'YYYY-MM');
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;

  SELECT * INTO _row FROM public.handbook_progress WHERE user_id = _uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'no_progress'; END IF;

  IF _row.bonus_paid THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_paid');
  END IF;

  IF NOT (
    COALESCE((_row.steps_completed->>'step1')::boolean, false) AND
    COALESCE((_row.steps_completed->>'step2')::boolean, false) AND
    COALESCE((_row.steps_completed->>'step3')::boolean, false) AND
    COALESCE((_row.steps_completed->>'step4')::boolean, false) AND
    COALESCE((_row.steps_completed->>'step5')::boolean, false) AND
    COALESCE((_row.steps_completed->>'step6')::boolean, false)
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'incomplete');
  END IF;

  -- Pay bonus
  SELECT * INTO _wallet FROM public.wallet_balances WHERE user_id = _uid FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.wallet_balances(user_id) VALUES (_uid) RETURNING * INTO _wallet;
  END IF;

  UPDATE public.wallet_balances SET
    available_balance = available_balance + _amount,
    total_balance = total_balance + _amount,
    updated_at = now()
  WHERE user_id = _uid;

  INSERT INTO public.transactions(user_id, kind, direction, amount, balance_after, available_after, metadata)
    VALUES (_uid, 'admin_adjust', 'credit', _amount,
            _wallet.total_balance + _amount, _wallet.available_balance + _amount,
            jsonb_build_object('source','handbook_bonus','reason','starter_handbook_complete'));

  UPDATE public.handbook_progress
    SET bonus_paid = true, bonus_paid_at = now(), updated_at = now()
    WHERE user_id = _uid;

  RETURN jsonb_build_object('ok', true, 'amount', _amount);
END $$;

REVOKE ALL ON FUNCTION public.mark_handbook_step(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_handbook_step(text) TO authenticated;
REVOKE ALL ON FUNCTION public.claim_handbook_bonus() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_handbook_bonus() TO authenticated;

-- 4) Permission baseline registration (drift detection compliance)
INSERT INTO public.function_permissions_baseline(function_name, function_args, allowed_roles, category, note)
VALUES
  ('mark_handbook_step', 'text', ARRAY['authenticated'], 'handbook', 'User marks a starter handbook step as complete'),
  ('claim_handbook_bonus', '', ARRAY['authenticated'], 'handbook', 'User claims +2,000 KRW bonus when all 6 starter steps are complete')
ON CONFLICT DO NOTHING;
