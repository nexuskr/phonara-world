-- 1) Add spent_at to track OTP consumed by a withdrawal
ALTER TABLE public.withdraw_otp_codes
  ADD COLUMN IF NOT EXISTS spent_at timestamptz;

-- 2) Replace request_withdrawal with server-side step-up enforcement
CREATE OR REPLACE FUNCTION public.request_withdrawal(
  _amount bigint, _method withdrawal_method,
  _bank_name text, _bank_account text,
  _coin_address text, _coin_network text, _pin text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid UUID := auth.uid();
  _tier public.user_tier;
  _pin_hash TEXT;
  _wallet public.wallet_balances%ROWTYPE;
  _today DATE := CURRENT_DATE;
  _wd_count INT;
  _min BIGINT;
  _process_by TIMESTAMPTZ;
  _tx_code TEXT;
  _gate jsonb;
  _required int;
  _priority smallint;
  _aal text;
  _has_factor boolean;
  _otp_id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF _amount IS NULL OR _amount <= 0 THEN RAISE EXCEPTION 'invalid amount'; END IF;
  IF _pin IS NULL OR length(_pin) <> 6 THEN RAISE EXCEPTION 'invalid pin'; END IF;

  -- =====================================================
  -- SERVER-SIDE STEP-UP ENFORCEMENT
  -- =====================================================
  _aal := COALESCE((auth.jwt() ->> 'aal'), 'aal1');

  SELECT EXISTS (
    SELECT 1 FROM auth.mfa_factors
    WHERE user_id = _uid AND status = 'verified'
  ) INTO _has_factor;

  IF _has_factor THEN
    -- User has TOTP/WebAuthn — require AAL2 session
    IF _aal <> 'aal2' THEN
      RAISE EXCEPTION 'step_up_required:aal2' USING ERRCODE = 'P0001';
    END IF;
  ELSE
    -- No MFA factor — require fresh email OTP (within 10 min, unused for withdrawal)
    SELECT id INTO _otp_id
      FROM public.withdraw_otp_codes
     WHERE user_id = _uid
       AND consumed_at IS NOT NULL
       AND consumed_at > now() - interval '10 minutes'
       AND spent_at IS NULL
     ORDER BY consumed_at DESC
     LIMIT 1
     FOR UPDATE;

    IF _otp_id IS NULL THEN
      RAISE EXCEPTION 'step_up_required:otp' USING ERRCODE = 'P0001';
    END IF;
  END IF;
  -- =====================================================

  SELECT tier, withdraw_pin_hash INTO _tier, _pin_hash
    FROM public.profiles WHERE id = _uid FOR UPDATE;
  IF _pin_hash IS NULL THEN
    UPDATE public.profiles
       SET withdraw_pin_hash = encode(digest(_pin || _uid::text,'sha256'),'hex')
     WHERE id=_uid;
  ELSIF _pin_hash <> encode(digest(_pin || _uid::text,'sha256'),'hex') THEN
    RAISE EXCEPTION 'pin mismatch';
  END IF;

  _gate := public.aml_required_level(_uid, _amount);
  _required := (_gate->>'required_level')::int;
  IF (_gate->>'gate_passed')::boolean = false THEN
    RAISE EXCEPTION 'aml_required:%', _required;
  END IF;

  _min := public.tier_withdraw_min(_tier);
  IF _amount < _min THEN RAISE EXCEPTION 'below_min:%', _min; END IF;

  IF _tier = 'normal' THEN
    SELECT COUNT(*) INTO _wd_count FROM public.withdrawal_requests
      WHERE user_id=_uid AND created_at::date=_today
        AND status<>'rejected' AND status<>'cancelled';
    IF _wd_count >= 3 THEN RAISE EXCEPTION 'daily_withdraw_limit'; END IF;
  END IF;

  SELECT * INTO _wallet FROM public.wallet_balances WHERE user_id=_uid FOR UPDATE;
  IF _wallet.available_balance < _amount THEN RAISE EXCEPTION 'insufficient_funds'; END IF;

  UPDATE public.wallet_balances SET
    available_balance = available_balance - _amount,
    locked_balance = locked_balance + _amount,
    updated_at = now()
  WHERE user_id=_uid;

  UPDATE public.profiles
    SET total_withdrawn = COALESCE(total_withdrawn,0) + _amount,
        updated_at = now()
  WHERE id = _uid;

  _process_by := now() + (public.tier_process_minutes(_tier) || ' minutes')::interval;
  _tx_code := 'PM-' || upper(substr(md5(random()::text||_uid::text||now()::text),1,10));

  _priority := CASE _tier
    WHEN 'empire' THEN 10::smallint
    WHEN 'god'    THEN 30::smallint
    WHEN 'vip'    THEN 50::smallint
    ELSE              100::smallint
  END;

  INSERT INTO public.withdrawal_requests(
    user_id, amount, method, bank_name, bank_account, coin_address, coin_network,
    tx_code, status, process_by, tier_at_request, priority
  ) VALUES (
    _uid, _amount, _method, _bank_name, _bank_account, _coin_address, _coin_network,
    _tx_code, 'pending', _process_by, _tier, _priority
  );

  -- Mark OTP as spent so it cannot be reused for another withdrawal
  IF _otp_id IS NOT NULL THEN
    UPDATE public.withdraw_otp_codes SET spent_at = now() WHERE id = _otp_id;
  END IF;

  RETURN jsonb_build_object('ok',true,'tx_code',_tx_code,'process_by',_process_by,'priority',_priority);
END $function$;