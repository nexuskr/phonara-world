-- PR3 v6 STEP 8 — settle_viral_milestone gate patch
-- Adds: verification gate, advisory race lock, idempotency log
-- Original RTP/bonus/entitlement logic UNCHANGED below the gate.

CREATE OR REPLACE FUNCTION public.settle_viral_milestone(_chain_id uuid, _milestone_key text, _catalog_key text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_chain    public.viral_attribution_chain%ROWTYPE;
  v_catalog  public.viral_mission_catalog%ROWTYPE;
  v_settings public.viral_settings%ROWTYPE;
  v_caller   uuid := auth.uid();
  v_jwt_role text := coalesce(current_setting('request.jwt.claims', true)::jsonb->>'role','');
  v_bonus    bigint := 0;
  v_existing public.viral_mission_submissions%ROWTYPE;
  v_already_paid bigint := 0;
  v_eligible boolean := false;
  v_entitlement text := 'not_eligible';
  v_result   jsonb;
  v_submission_id uuid;
  v_status   text;
BEGIN
  -- Auth: caller must be admin or service_role (called from triggers/edge fns)
  IF v_caller IS NULL AND v_jwt_role <> 'service_role' THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '42501';
  END IF;
  IF v_caller IS NOT NULL
     AND v_jwt_role <> 'service_role'
     AND NOT has_role(v_caller, 'admin'::app_role) THEN
    RAISE EXCEPTION 'admin or service_role required' USING ERRCODE = '42501';
  END IF;

  -- Validate milestone key
  IF _milestone_key NOT IN ('M1','M2','M3','M4') THEN
    RAISE EXCEPTION 'invalid milestone_key: %', _milestone_key;
  END IF;

  -- ============================================================
  -- 0) AUDIT: attempted
  -- ============================================================
  SELECT id INTO v_submission_id
  FROM public.viral_mission_submissions
  WHERE chain_id = _chain_id AND catalog_key = _catalog_key
  LIMIT 1;

  INSERT INTO public.viral_settlement_audit(submission_id, event_type, actor, details)
  VALUES (v_submission_id, 'attempted', 'system',
          jsonb_build_object('chain_id', _chain_id,
                             'catalog_key', _catalog_key,
                             'milestone', _milestone_key));

  -- ============================================================
  -- 1) VERIFICATION GATE (PR3 forensic firewall)
  --    valid 아니면 어떤 경우에도 정산 로직 실행 금지
  -- ============================================================
  IF v_submission_id IS NOT NULL THEN
    SELECT verification_status INTO v_status
    FROM public.viral_verification_log
    WHERE submission_id = v_submission_id;
  ELSE
    v_status := NULL;
  END IF;

  IF v_status IS DISTINCT FROM 'valid' THEN
    INSERT INTO public.viral_settlement_audit(submission_id, event_type, actor, details)
    VALUES (v_submission_id, 'gate_blocked', 'system',
            jsonb_build_object('reason','verification_failed',
                               'status', v_status,
                               'milestone', _milestone_key));
    RETURN jsonb_build_object('ok', false, 'reason', 'verification_failed',
                              'status', v_status);
  END IF;

  -- ============================================================
  -- 2) RACE LOCK (per submission, transactional)
  -- ============================================================
  PERFORM pg_advisory_xact_lock(hashtext('settle:' || v_submission_id::text));

  -- ============================================================
  -- 3) IDEMPOTENCY — single success guarantee
  -- ============================================================
  BEGIN
    INSERT INTO public.viral_settlement_log(
      submission_id, first_settled_at, final_eligible, final_bonus_credit
    ) VALUES (
      v_submission_id, now(), true, 0
    );
  EXCEPTION WHEN unique_violation THEN
    INSERT INTO public.viral_settlement_audit(submission_id, event_type, actor, details)
    VALUES (v_submission_id, 'race_skipped', 'system',
            jsonb_build_object('milestone', _milestone_key));
    RETURN jsonb_build_object('ok', true, 'reason', 'already_settled');
  END;

  -- ============================================================
  -- 4) ORIGINAL PR2 LOGIC — unchanged
  -- ============================================================

  -- Load chain
  SELECT * INTO v_chain
  FROM public.viral_attribution_chain
  WHERE id = _chain_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'chain not found';
  END IF;
  IF v_chain.window_expires_at < now() THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'window_expired');
  END IF;

  -- Idempotency: already recorded?
  IF v_chain.milestones_reached ? _milestone_key THEN
    RETURN jsonb_build_object('ok', true, 'reason', 'already_recorded',
                              'milestone', _milestone_key);
  END IF;

  -- Load catalog
  SELECT * INTO v_catalog
  FROM public.viral_mission_catalog
  WHERE key = _catalog_key;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'catalog not found: %', _catalog_key;
  END IF;

  -- Load settings (singleton)
  SELECT * INTO v_settings FROM public.viral_settings WHERE id = 1;

  -- THE SINGLE IF GATE (plan v3.3 lock)
  IF _milestone_key IN ('M1','M4') THEN
    v_eligible := true;
  ELSIF _milestone_key IN ('M2','M3') THEN
    v_eligible := COALESCE(v_settings.revenue_recognition_enabled, false);
  END IF;

  IF v_eligible THEN
    v_bonus := COALESCE((v_catalog.milestone_bonuses ->> _milestone_key)::bigint, 0);

    SELECT COALESCE(SUM(total_bonus_paid),0) INTO v_already_paid
    FROM public.viral_mission_submissions
    WHERE chain_id = _chain_id;

    IF v_already_paid + v_bonus > v_catalog.lifetime_cap_per_invitee THEN
      v_bonus := GREATEST(v_catalog.lifetime_cap_per_invitee - v_already_paid, 0);
    END IF;

    v_entitlement := CASE WHEN v_bonus > 0 THEN 'paid' ELSE 'not_eligible' END;
  ELSE
    v_bonus := 0;
    v_entitlement := 'not_eligible';
  END IF;

  INSERT INTO public.viral_mission_submissions
    (user_id, catalog_key, chain_id, status, entitlement_status,
     milestones_paid, total_bonus_paid, settled_at, metadata)
  VALUES
    (v_chain.inviter_id, _catalog_key, _chain_id, 'auto_verified', v_entitlement,
     jsonb_build_object(_milestone_key, v_bonus),
     v_bonus, now(),
     jsonb_build_object('rrm_enabled', v_settings.revenue_recognition_enabled,
                        'milestone', _milestone_key))
  ON CONFLICT (chain_id, catalog_key) DO UPDATE SET
    milestones_paid = viral_mission_submissions.milestones_paid
                       || jsonb_build_object(_milestone_key, EXCLUDED.total_bonus_paid),
    total_bonus_paid = viral_mission_submissions.total_bonus_paid + EXCLUDED.total_bonus_paid,
    entitlement_status = CASE
      WHEN viral_mission_submissions.entitlement_status = 'paid' THEN 'paid'
      ELSE EXCLUDED.entitlement_status
    END,
    settled_at = now();

  UPDATE public.viral_attribution_chain
     SET milestones_reached = milestones_reached
                              || jsonb_build_object(_milestone_key,
                                   jsonb_build_object('bonus', v_bonus,
                                                      'entitlement', v_entitlement,
                                                      'at', now())),
         updated_at = now()
   WHERE id = _chain_id;

  -- Settled audit
  INSERT INTO public.viral_settlement_audit(submission_id, event_type, actor, details)
  VALUES (v_submission_id, 'settled', 'system',
          jsonb_build_object('milestone', _milestone_key,
                             'bonus', v_bonus,
                             'entitlement', v_entitlement));

  v_result := jsonb_build_object(
    'ok', true,
    'milestone', _milestone_key,
    'eligible', v_eligible,
    'entitlement', v_entitlement,
    'bonus', v_bonus,
    'rrm_enabled', v_settings.revenue_recognition_enabled
  );
  RETURN v_result;
END;
$function$;