-- WAVE 1: TIER S — Admin Ops Hardening

CREATE OR REPLACE FUNCTION public.admin_freeze_user(_user_id uuid, _hours integer DEFAULT 24, _reason text DEFAULT 'manual_admin_freeze'::text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE freeze_id uuid; v_admin uuid := auth.uid();
BEGIN
  IF NOT public.has_role(v_admin, 'admin'::app_role) THEN RAISE EXCEPTION 'admin_only'; END IF;
  IF v_admin = _user_id THEN RAISE EXCEPTION 'cannot_target_self'; END IF;
  IF _hours < 1 OR _hours > 720 THEN RAISE EXCEPTION 'invalid_hours'; END IF;
  INSERT INTO public.account_freezes (user_id, expires_at, reason, source, severity, metadata)
  VALUES (_user_id, now() + make_interval(hours => _hours), _reason, 'admin_manual', 'warn',
          jsonb_build_object('admin_id', v_admin, 'hours', _hours)) RETURNING id INTO freeze_id;
  INSERT INTO public.anomaly_events (rule, severity, user_id, payload)
  VALUES ('manual_admin_freeze', 'warn', _user_id, jsonb_build_object('hours', _hours, 'reason', _reason, 'admin_id', v_admin));
  INSERT INTO public.admin_audit_log(admin_id, action, target_type, target_id, payload)
  VALUES (v_admin, 'admin_freeze_user', 'user', _user_id, jsonb_build_object('hours', _hours, 'reason', _reason, 'freeze_id', freeze_id));
  RETURN freeze_id;
END $$;

CREATE OR REPLACE FUNCTION public.admin_unfreeze_user(_user_id uuid)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE affected int; v_admin uuid := auth.uid();
BEGIN
  IF NOT public.has_role(v_admin, 'admin'::app_role) THEN RAISE EXCEPTION 'admin_only'; END IF;
  IF v_admin = _user_id THEN RAISE EXCEPTION 'cannot_target_self'; END IF;
  UPDATE public.account_freezes SET released_at = now(), released_by = v_admin
   WHERE user_id = _user_id AND released_at IS NULL;
  GET DIAGNOSTICS affected = ROW_COUNT;
  INSERT INTO public.admin_audit_log(admin_id, action, target_type, target_id, payload)
  VALUES (v_admin, 'admin_unfreeze_user', 'user', _user_id, jsonb_build_object('affected', affected));
  RETURN affected;
END $$;

CREATE OR REPLACE FUNCTION public.admin_set_tier(_target UUID, _tier public.user_tier)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _uid UUID := auth.uid();
BEGIN
  IF NOT public.has_role(_uid,'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _uid = _target THEN RAISE EXCEPTION 'cannot_target_self'; END IF;
  UPDATE public.profiles SET tier=_tier, updated_at=now() WHERE id=_target;
  INSERT INTO public.admin_audit_log(admin_id, action, target_type, target_id, payload)
  VALUES (_uid, 'admin_set_tier', 'user', _target, jsonb_build_object('tier', _tier));
  RETURN jsonb_build_object('ok',true);
END $$;

CREATE OR REPLACE FUNCTION public.admin_adjust_balance(_target UUID, _delta BIGINT, _reason TEXT)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _uid UUID := auth.uid(); _wallet public.wallet_balances%ROWTYPE;
BEGIN
  IF NOT public.has_role(_uid,'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _uid = _target THEN RAISE EXCEPTION 'cannot_target_self'; END IF;
  IF _reason IS NULL OR length(trim(_reason)) < 4 THEN RAISE EXCEPTION 'reason_required'; END IF;
  SELECT * INTO _wallet FROM public.wallet_balances WHERE user_id=_target FOR UPDATE;
  IF NOT FOUND THEN INSERT INTO public.wallet_balances(user_id) VALUES (_target) RETURNING * INTO _wallet; END IF;
  IF _wallet.available_balance + _delta < 0 THEN RAISE EXCEPTION 'insufficient_funds'; END IF;
  UPDATE public.wallet_balances SET available_balance = available_balance + _delta,
    total_balance = total_balance + _delta, updated_at=now() WHERE user_id=_target;
  INSERT INTO public.admin_audit_log(admin_id, action, target_type, target_id, payload)
  VALUES (_uid, 'admin_adjust_balance', 'user', _target, jsonb_build_object('delta', _delta, 'reason', _reason));
  RETURN jsonb_build_object('ok', true, 'new_balance', _wallet.available_balance + _delta);
END $$;

CREATE OR REPLACE FUNCTION public.admin_bulk_freeze_users(_user_ids uuid[], _hours int DEFAULT 24, _reason text DEFAULT 'bulk_admin_freeze')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_admin uuid := auth.uid(); v_uid uuid; v_ok int := 0; v_skipped int := 0; v_errors jsonb := '[]'::jsonb;
BEGIN
  IF NOT public.has_role(v_admin, 'admin'::app_role) THEN RAISE EXCEPTION 'admin_only'; END IF;
  IF _user_ids IS NULL OR array_length(_user_ids, 1) IS NULL THEN RAISE EXCEPTION 'no_users'; END IF;
  IF array_length(_user_ids, 1) > 200 THEN RAISE EXCEPTION 'batch_too_large'; END IF;
  IF _hours < 1 OR _hours > 720 THEN RAISE EXCEPTION 'invalid_hours'; END IF;
  FOREACH v_uid IN ARRAY _user_ids LOOP
    BEGIN
      IF v_uid = v_admin THEN v_skipped := v_skipped + 1; CONTINUE; END IF;
      INSERT INTO public.account_freezes(user_id, expires_at, reason, source, severity, metadata)
      VALUES (v_uid, now() + make_interval(hours => _hours), _reason, 'admin_bulk', 'warn',
              jsonb_build_object('admin_id', v_admin, 'hours', _hours));
      v_ok := v_ok + 1;
    EXCEPTION WHEN OTHERS THEN v_errors := v_errors || jsonb_build_object('user_id', v_uid, 'error', SQLERRM);
    END;
  END LOOP;
  INSERT INTO public.admin_audit_log(admin_id, action, target_type, payload)
  VALUES (v_admin, 'admin_bulk_freeze_users', 'user_batch',
          jsonb_build_object('count', array_length(_user_ids,1), 'ok', v_ok, 'skipped_self', v_skipped, 'errors', v_errors, 'hours', _hours, 'reason', _reason));
  RETURN jsonb_build_object('ok', v_ok, 'skipped', v_skipped, 'errors', v_errors);
END $$;

CREATE OR REPLACE FUNCTION public.admin_bulk_unfreeze_users(_user_ids uuid[])
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_admin uuid := auth.uid(); v_affected int;
BEGIN
  IF NOT public.has_role(v_admin, 'admin'::app_role) THEN RAISE EXCEPTION 'admin_only'; END IF;
  IF _user_ids IS NULL OR array_length(_user_ids,1) IS NULL THEN RAISE EXCEPTION 'no_users'; END IF;
  IF array_length(_user_ids,1) > 200 THEN RAISE EXCEPTION 'batch_too_large'; END IF;
  UPDATE public.account_freezes SET released_at = now(), released_by = v_admin
   WHERE user_id = ANY(_user_ids) AND released_at IS NULL AND user_id <> v_admin;
  GET DIAGNOSTICS v_affected = ROW_COUNT;
  INSERT INTO public.admin_audit_log(admin_id, action, target_type, payload)
  VALUES (v_admin, 'admin_bulk_unfreeze_users', 'user_batch',
          jsonb_build_object('count', array_length(_user_ids,1), 'affected', v_affected));
  RETURN jsonb_build_object('affected', v_affected);
END $$;

CREATE OR REPLACE FUNCTION public.admin_bulk_set_tier(_user_ids uuid[], _tier public.user_tier)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_admin uuid := auth.uid(); v_affected int;
BEGIN
  IF NOT public.has_role(v_admin, 'admin'::app_role) THEN RAISE EXCEPTION 'admin_only'; END IF;
  IF _user_ids IS NULL OR array_length(_user_ids,1) IS NULL THEN RAISE EXCEPTION 'no_users'; END IF;
  IF array_length(_user_ids,1) > 200 THEN RAISE EXCEPTION 'batch_too_large'; END IF;
  UPDATE public.profiles SET tier = _tier, updated_at = now() WHERE id = ANY(_user_ids) AND id <> v_admin;
  GET DIAGNOSTICS v_affected = ROW_COUNT;
  INSERT INTO public.admin_audit_log(admin_id, action, target_type, payload)
  VALUES (v_admin, 'admin_bulk_set_tier', 'user_batch',
          jsonb_build_object('count', array_length(_user_ids,1), 'affected', v_affected, 'tier', _tier));
  RETURN jsonb_build_object('affected', v_affected);
END $$;

REVOKE ALL ON FUNCTION public.admin_bulk_freeze_users(uuid[], int, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_bulk_unfreeze_users(uuid[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_bulk_set_tier(uuid[], public.user_tier) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_bulk_freeze_users(uuid[], int, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_bulk_unfreeze_users(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_bulk_set_tier(uuid[], public.user_tier) TO authenticated;

DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.error_logs;       EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_audit_log;  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.anomaly_events;   EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

CREATE OR REPLACE FUNCTION public.admin_run_rls_smoke()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_admin uuid := auth.uid(); v_results jsonb := '[]'::jsonb; v_count int; v_rls boolean;
BEGIN
  IF NOT public.has_role(v_admin, 'admin'::app_role) THEN RAISE EXCEPTION 'admin_only'; END IF;

  SELECT COUNT(*) INTO v_count FROM pg_policy WHERE polrelid = 'public.pay_config'::regclass AND polcmd IN ('a','w','d','*');
  v_results := v_results || jsonb_build_object('test','pay_config_admin_only_write','pass', v_count >= 1, 'count', v_count);

  SELECT COUNT(*) INTO v_count FROM pg_trigger WHERE tgrelid = 'public.profiles'::regclass AND tgname = 'guard_profile_sensitive_columns';
  v_results := v_results || jsonb_build_object('test','profiles_sensitive_guard','pass', v_count = 1);

  SELECT relrowsecurity INTO v_rls FROM pg_class WHERE oid='public.wallet_balances'::regclass;
  v_results := v_results || jsonb_build_object('test','wallet_balances_rls_enabled','pass', v_rls);

  SELECT COUNT(*) INTO v_count FROM pg_policy WHERE polrelid = 'public.anomaly_events'::regclass AND polcmd = 'r';
  v_results := v_results || jsonb_build_object('test','anomaly_events_select_policies','count', v_count, 'pass', v_count >= 1);

  SELECT COUNT(*) INTO v_count FROM pg_policy WHERE polrelid = 'public.admin_audit_log'::regclass AND polcmd = 'r';
  v_results := v_results || jsonb_build_object('test','admin_audit_log_select_policies','count', v_count, 'pass', v_count >= 1);

  SELECT relrowsecurity INTO v_rls FROM pg_class WHERE oid='public.account_freezes'::regclass;
  v_results := v_results || jsonb_build_object('test','account_freezes_rls_enabled','pass', v_rls);

  SELECT COUNT(*) INTO v_count FROM information_schema.routine_privileges
   WHERE specific_schema='public' AND grantee='anon'
     AND routine_name IN ('admin_freeze_user','admin_unfreeze_user','admin_set_tier','admin_adjust_balance',
                          'admin_bulk_freeze_users','admin_bulk_unfreeze_users','admin_bulk_set_tier');
  v_results := v_results || jsonb_build_object('test','admin_rpcs_anon_revoked','anon_grants', v_count, 'pass', v_count = 0);

  INSERT INTO public.admin_audit_log(admin_id, action, target_type, payload)
  VALUES (v_admin, 'admin_run_rls_smoke', 'system', jsonb_build_object('results', v_results));
  RETURN jsonb_build_object('run_at', now(), 'results', v_results);
END $$;

REVOKE ALL ON FUNCTION public.admin_run_rls_smoke() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_run_rls_smoke() TO authenticated;

CREATE TABLE IF NOT EXISTS public.service_key_rotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rotated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  rotated_at timestamptz NOT NULL DEFAULT now(),
  key_kind text NOT NULL CHECK (key_kind IN ('service_role','anon','jwt_secret','other')),
  reason text,
  notes text
);
ALTER TABLE public.service_key_rotations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS skr_admin_select ON public.service_key_rotations;
CREATE POLICY skr_admin_select ON public.service_key_rotations FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS skr_admin_insert ON public.service_key_rotations;
CREATE POLICY skr_admin_insert ON public.service_key_rotations FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin') AND rotated_by = auth.uid());

CREATE OR REPLACE FUNCTION public.admin_log_key_rotation(_kind text, _reason text, _notes text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid; v_admin uuid := auth.uid();
BEGIN
  IF NOT public.has_role(v_admin,'admin') THEN RAISE EXCEPTION 'admin_only'; END IF;
  INSERT INTO public.service_key_rotations(rotated_by, key_kind, reason, notes)
  VALUES (v_admin, _kind, _reason, _notes) RETURNING id INTO v_id;
  INSERT INTO public.admin_audit_log(admin_id, action, target_type, target_id, payload)
  VALUES (v_admin, 'admin_log_key_rotation', 'system', v_id, jsonb_build_object('kind', _kind, 'reason', _reason));
  RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.admin_log_key_rotation(text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_log_key_rotation(text,text,text) TO authenticated;

INSERT INTO public.function_permissions_baseline(function_name, function_args, allowed_roles, category, note)
VALUES
  ('admin_bulk_freeze_users','_user_ids uuid[], _hours int, _reason text','{authenticated}','admin_only','admin RPC'),
  ('admin_bulk_unfreeze_users','_user_ids uuid[]','{authenticated}','admin_only','admin RPC'),
  ('admin_bulk_set_tier','_user_ids uuid[], _tier public.user_tier','{authenticated}','admin_only','admin RPC'),
  ('admin_run_rls_smoke','','{authenticated}','admin_only','admin diagnostic'),
  ('admin_log_key_rotation','_kind text, _reason text, _notes text','{authenticated}','admin_only','admin audit')
ON CONFLICT (function_name, function_args) DO NOTHING;