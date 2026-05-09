-- ============================================================
-- 1. PIN LOCKOUT TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.pin_lockouts (
  user_id uuid PRIMARY KEY,
  fail_count integer NOT NULL DEFAULT 0,
  last_failed_at timestamptz,
  locked_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pin_lockouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY pl_self_select ON public.pin_lockouts
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- 2. RATE LIMIT BUCKETS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.rate_limit_buckets (
  user_id uuid NOT NULL,
  scope text NOT NULL,
  bucket_minute timestamptz NOT NULL,
  count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, scope, bucket_minute)
);
ALTER TABLE public.rate_limit_buckets ENABLE ROW LEVEL SECURITY;
CREATE POLICY rlb_admin_read ON public.rate_limit_buckets
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.enforce_rate_limit(_scope text, _max_per_min integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_bucket timestamptz := date_trunc('minute', now());
  v_cnt integer;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  INSERT INTO public.rate_limit_buckets (user_id, scope, bucket_minute, count)
  VALUES (v_user, _scope, v_bucket, 1)
  ON CONFLICT (user_id, scope, bucket_minute)
  DO UPDATE SET count = rate_limit_buckets.count + 1
  RETURNING count INTO v_cnt;
  IF v_cnt > _max_per_min THEN
    -- log anomaly
    INSERT INTO public.anomaly_events (rule, severity, user_id, evidence, dedupe_key)
    VALUES ('rate_limit_exceeded', 'medium', v_user,
      jsonb_build_object('scope', _scope, 'count', v_cnt, 'limit', _max_per_min),
      'rl:' || _scope || ':' || v_user::text || ':' || to_char(v_bucket,'YYYYMMDDHH24MI'))
    ON CONFLICT DO NOTHING;
    RAISE EXCEPTION '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.' USING ERRCODE = '54000';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.enforce_rate_limit(text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.enforce_rate_limit(text, integer) TO authenticated;

-- old bucket cleanup (called from cron-settle-packages or any cron)
CREATE OR REPLACE FUNCTION public.gc_rate_limit_buckets()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_n integer;
BEGIN
  DELETE FROM public.rate_limit_buckets
   WHERE bucket_minute < now() - interval '2 hours';
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n;
END;
$$;

-- ============================================================
-- 3. PATCH submit_deposit / submit_package_purchase / request_withdrawal
--    by wrapping with rate limit prelude (drop+recreate via wrappers).
--    We add rate limit calls inside a BEFORE trigger on the request tables.
-- ============================================================
CREATE OR REPLACE FUNCTION public.tg_rl_deposit_requests()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.enforce_rate_limit('deposit_submit', 6);
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS rl_deposit_requests ON public.deposit_requests;
CREATE TRIGGER rl_deposit_requests
  BEFORE INSERT ON public.deposit_requests
  FOR EACH ROW EXECUTE FUNCTION public.tg_rl_deposit_requests();

CREATE OR REPLACE FUNCTION public.tg_rl_package_purchases()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.enforce_rate_limit('package_submit', 6);
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS rl_package_purchases ON public.package_purchases;
CREATE TRIGGER rl_package_purchases
  BEFORE INSERT ON public.package_purchases
  FOR EACH ROW EXECUTE FUNCTION public.tg_rl_package_purchases();

-- For withdrawals: there is a withdraw_requests table; guard if exists
DO $do$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='withdraw_requests') THEN
    EXECUTE $sql$
      CREATE OR REPLACE FUNCTION public.tg_rl_withdraw_requests()
      RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $f$
      BEGIN
        PERFORM public.enforce_rate_limit('withdraw_submit', 4);
        RETURN NEW;
      END;
      $f$;
      DROP TRIGGER IF EXISTS rl_withdraw_requests ON public.withdraw_requests;
      CREATE TRIGGER rl_withdraw_requests
        BEFORE INSERT ON public.withdraw_requests
        FOR EACH ROW EXECUTE FUNCTION public.tg_rl_withdraw_requests();
    $sql$;
  END IF;
END $do$;

-- ============================================================
-- 4. AUTO ACCOUNT FREEZE on anomaly clusters
-- ============================================================
CREATE OR REPLACE FUNCTION public.tg_anomaly_autofreeze()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_high_count integer;
BEGIN
  IF NEW.user_id IS NULL THEN RETURN NEW; END IF;

  -- already frozen (active)? skip
  IF EXISTS (
    SELECT 1 FROM public.account_freezes
     WHERE user_id = NEW.user_id
       AND released_at IS NULL
       AND (expires_at IS NULL OR expires_at > now())
  ) THEN
    RETURN NEW;
  END IF;

  IF NEW.severity = 'critical' THEN
    INSERT INTO public.account_freezes (user_id, reason, source, severity, expires_at, metadata)
    VALUES (NEW.user_id, 'auto: critical anomaly ' || NEW.rule, 'auto-anomaly', 'critical',
            now() + interval '24 hours',
            jsonb_build_object('anomaly_id', NEW.id, 'rule', NEW.rule));
    RETURN NEW;
  END IF;

  IF NEW.severity = 'high' THEN
    SELECT count(*) INTO v_high_count
      FROM public.anomaly_events
     WHERE user_id = NEW.user_id
       AND severity = 'high'
       AND created_at > now() - interval '10 minutes';
    IF v_high_count >= 3 THEN
      INSERT INTO public.account_freezes (user_id, reason, source, severity, expires_at, metadata)
      VALUES (NEW.user_id, 'auto: 3+ high anomalies in 10min', 'auto-anomaly', 'high',
              now() + interval '24 hours',
              jsonb_build_object('trigger_anomaly_id', NEW.id, 'rule', NEW.rule, 'count', v_high_count));
    END IF;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS anomaly_autofreeze ON public.anomaly_events;
CREATE TRIGGER anomaly_autofreeze
  AFTER INSERT ON public.anomaly_events
  FOR EACH ROW EXECUTE FUNCTION public.tg_anomaly_autofreeze();

-- ============================================================
-- 5. PIN LOCKOUT helpers (RPCs)
-- ============================================================
CREATE OR REPLACE FUNCTION public.pin_lockout_status(_user uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target uuid := COALESCE(_user, auth.uid());
  v_row public.pin_lockouts;
BEGIN
  IF v_target IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  IF v_target <> auth.uid() AND NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'permission denied';
  END IF;
  SELECT * INTO v_row FROM public.pin_lockouts WHERE user_id = v_target;
  RETURN jsonb_build_object(
    'fail_count', COALESCE(v_row.fail_count, 0),
    'locked_until', v_row.locked_until,
    'is_locked', (v_row.locked_until IS NOT NULL AND v_row.locked_until > now())
  );
END;
$$;
REVOKE ALL ON FUNCTION public.pin_lockout_status(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pin_lockout_status(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.pin_record_attempt(_success boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_row public.pin_lockouts;
  v_locked_until timestamptz;
  v_fail integer;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;

  SELECT * INTO v_row FROM public.pin_lockouts WHERE user_id = v_user FOR UPDATE;

  -- If currently locked and not success, reject
  IF v_row.locked_until IS NOT NULL AND v_row.locked_until > now() AND NOT _success THEN
    RETURN jsonb_build_object('locked', true, 'locked_until', v_row.locked_until,
      'fail_count', COALESCE(v_row.fail_count, 0));
  END IF;

  IF _success THEN
    INSERT INTO public.pin_lockouts (user_id, fail_count, last_failed_at, locked_until, updated_at)
    VALUES (v_user, 0, NULL, NULL, now())
    ON CONFLICT (user_id) DO UPDATE
      SET fail_count = 0, locked_until = NULL, updated_at = now();
    RETURN jsonb_build_object('locked', false, 'fail_count', 0);
  END IF;

  v_fail := COALESCE(v_row.fail_count, 0) + 1;
  v_locked_until := CASE WHEN v_fail >= 5 THEN now() + interval '24 hours' ELSE NULL END;

  INSERT INTO public.pin_lockouts (user_id, fail_count, last_failed_at, locked_until, updated_at)
  VALUES (v_user, v_fail, now(), v_locked_until, now())
  ON CONFLICT (user_id) DO UPDATE
    SET fail_count = v_fail,
        last_failed_at = now(),
        locked_until = v_locked_until,
        updated_at = now();

  IF v_fail >= 5 THEN
    -- security notification
    INSERT INTO public.notifications (user_id, kind, title, body, payload)
    VALUES (v_user, 'security_pin_locked', '🔒 출금 PIN 24시간 잠금',
            'PIN 5회 오입력으로 24시간 입력이 차단되었습니다. 본인이 아닐 경우 즉시 비밀번호를 변경해 주세요.',
            jsonb_build_object('locked_until', v_locked_until));
    INSERT INTO public.anomaly_events (rule, severity, user_id, evidence, dedupe_key)
    VALUES ('pin_lockout', 'high', v_user,
      jsonb_build_object('fail_count', v_fail),
      'pinlock:' || v_user::text || ':' || to_char(now(), 'YYYYMMDDHH24'))
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN jsonb_build_object('locked', v_fail >= 5, 'locked_until', v_locked_until, 'fail_count', v_fail);
END;
$$;
REVOKE ALL ON FUNCTION public.pin_record_attempt(boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pin_record_attempt(boolean) TO authenticated;

-- ============================================================
-- 6. Baseline registration
-- ============================================================
INSERT INTO public.function_permissions_baseline (function_name, function_args, allowed_roles, category, note) VALUES
  ('enforce_rate_limit', 'text, integer', ARRAY['authenticated'], 'security', 'rate limit guard, internal use'),
  ('gc_rate_limit_buckets', '', ARRAY['internal_cron'], 'security', 'cleanup rate limit buckets older than 2h'),
  ('tg_rl_deposit_requests', '', ARRAY['internal_trigger'], 'trigger', 'BEFORE INSERT rate limit on deposits'),
  ('tg_rl_package_purchases', '', ARRAY['internal_trigger'], 'trigger', 'BEFORE INSERT rate limit on packages'),
  ('tg_rl_withdraw_requests', '', ARRAY['internal_trigger'], 'trigger', 'BEFORE INSERT rate limit on withdrawals (if table exists)'),
  ('tg_anomaly_autofreeze', '', ARRAY['internal_trigger'], 'trigger', 'AFTER INSERT auto-freeze on anomaly cluster'),
  ('pin_lockout_status', 'uuid', ARRAY['authenticated'], 'security', 'check current pin lockout for self/admin'),
  ('pin_record_attempt', 'boolean', ARRAY['authenticated'], 'security', 'record PIN success/fail; locks for 24h after 5 fails')
ON CONFLICT DO NOTHING;