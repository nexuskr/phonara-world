-- ============================================================
-- Phonara vFinal+ Phase 1 — P0 Critical migrations
-- ============================================================

-- 1.1 Referral v2 -------------------------------------------------
ALTER TABLE public.referrals
  ADD COLUMN IF NOT EXISTS window_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS policy_version smallint NOT NULL DEFAULT 1;

UPDATE public.referrals
  SET window_expires_at = created_at + interval '90 days'
  WHERE window_expires_at IS NULL;

CREATE OR REPLACE FUNCTION public._set_referral_window()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.window_expires_at IS NULL THEN
    NEW.window_expires_at := COALESCE(NEW.created_at, now()) + interval '90 days';
  END IF;
  IF NEW.policy_version IS NULL OR NEW.policy_version < 2 THEN
    NEW.policy_version := 2;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_set_referral_window ON public.referrals;
CREATE TRIGGER trg_set_referral_window
  BEFORE INSERT ON public.referrals
  FOR EACH ROW EXECUTE FUNCTION public._set_referral_window();

-- v2 credit function: 90-day window + fixed bonuses (inviter 30,000 / invitee 10,000)
CREATE OR REPLACE FUNCTION public._credit_referral_first_deposit(_invitee uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _ref public.referrals%ROWTYPE;
  _wallet_inv public.wallet_balances%ROWTYPE;
  _wallet_invitee public.wallet_balances%ROWTYPE;
  _bonus_inviter bigint := 30000;  -- v2: 30,000C
  _bonus_invitee bigint := 10000;
  _idem_key text;
BEGIN
  SELECT * INTO _ref FROM public.referrals WHERE invitee_id = _invitee FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;
  IF _ref.first_deposit_bonus_paid THEN RETURN; END IF;

  -- v2: 90-day window check (silent pass when expired)
  IF _ref.window_expires_at IS NOT NULL AND now() > _ref.window_expires_at THEN
    RETURN;
  END IF;

  -- Idempotency
  _idem_key := 'ref_first_deposit_v2:' || _invitee::text;
  IF EXISTS (SELECT 1 FROM public.idempotency_keys WHERE scope='referral' AND key=_idem_key) THEN
    RETURN;
  END IF;
  INSERT INTO public.idempotency_keys(scope, key, user_id, response)
    VALUES ('referral', _idem_key, _ref.inviter_id, jsonb_build_object('invitee',_invitee));

  -- Inviter wallet
  SELECT * INTO _wallet_inv FROM public.wallet_balances WHERE user_id = _ref.inviter_id FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.wallet_balances(user_id) VALUES (_ref.inviter_id) RETURNING * INTO _wallet_inv;
  END IF;
  UPDATE public.wallet_balances SET
    available_balance = available_balance + _bonus_inviter,
    total_balance = total_balance + _bonus_inviter,
    updated_at = now()
  WHERE user_id = _ref.inviter_id;
  INSERT INTO public.transactions(user_id, kind, direction, amount, balance_after, available_after, metadata)
    VALUES (_ref.inviter_id,'profit_share','credit',_bonus_inviter,
            _wallet_inv.total_balance + _bonus_inviter, _wallet_inv.available_balance + _bonus_inviter,
            jsonb_build_object('source','first_deposit_fixed_v2','role','inviter','invitee',_invitee));

  -- Invitee wallet
  SELECT * INTO _wallet_invitee FROM public.wallet_balances WHERE user_id = _invitee FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.wallet_balances(user_id) VALUES (_invitee) RETURNING * INTO _wallet_invitee;
  END IF;
  UPDATE public.wallet_balances SET
    available_balance = available_balance + _bonus_invitee,
    total_balance = total_balance + _bonus_invitee,
    updated_at = now()
  WHERE user_id = _invitee;
  INSERT INTO public.transactions(user_id, kind, direction, amount, balance_after, available_after, metadata)
    VALUES (_invitee,'profit_share','credit',_bonus_invitee,
            _wallet_invitee.total_balance + _bonus_invitee, _wallet_invitee.available_balance + _bonus_invitee,
            jsonb_build_object('source','first_deposit_fixed_v2','role','invitee','inviter',_ref.inviter_id));

  UPDATE public.referrals
    SET first_deposit_bonus_paid = true,
        total_commission = total_commission + _bonus_inviter
  WHERE id = _ref.id;

  INSERT INTO public.referral_earnings(inviter_id, invitee_id, source, base_amount, commission)
    VALUES (_ref.inviter_id, _invitee, 'first_deposit_fixed_v2', 0, _bonus_inviter);
END $$;

-- 1.3 Sovereign withdraw priority -------------------------------------------------
ALTER TABLE public.withdrawal_requests
  ADD COLUMN IF NOT EXISTS priority smallint NOT NULL DEFAULT 100;

CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status_priority_created
  ON public.withdrawal_requests (status, priority, created_at);

CREATE OR REPLACE FUNCTION public.request_withdrawal(
  _amount bigint, _method withdrawal_method,
  _bank_name text, _bank_account text,
  _coin_address text, _coin_network text, _pin text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF _amount IS NULL OR _amount <= 0 THEN RAISE EXCEPTION 'invalid amount'; END IF;
  IF _pin IS NULL OR length(_pin) <> 6 THEN RAISE EXCEPTION 'invalid pin'; END IF;

  SELECT tier, withdraw_pin_hash INTO _tier, _pin_hash FROM public.profiles WHERE id = _uid FOR UPDATE;
  IF _pin_hash IS NULL THEN
    UPDATE public.profiles SET withdraw_pin_hash = encode(digest(_pin || _uid::text,'sha256'),'hex') WHERE id=_uid;
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
      WHERE user_id=_uid AND created_at::date=_today AND status<>'rejected' AND status<>'cancelled';
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

  -- v2: Sovereign-priority queue
  _priority := CASE _tier::text
    WHEN 'sovereign' THEN 10
    WHEN 'vip' THEN 50
    ELSE 100
  END;

  INSERT INTO public.withdrawal_requests(
    user_id, amount, method, bank_name, bank_account, coin_address, coin_network,
    tx_code, status, process_by, tier_at_request, priority
  ) VALUES (
    _uid, _amount, _method, _bank_name, _bank_account, _coin_address, _coin_network,
    _tx_code, 'pending', _process_by, _tier, _priority
  );

  RETURN jsonb_build_object('ok',true,'tx_code',_tx_code,'process_by',_process_by,'priority',_priority);
END $$;

-- 1.4 Founding Seat: seed up to 100 + claim RPC -------------------------------------
INSERT INTO public.empire_founding_seats (seat_no)
  SELECT g FROM generate_series(1, 100) AS g
  ON CONFLICT (seat_no) DO NOTHING;

CREATE OR REPLACE FUNCTION public.claim_founding_seat(_purchase_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row public.package_purchases%ROWTYPE;
  _seat_no int;
  _wallet public.wallet_balances%ROWTYPE;
BEGIN
  SELECT * INTO _row FROM public.package_purchases WHERE id=_purchase_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','not_found'); END IF;
  IF _row.package_id <> 'empire' THEN RETURN jsonb_build_object('ok',false,'error','not_empire'); END IF;
  IF _row.founding_bonus_paid THEN RETURN jsonb_build_object('ok',true,'already_claimed',true); END IF;

  SELECT seat_no INTO _seat_no FROM public.empire_founding_seats
    WHERE claimed_by IS NULL ORDER BY seat_no FOR UPDATE SKIP LOCKED LIMIT 1;

  IF _seat_no IS NULL THEN
    INSERT INTO public.notifications(user_id, kind, title, body, payload)
      VALUES (_row.user_id, 'empire_seat_full', 'Empire Founding Seats sold out',
              '창립 멤버 100석이 모두 마감되었습니다. Empire 혜택은 그대로 유지됩니다.',
              jsonb_build_object('purchase_id',_purchase_id));
    RETURN jsonb_build_object('ok',true,'sold_out',true);
  END IF;

  UPDATE public.empire_founding_seats
    SET claimed_by = _row.user_id, claimed_at = now(), purchase_id = _purchase_id
    WHERE seat_no = _seat_no;

  UPDATE public.package_purchases
    SET is_empire_founding_member = true,
        founding_seat_no = _seat_no,
        founding_bonus_paid = true
    WHERE id = _purchase_id;

  SELECT * INTO _wallet FROM public.wallet_balances WHERE user_id=_row.user_id FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.wallet_balances(user_id) VALUES (_row.user_id) RETURNING * INTO _wallet;
  END IF;
  UPDATE public.wallet_balances
    SET available_balance = available_balance + 500000,
        total_balance = total_balance + 500000,
        updated_at = now()
    WHERE user_id = _row.user_id;
  INSERT INTO public.transactions(user_id, kind, direction, amount, balance_after, available_after, ref_id, metadata)
    VALUES (_row.user_id, 'bonus', 'in', 500000, 0, 0, _purchase_id::text,
            jsonb_build_object('type','empire_founding_500k','seat_no',_seat_no));

  RETURN jsonb_build_object('ok',true,'seat_no',_seat_no);
END $$;

-- Refactor admin_resolve_package to delegate seat allocation to claim_founding_seat
CREATE OR REPLACE FUNCTION public.admin_resolve_package(_purchase_id uuid, _action text, _reason text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _row public.package_purchases%ROWTYPE;
  _wallet public.wallet_balances%ROWTYPE;
  _boost_mult numeric;
BEGIN
  IF NOT public.has_role(_uid, 'admin'::app_role) THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT * INTO _row FROM public.package_purchases WHERE id=_purchase_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found'; END IF;

  IF _action = 'approve' THEN
    IF _row.status NOT IN ('pending') THEN RAISE EXCEPTION 'invalid_state'; END IF;

    _boost_mult := CASE
      WHEN _row.package_id = 'empire' THEN 1.5
      WHEN _row.package_id = 'easy_150' THEN 1.2
      WHEN _row.package_id IN ('easy_starter','easy_50') THEN 1.3
      ELSE 1.0
    END;

    UPDATE public.package_purchases
      SET status='active',
          approved_at=now(),
          admin_id=_uid,
          next_settle_at = now() + interval '1 day',
          boost_until = now() + interval '3 days',
          boost_multiplier = _boost_mult
      WHERE id=_purchase_id;

    IF _row.package_id = 'empire' THEN
      SELECT * INTO _wallet FROM public.wallet_balances WHERE user_id=_row.user_id FOR UPDATE;
      IF NOT FOUND THEN
        INSERT INTO public.wallet_balances(user_id) VALUES (_row.user_id) RETURNING * INTO _wallet;
      END IF;

      IF NOT _row.instant_300k_paid THEN
        UPDATE public.wallet_balances
          SET available_balance = available_balance + 300000,
              total_balance = total_balance + 300000,
              updated_at = now()
          WHERE user_id = _row.user_id;
        UPDATE public.package_purchases SET instant_300k_paid = true WHERE id=_purchase_id;
        INSERT INTO public.transactions(user_id, kind, direction, amount, balance_after, available_after, ref_id, metadata)
          VALUES (_row.user_id, 'bonus', 'in', 300000, 0, 0, _purchase_id::text,
                  jsonb_build_object('type','empire_instant_300k'));
      END IF;

      -- v2: delegate seat allocation
      PERFORM public.claim_founding_seat(_purchase_id);
    END IF;

    RETURN jsonb_build_object('ok', true, 'boost_multiplier', _boost_mult);
  ELSIF _action = 'reject' THEN
    IF _row.status NOT IN ('pending') THEN RAISE EXCEPTION 'invalid_state'; END IF;
    UPDATE public.package_purchases
      SET status='rejected', admin_id=_uid, rejected_reason=_reason, updated_at=now()
      WHERE id=_purchase_id;
    RETURN jsonb_build_object('ok', true);
  ELSE
    RAISE EXCEPTION 'invalid_action';
  END IF;
END;
$$;

-- function_permissions_baseline registration
INSERT INTO public.function_permissions_baseline (function_name, function_args, allowed_roles, category, note)
  VALUES ('claim_founding_seat', '_purchase_id uuid', ARRAY['service_role','postgres'], 'package_settlement',
          'Internal-only: invoked by admin_resolve_package; user-callable blocked by internal admin gate via parent.')
  ON CONFLICT DO NOTHING;

-- 1.5 settle_package_daily — allow service_role (cron) -------------------------------------
CREATE OR REPLACE FUNCTION public.settle_package_daily()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _r RECORD;
  _count INT := 0;
  _wallet public.wallet_balances%ROWTYPE;
  _is_service_role boolean := coalesce(
    current_setting('request.jwt.claims', true)::jsonb->>'role','') = 'service_role';
BEGIN
  IF _uid IS NULL AND NOT _is_service_role THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF _uid IS NOT NULL AND NOT public.has_role(_uid,'admin') AND NOT _is_service_role THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  FOR _r IN
    SELECT * FROM public.package_purchases
    WHERE status='active' AND next_settle_at <= now()
    FOR UPDATE
  LOOP
    SELECT * INTO _wallet FROM public.wallet_balances WHERE user_id=_r.user_id FOR UPDATE;
    IF NOT FOUND THEN CONTINUE; END IF;

    UPDATE public.wallet_balances SET
      available_balance = available_balance + _r.daily_return,
      total_balance = total_balance + _r.daily_return,
      updated_at = now()
    WHERE user_id=_r.user_id;

    INSERT INTO public.transactions(user_id, kind, direction, amount, balance_after, available_after, ref_id, metadata)
      VALUES (_r.user_id, 'mission_win','credit', _r.daily_return,
              _wallet.total_balance + _r.daily_return,
              _wallet.available_balance + _r.daily_return,
              _r.id::text,
              jsonb_build_object('source','package_settle','package_id',_r.package_id));

    IF _r.settled_count + 1 >= _r.duration_days THEN
      UPDATE public.package_purchases
        SET settled_count = settled_count+1,
            total_settled = total_settled + _r.daily_return,
            status='completed', completed_at=now(),
            next_settle_at=NULL
        WHERE id=_r.id;
    ELSE
      UPDATE public.package_purchases
        SET settled_count = settled_count+1,
            total_settled = total_settled + _r.daily_return,
            next_settle_at = now() + interval '1 day'
        WHERE id=_r.id;
    END IF;
    _count := _count + 1;
  END LOOP;
  RETURN jsonb_build_object('ok',true,'settled',_count);
END $$;
