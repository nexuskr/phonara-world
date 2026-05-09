-- =====================================================================
-- 1. request_status_history (immutable timeline)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.request_status_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_kind TEXT NOT NULL CHECK (request_kind IN ('deposit','package','withdrawal')),
  request_id UUID NOT NULL,
  user_id UUID NOT NULL,
  from_status TEXT,
  to_status TEXT NOT NULL,
  actor_id UUID,
  actor_role TEXT NOT NULL DEFAULT 'system',
  memo TEXT,
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_rsh_request ON public.request_status_history(request_kind, request_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rsh_user ON public.request_status_history(user_id, created_at DESC);

ALTER TABLE public.request_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rsh_self_select ON public.request_status_history;
CREATE POLICY rsh_self_select ON public.request_status_history FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.request_status_history REPLICA IDENTITY FULL;
DO $$ BEGIN
  PERFORM 1 FROM pg_publication_tables
   WHERE pubname='supabase_realtime' AND tablename='request_status_history';
  IF NOT FOUND THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.request_status_history';
  END IF;
END $$;

-- =====================================================================
-- 2. Forensic memo + evidence checklist columns
-- =====================================================================
ALTER TABLE public.deposit_requests
  ADD COLUMN IF NOT EXISTS admin_review_memo TEXT,
  ADD COLUMN IF NOT EXISTS admin_evidence_checklist JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.package_purchases
  ADD COLUMN IF NOT EXISTS admin_review_memo TEXT,
  ADD COLUMN IF NOT EXISTS admin_evidence_checklist JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.withdrawal_requests
  ADD COLUMN IF NOT EXISTS admin_review_memo TEXT,
  ADD COLUMN IF NOT EXISTS admin_evidence_checklist JSONB NOT NULL DEFAULT '{}'::jsonb;

-- =====================================================================
-- 3. Helper: write timeline + notification atomically
-- =====================================================================
CREATE OR REPLACE FUNCTION public.record_request_status(
  _kind TEXT, _request_id UUID, _user_id UUID,
  _from TEXT, _to TEXT, _actor UUID, _actor_role TEXT,
  _memo TEXT, _evidence JSONB
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _title TEXT; _body TEXT;
BEGIN
  INSERT INTO public.request_status_history(
    request_kind, request_id, user_id, from_status, to_status,
    actor_id, actor_role, memo, evidence
  ) VALUES (
    _kind, _request_id, _user_id, _from, _to,
    _actor, COALESCE(_actor_role,'system'), _memo, COALESCE(_evidence,'{}'::jsonb)
  );

  _title := CASE _kind
    WHEN 'deposit'    THEN '입금 요청 상태 변경'
    WHEN 'package'    THEN '패키지 구매 상태 변경'
    WHEN 'withdrawal' THEN '출금 요청 상태 변경'
  END;
  _body := COALESCE(_from,'-') || ' → ' || _to ||
           CASE WHEN _memo IS NOT NULL AND length(_memo) > 0
                THEN E'\n사유: ' || _memo ELSE '' END;

  INSERT INTO public.notifications(user_id, kind, title, body, payload)
  VALUES (_user_id, _kind || '_status_change', _title, _body,
    jsonb_build_object('request_kind',_kind,'request_id',_request_id,
                       'from',_from,'to',_to,'memo',_memo));
END $$;

-- =====================================================================
-- 4. Triggers
-- =====================================================================
CREATE OR REPLACE FUNCTION public.tg_deposit_status_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.record_request_status('deposit', NEW.id, NEW.user_id,
      NULL, NEW.status::text, NEW.user_id, 'user', NULL, '{}'::jsonb);
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM public.record_request_status('deposit', NEW.id, NEW.user_id,
      OLD.status::text, NEW.status::text,
      COALESCE(NEW.admin_id, auth.uid()),
      CASE WHEN NEW.admin_id IS NOT NULL THEN 'admin' ELSE 'system' END,
      COALESCE(NEW.admin_review_memo, NEW.rejected_reason),
      COALESCE(NEW.admin_evidence_checklist, '{}'::jsonb));
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.tg_package_status_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.record_request_status('package', NEW.id, NEW.user_id,
      NULL, NEW.status::text, NEW.user_id, 'user', NULL, '{}'::jsonb);
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM public.record_request_status('package', NEW.id, NEW.user_id,
      OLD.status::text, NEW.status::text,
      COALESCE(NEW.admin_id, auth.uid()),
      CASE WHEN NEW.admin_id IS NOT NULL THEN 'admin' ELSE 'system' END,
      COALESCE(NEW.admin_review_memo, NEW.rejected_reason),
      COALESCE(NEW.admin_evidence_checklist, '{}'::jsonb));
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.tg_withdrawal_status_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.record_request_status('withdrawal', NEW.id, NEW.user_id,
      NULL, NEW.status::text, NEW.user_id, 'user', NULL, '{}'::jsonb);
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM public.record_request_status('withdrawal', NEW.id, NEW.user_id,
      OLD.status::text, NEW.status::text,
      COALESCE(NEW.admin_id, auth.uid()),
      CASE WHEN NEW.admin_id IS NOT NULL THEN 'admin' ELSE 'system' END,
      COALESCE(NEW.admin_review_memo, NEW.rejected_reason),
      COALESCE(NEW.admin_evidence_checklist, '{}'::jsonb));
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_deposit_status   ON public.deposit_requests;
DROP TRIGGER IF EXISTS trg_package_status   ON public.package_purchases;
DROP TRIGGER IF EXISTS trg_withdraw_status  ON public.withdrawal_requests;

CREATE TRIGGER trg_deposit_status
  AFTER INSERT OR UPDATE ON public.deposit_requests
  FOR EACH ROW EXECUTE FUNCTION public.tg_deposit_status_change();
CREATE TRIGGER trg_package_status
  AFTER INSERT OR UPDATE ON public.package_purchases
  FOR EACH ROW EXECUTE FUNCTION public.tg_package_status_change();
CREATE TRIGGER trg_withdraw_status
  AFTER INSERT OR UPDATE ON public.withdrawal_requests
  FOR EACH ROW EXECUTE FUNCTION public.tg_withdrawal_status_change();

-- =====================================================================
-- 5. admin_resolve_* (extend signature)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.admin_resolve_deposit(
  _request_id UUID, _action TEXT, _reason TEXT DEFAULT NULL,
  _memo TEXT DEFAULT NULL, _checklist JSONB DEFAULT '{}'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _admin UUID := auth.uid(); _r public.deposit_requests%ROWTYPE;
BEGIN
  IF NOT public.has_role(_admin,'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT * INTO _r FROM public.deposit_requests WHERE id=_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found'; END IF;
  IF _r.status::text <> 'pending' THEN RAISE EXCEPTION 'already_resolved'; END IF;

  IF _action = 'approve' THEN
    UPDATE public.deposit_requests SET
      status='approved', admin_id=_admin, approved_at=now(),
      admin_review_memo=_memo, admin_evidence_checklist=COALESCE(_checklist,'{}'::jsonb),
      updated_at=now()
    WHERE id=_request_id;
  ELSIF _action = 'reject' THEN
    UPDATE public.deposit_requests SET
      status='rejected', admin_id=_admin, rejected_reason=_reason,
      admin_review_memo=_memo, admin_evidence_checklist=COALESCE(_checklist,'{}'::jsonb),
      updated_at=now()
    WHERE id=_request_id;
  ELSE RAISE EXCEPTION 'invalid_action'; END IF;
  RETURN jsonb_build_object('ok',true,'action',_action);
END $$;

CREATE OR REPLACE FUNCTION public.admin_resolve_package(
  _purchase_id UUID, _action TEXT, _reason TEXT DEFAULT NULL,
  _memo TEXT DEFAULT NULL, _checklist JSONB DEFAULT '{}'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _admin UUID := auth.uid(); _r public.package_purchases%ROWTYPE;
BEGIN
  IF NOT public.has_role(_admin,'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT * INTO _r FROM public.package_purchases WHERE id=_purchase_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found'; END IF;
  IF _r.status::text <> 'pending' THEN RAISE EXCEPTION 'already_resolved'; END IF;

  IF _action = 'approve' THEN
    UPDATE public.package_purchases SET
      status='active', admin_id=_admin, approved_at=now(),
      next_settle_at=now() + interval '1 day',
      admin_review_memo=_memo, admin_evidence_checklist=COALESCE(_checklist,'{}'::jsonb),
      updated_at=now()
    WHERE id=_purchase_id;
  ELSIF _action = 'reject' THEN
    UPDATE public.package_purchases SET
      status='rejected', admin_id=_admin, rejected_reason=_reason,
      admin_review_memo=_memo, admin_evidence_checklist=COALESCE(_checklist,'{}'::jsonb),
      updated_at=now()
    WHERE id=_purchase_id;
  ELSE RAISE EXCEPTION 'invalid_action'; END IF;
  RETURN jsonb_build_object('ok',true,'action',_action);
END $$;

CREATE OR REPLACE FUNCTION public.admin_resolve_withdrawal(
  _request_id UUID, _action TEXT, _reason TEXT DEFAULT NULL,
  _memo TEXT DEFAULT NULL, _checklist JSONB DEFAULT '{}'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _admin UUID := auth.uid(); _r public.withdrawal_requests%ROWTYPE;
BEGIN
  IF NOT public.has_role(_admin,'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT * INTO _r FROM public.withdrawal_requests WHERE id=_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found'; END IF;

  IF _action = 'approve' THEN
    IF _r.status::text <> 'pending' THEN RAISE EXCEPTION 'already_resolved'; END IF;
    UPDATE public.withdrawal_requests SET
      status='approved', admin_id=_admin, approved_at=now(),
      admin_review_memo=_memo, admin_evidence_checklist=COALESCE(_checklist,'{}'::jsonb)
    WHERE id=_request_id;
  ELSIF _action = 'complete' THEN
    IF _r.status::text NOT IN ('approved','pending') THEN RAISE EXCEPTION 'invalid_state'; END IF;
    UPDATE public.withdrawal_requests SET
      status='completed', admin_id=_admin, completed_at=now(),
      admin_review_memo=COALESCE(_memo, admin_review_memo),
      admin_evidence_checklist=COALESCE(_checklist, admin_evidence_checklist)
    WHERE id=_request_id;
    UPDATE public.wallet_balances SET
      locked_balance = GREATEST(0, locked_balance - _r.amount),
      total_balance  = GREATEST(0, total_balance  - _r.amount),
      updated_at = now()
    WHERE user_id = _r.user_id;
  ELSIF _action = 'reject' THEN
    IF _r.status::text NOT IN ('pending','approved') THEN RAISE EXCEPTION 'invalid_state'; END IF;
    UPDATE public.withdrawal_requests SET
      status='rejected', admin_id=_admin, rejected_reason=_reason,
      admin_review_memo=_memo, admin_evidence_checklist=COALESCE(_checklist,'{}'::jsonb)
    WHERE id=_request_id;
    UPDATE public.wallet_balances SET
      locked_balance    = GREATEST(0, locked_balance - _r.amount),
      available_balance = available_balance + _r.amount,
      updated_at = now()
    WHERE user_id = _r.user_id;
  ELSE RAISE EXCEPTION 'invalid_action'; END IF;
  RETURN jsonb_build_object('ok',true,'action',_action);
END $$;

-- =====================================================================
-- 6. Deposit input validator
-- =====================================================================
CREATE OR REPLACE FUNCTION public.validate_deposit_input(
  _method TEXT,
  _coin_address TEXT DEFAULT NULL,
  _coin_network TEXT DEFAULT NULL,
  _voucher_brand TEXT DEFAULT NULL,
  _voucher_pin TEXT DEFAULT NULL,
  _bank_account TEXT DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE
  _uid UUID := auth.uid();
  _warnings jsonb := '[]'::jsonb;
  _addr_prefix CHAR(1);
  _expected_network TEXT;
  _pin_hash TEXT;
  _dup_count INT := 0;
  _digit_len INT;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;

  IF _method = 'coin' AND _coin_address IS NOT NULL AND length(_coin_address) > 0 THEN
    _addr_prefix := upper(left(_coin_address,1));
    _expected_network := CASE _addr_prefix
      WHEN 'T' THEN 'TRC20'
      WHEN '0' THEN 'ERC20'
      WHEN 'B' THEN 'BTC'
      WHEN '1' THEN 'BTC'
      WHEN '3' THEN 'BTC'
      ELSE NULL
    END;
    IF _coin_network IS NOT NULL
       AND _expected_network IS NOT NULL
       AND upper(_coin_network) <> _expected_network THEN
      _warnings := _warnings || jsonb_build_array(jsonb_build_object(
        'code','network_mismatch','severity','high',
        'message', format('주소가 %s 형식으로 보이는데 네트워크는 %s로 선택되었습니다.', _expected_network, _coin_network)));
    END IF;
  END IF;

  IF _method = 'voucher' AND _voucher_pin IS NOT NULL AND length(_voucher_pin) > 0 THEN
    _digit_len := length(regexp_replace(_voucher_pin,'\D','','g'));
    IF _voucher_brand = 'culture' AND (_digit_len < 16 OR _digit_len > 18) THEN
      _warnings := _warnings || jsonb_build_array(jsonb_build_object(
        'code','voucher_pin_length','severity','medium',
        'message','문화상품권 핀은 보통 16~18자리 숫자입니다.'));
    ELSIF _voucher_brand = 'happy' AND (_digit_len < 14 OR _digit_len > 18) THEN
      _warnings := _warnings || jsonb_build_array(jsonb_build_object(
        'code','voucher_pin_length','severity','medium',
        'message','해피머니 핀은 보통 14~18자리입니다.'));
    ELSIF _voucher_brand = 'cultureland' AND (_digit_len < 16 OR _digit_len > 18) THEN
      _warnings := _warnings || jsonb_build_array(jsonb_build_object(
        'code','voucher_pin_length','severity','medium',
        'message','컬쳐랜드 핀은 보통 16~18자리입니다.'));
    END IF;
    _pin_hash := encode(digest(_voucher_pin || coalesce(_voucher_brand,''), 'sha256'),'hex');
    SELECT count(*) INTO _dup_count
      FROM public.deposit_requests
     WHERE method='voucher' AND voucher_pin_hash = _pin_hash
       AND created_at > now() - interval '24 hours';
    IF _dup_count > 0 THEN
      _warnings := _warnings || jsonb_build_array(jsonb_build_object(
        'code','voucher_pin_duplicate','severity','high',
        'message','동일 핀번호가 24시간 내에 이미 신청된 이력이 있습니다.'));
    END IF;
  END IF;

  IF _method = 'bank' AND _bank_account IS NOT NULL THEN
    IF length(regexp_replace(_bank_account,'\D','','g')) < 8 THEN
      _warnings := _warnings || jsonb_build_array(jsonb_build_object(
        'code','bank_account_short','severity','medium',
        'message','계좌번호 자릿수가 너무 짧습니다.'));
    END IF;
  END IF;

  RETURN jsonb_build_object('warnings', _warnings, 'count', jsonb_array_length(_warnings));
END $$;

GRANT EXECUTE ON FUNCTION public.validate_deposit_input(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_resolve_deposit(UUID,TEXT,TEXT,TEXT,JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_resolve_package(UUID,TEXT,TEXT,TEXT,JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_resolve_withdrawal(UUID,TEXT,TEXT,TEXT,JSONB) TO authenticated;