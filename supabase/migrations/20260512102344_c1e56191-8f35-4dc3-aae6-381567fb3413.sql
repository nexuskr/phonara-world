-- Phase C: emit notifications on deposit/package status changes so existing
-- notification_dispatch_push trigger fans out to web push automatically.

CREATE OR REPLACE FUNCTION public.tg_deposit_status_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE v_title text; v_body text;
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

    CASE NEW.status::text
      WHEN 'approved' THEN
        v_title := '✅ 입금 승인 완료';
        v_body  := format('%s원 입금이 승인되어 잔액에 반영되었습니다.', to_char(NEW.amount, 'FM999,999,999'));
      WHEN 'rejected' THEN
        v_title := '⛔ 입금 거절';
        v_body  := COALESCE('사유: '||NEW.rejected_reason, '관리자 검수에서 거절되었습니다.');
      WHEN 'reviewing' THEN
        v_title := '🔍 입금 검수 중';
        v_body  := '입금 신청이 검수 단계로 이동했습니다.';
      ELSE v_title := NULL;
    END CASE;

    IF v_title IS NOT NULL THEN
      INSERT INTO public.notifications(user_id, kind, title, body, payload)
      VALUES (NEW.user_id, 'deposit_'||NEW.status::text, v_title, v_body,
        jsonb_build_object('request_id', NEW.id, 'amount', NEW.amount, 'status', NEW.status));
    END IF;
  END IF;
  RETURN NEW;
END
$$;

CREATE OR REPLACE FUNCTION public.tg_package_status_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE v_title text; v_body text;
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

    CASE NEW.status::text
      WHEN 'approved' THEN
        v_title := '👑 패키지 승인 완료';
        v_body  := format('%s 패키지가 활성화되었습니다. 일일 보상이 지급됩니다.', COALESCE(NEW.package_name, '선택하신'));
      WHEN 'rejected' THEN
        v_title := '⛔ 패키지 신청 거절';
        v_body  := COALESCE('사유: '||NEW.rejected_reason, '관리자 검수에서 거절되었습니다.');
      WHEN 'completed' THEN
        v_title := '🏁 패키지 만기';
        v_body  := COALESCE(NEW.package_name, '패키지')||' 운용이 종료되었습니다.';
      ELSE v_title := NULL;
    END CASE;

    IF v_title IS NOT NULL THEN
      INSERT INTO public.notifications(user_id, kind, title, body, payload)
      VALUES (NEW.user_id, 'package_'||NEW.status::text, v_title, v_body,
        jsonb_build_object('purchase_id', NEW.id, 'amount', NEW.amount, 'status', NEW.status, 'package_name', NEW.package_name));
    END IF;
  END IF;
  RETURN NEW;
END
$$;

COMMENT ON FUNCTION public.tg_deposit_status_change() IS
  'Phase C: also inserts notifications row on approve/reject/reviewing → triggers web push via notification_dispatch_push.';
COMMENT ON FUNCTION public.tg_package_status_change() IS
  'Phase C: also inserts notifications row on approve/reject/completed → triggers web push via notification_dispatch_push.';