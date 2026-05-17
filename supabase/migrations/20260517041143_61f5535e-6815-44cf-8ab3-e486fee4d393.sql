
CREATE OR REPLACE FUNCTION public.admin_resolve_deposit(
  _request_id uuid,
  _action text,
  _reason text DEFAULT NULL,
  _memo text DEFAULT NULL,
  _checklist jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _admin uuid := auth.uid();
  _r public.deposit_requests%ROWTYPE;
  _already_credited boolean;
BEGIN
  IF NOT public.has_role(_admin, 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT * INTO _r FROM public.deposit_requests WHERE id = _request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found'; END IF;
  IF _r.status::text <> 'pending' THEN RAISE EXCEPTION 'already_resolved'; END IF;

  IF _action = 'approve' THEN
    UPDATE public.deposit_requests SET
      status = 'approved',
      admin_id = _admin,
      approved_at = now(),
      admin_review_memo = _memo,
      admin_evidence_checklist = COALESCE(_checklist, '{}'::jsonb),
      updated_at = now()
    WHERE id = _request_id;

    -- Idempotency guard
    SELECT EXISTS (
      SELECT 1 FROM public.phon_transactions
       WHERE ref = _request_id::text
         AND meta->>'kind' = 'deposit_approve'
    ) INTO _already_credited;

    IF NOT _already_credited AND _r.amount > 0 THEN
      INSERT INTO public.phon_balances(user_id, balance, updated_at)
      VALUES (_r.user_id, _r.amount, now())
      ON CONFLICT (user_id) DO UPDATE
        SET balance = phon_balances.balance + EXCLUDED.balance,
            updated_at = now();

      INSERT INTO public.phon_transactions(user_id, amount, kind, ref, meta)
      VALUES (
        _r.user_id, _r.amount, 'admin_adjust', _request_id::text,
        jsonb_build_object(
          'kind', 'deposit_approve',
          'method', _r.method::text,
          'amount', _r.amount,
          'admin_id', _admin
        )
      );
    END IF;

    -- Timeline entries (pending -> approved -> completed)
    INSERT INTO public.request_status_history(
      request_kind, request_id, user_id, from_status, to_status,
      actor_id, actor_role, memo, evidence
    ) VALUES
      ('deposit', _request_id, _r.user_id, 'pending', 'approved',
       _admin, 'admin', _memo, COALESCE(_checklist, '{}'::jsonb)),
      ('deposit', _request_id, _r.user_id, 'approved', 'completed',
       _admin, 'admin', NULL, '{}'::jsonb);

  ELSIF _action = 'reject' THEN
    UPDATE public.deposit_requests SET
      status = 'rejected',
      admin_id = _admin,
      rejected_reason = _reason,
      admin_review_memo = _memo,
      admin_evidence_checklist = COALESCE(_checklist, '{}'::jsonb),
      updated_at = now()
    WHERE id = _request_id;

    INSERT INTO public.request_status_history(
      request_kind, request_id, user_id, from_status, to_status,
      actor_id, actor_role, memo, evidence
    ) VALUES (
      'deposit', _request_id, _r.user_id, 'pending', 'rejected',
      _admin, 'admin', COALESCE(_reason, _memo), COALESCE(_checklist, '{}'::jsonb)
    );
  ELSE
    RAISE EXCEPTION 'invalid_action';
  END IF;

  RETURN jsonb_build_object('ok', true, 'action', _action);
END
$function$;

-- Backfill: previously approved deposits without PHON credit
DO $backfill$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT d.* FROM public.deposit_requests d
     WHERE d.status::text = 'approved'
       AND NOT EXISTS (
         SELECT 1 FROM public.phon_transactions t
          WHERE t.ref = d.id::text
            AND t.meta->>'kind' = 'deposit_approve'
       )
  LOOP
    IF r.amount > 0 THEN
      INSERT INTO public.phon_balances(user_id, balance, updated_at)
      VALUES (r.user_id, r.amount, now())
      ON CONFLICT (user_id) DO UPDATE
        SET balance = phon_balances.balance + EXCLUDED.balance,
            updated_at = now();

      INSERT INTO public.phon_transactions(user_id, amount, kind, ref, meta)
      VALUES (
        r.user_id, r.amount, 'admin_adjust', r.id::text,
        jsonb_build_object(
          'kind', 'deposit_approve',
          'method', r.method::text,
          'amount', r.amount,
          'admin_id', r.admin_id,
          'backfill', true
        )
      );
    END IF;

    -- Backfill timeline only if missing
    IF NOT EXISTS (
      SELECT 1 FROM public.request_status_history
       WHERE request_kind = 'deposit' AND request_id = r.id
    ) THEN
      INSERT INTO public.request_status_history(
        request_kind, request_id, user_id, from_status, to_status,
        actor_id, actor_role, memo, evidence
      ) VALUES
        ('deposit', r.id, r.user_id, 'pending', 'approved',
         r.admin_id, 'admin', r.admin_review_memo,
         COALESCE(r.admin_evidence_checklist, '{}'::jsonb)),
        ('deposit', r.id, r.user_id, 'approved', 'completed',
         r.admin_id, 'admin', NULL, jsonb_build_object('backfill', true));
    END IF;
  END LOOP;
END
$backfill$;
