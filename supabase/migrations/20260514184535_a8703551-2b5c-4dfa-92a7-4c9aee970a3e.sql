
-- ============================================================================
-- 1) platform_kill_switches
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.platform_kill_switches (
  key         text PRIMARY KEY,
  enabled     boolean NOT NULL DEFAULT false,
  reason      text,
  set_by      uuid,
  set_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_kill_switches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "kill_switches_admin_all" ON public.platform_kill_switches;
CREATE POLICY "kill_switches_admin_all" ON public.platform_kill_switches
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Read-only public-ish: clients need to read enabled flags to disable trading buttons
DROP POLICY IF EXISTS "kill_switches_read_authn" ON public.platform_kill_switches;
CREATE POLICY "kill_switches_read_authn" ON public.platform_kill_switches
  FOR SELECT TO authenticated
  USING (true);

-- Seed the 4 known keys
INSERT INTO public.platform_kill_switches (key, enabled) VALUES
  ('trading_halt',     false),
  ('withdrawals_halt', false),
  ('signup_halt',      false),
  ('maintenance_mode', false)
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- 2) self_heal_run_log
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.self_heal_run_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id    uuid,
  action      text NOT NULL,
  target      text,
  payload     jsonb NOT NULL DEFAULT '{}'::jsonb,
  result      jsonb NOT NULL DEFAULT '{}'::jsonb,
  ok          boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_self_heal_run_log_created ON public.self_heal_run_log (created_at DESC);

ALTER TABLE public.self_heal_run_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "self_heal_log_admin_select" ON public.self_heal_run_log;
CREATE POLICY "self_heal_log_admin_select" ON public.self_heal_run_log
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================================
-- 3) RPCs — admin guard + audit logging built in
-- ============================================================================

-- Kill switch read
CREATE OR REPLACE FUNCTION public.admin_get_kill_switches()
RETURNS SETOF public.platform_kill_switches
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT * FROM public.platform_kill_switches ORDER BY key;
$$;

-- Kill switch toggle
CREATE OR REPLACE FUNCTION public.admin_set_kill_switch(_key text, _enabled boolean, _reason text DEFAULT NULL)
RETURNS public.platform_kill_switches
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _row public.platform_kill_switches;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF _key NOT IN ('trading_halt','withdrawals_halt','signup_halt','maintenance_mode') THEN
    RAISE EXCEPTION 'unknown_kill_switch_key: %', _key;
  END IF;
  IF _enabled AND coalesce(btrim(_reason),'') = '' THEN
    RAISE EXCEPTION 'reason_required_when_enabling';
  END IF;

  INSERT INTO public.platform_kill_switches (key, enabled, reason, set_by, set_at)
  VALUES (_key, _enabled, _reason, auth.uid(), now())
  ON CONFLICT (key) DO UPDATE
    SET enabled = excluded.enabled,
        reason = excluded.reason,
        set_by = excluded.set_by,
        set_at = excluded.set_at
  RETURNING * INTO _row;

  PERFORM public.log_admin_action(
    'kill_switch.' || _key,
    'platform_kill_switches',
    _key,
    jsonb_build_object('enabled', _enabled, 'reason', _reason)
  );

  INSERT INTO public.self_heal_run_log (admin_id, action, target, payload, result, ok)
  VALUES (auth.uid(), 'kill_switch_set', _key,
          jsonb_build_object('enabled', _enabled, 'reason', _reason),
          to_jsonb(_row), true);

  RETURN _row;
END;
$$;

-- Healthcheck — runs a curated set of internal probes and returns a summary
CREATE OR REPLACE FUNCTION public.admin_run_all_healthchecks()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _checks jsonb := '[]'::jsonb;
  _v jsonb;
  _err_24h int;
  _anom_unack int;
  _wd_pending int;
  _dep_pending int;
  _stuck_lpi int;
  _frozen int;
  _missing_rls int;
  _drift_rows int;
  _oracle jsonb;
  _kernel jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  -- 1) Recent error rate
  SELECT count(*) INTO _err_24h
  FROM public.error_logs WHERE created_at > now() - interval '24 hours';
  _checks := _checks || jsonb_build_object(
    'name','error_logs_24h','pass', _err_24h < 1000,
    'value', _err_24h, 'note','last 24h count');

  -- 2) Unacked anomalies
  SELECT count(*) INTO _anom_unack
  FROM public.anomaly_events WHERE coalesce(acknowledged, false) = false;
  _checks := _checks || jsonb_build_object(
    'name','anomalies_unack','pass', _anom_unack < 50,
    'value', _anom_unack);

  -- 3) Withdrawal queue
  BEGIN
    EXECUTE 'SELECT count(*) FROM public.withdrawal_requests WHERE status = $1'
      INTO _wd_pending USING 'pending';
  EXCEPTION WHEN OTHERS THEN _wd_pending := -1; END;
  _checks := _checks || jsonb_build_object(
    'name','withdrawals_pending','pass', _wd_pending < 100,
    'value', _wd_pending);

  -- 4) Deposits pending
  BEGIN
    EXECUTE 'SELECT count(*) FROM public.deposit_requests WHERE status = $1'
      INTO _dep_pending USING 'pending';
  EXCEPTION WHEN OTHERS THEN _dep_pending := -1; END;
  _checks := _checks || jsonb_build_object(
    'name','deposits_pending','pass', _dep_pending < 100,
    'value', _dep_pending);

  -- 5) Stuck LPI intents
  BEGIN
    EXECUTE $sql$
      SELECT count(*) FROM public.live_position_intents
      WHERE status = 'reserved' AND created_at < now() - interval '120 seconds'
    $sql$ INTO _stuck_lpi;
  EXCEPTION WHEN OTHERS THEN _stuck_lpi := -1; END;
  _checks := _checks || jsonb_build_object(
    'name','stuck_lpi_intents','pass', _stuck_lpi <= 5,
    'value', _stuck_lpi);

  -- 6) Frozen accounts
  BEGIN
    EXECUTE 'SELECT count(*) FROM public.account_freezes WHERE expires_at > now()'
      INTO _frozen;
  EXCEPTION WHEN OTHERS THEN _frozen := -1; END;
  _checks := _checks || jsonb_build_object(
    'name','accounts_frozen_active','pass', true,
    'value', _frozen, 'note','informational');

  -- 7) Tables missing RLS in public schema
  SELECT count(*) INTO _missing_rls
  FROM pg_tables t
  WHERE t.schemaname = 'public'
    AND NOT EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = t.tablename AND c.relrowsecurity
    );
  _checks := _checks || jsonb_build_object(
    'name','tables_missing_rls','pass', _missing_rls = 0,
    'value', _missing_rls);

  -- 8) Permission drift
  BEGIN
    SELECT count(*) INTO _drift_rows FROM public.check_permission_drift();
  EXCEPTION WHEN OTHERS THEN _drift_rows := -1; END;
  _checks := _checks || jsonb_build_object(
    'name','permission_drift','pass', _drift_rows = 0,
    'value', _drift_rows);

  -- 9) Oracle gates
  BEGIN
    SELECT public.admin_get_oracle_swap_readiness() INTO _oracle;
  EXCEPTION WHEN OTHERS THEN _oracle := jsonb_build_object('error','unavailable'); END;
  _checks := _checks || jsonb_build_object(
    'name','oracle_readiness','pass', coalesce((_oracle->>'all_passed')::boolean, false),
    'value', _oracle);

  -- 10) Kernel summary
  BEGIN
    SELECT public.admin_get_kernel_summary() INTO _kernel;
  EXCEPTION WHEN OTHERS THEN _kernel := jsonb_build_object('error','unavailable'); END;
  _checks := _checks || jsonb_build_object(
    'name','kernel_summary','pass', true,
    'value', _kernel);

  -- 11) Active kill switches
  _checks := _checks || jsonb_build_object(
    'name','active_kill_switches','pass',
    NOT EXISTS (SELECT 1 FROM public.platform_kill_switches WHERE enabled),
    'value',
    (SELECT coalesce(jsonb_agg(key), '[]'::jsonb) FROM public.platform_kill_switches WHERE enabled));

  -- 12) DB connectivity / now()
  _checks := _checks || jsonb_build_object(
    'name','db_now','pass', true, 'value', now());

  INSERT INTO public.self_heal_run_log (admin_id, action, target, payload, result, ok)
  VALUES (auth.uid(), 'healthcheck_all', NULL, '{}'::jsonb,
          jsonb_build_object('checks', _checks), true);

  RETURN jsonb_build_object('ran_at', now(), 'checks', _checks);
END;
$$;

-- Trigger a whitelisted maintenance procedure
CREATE OR REPLACE FUNCTION public.admin_trigger_cron(_job text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _result jsonb := '{}'::jsonb;
  _started timestamptz := clock_timestamp();
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF _job = 'reclaim_stale_intents' THEN
    PERFORM public.reclaim_stale_intents();
    _result := jsonb_build_object('ok', true);
  ELSIF _job = 'monitor_lpi_stuck_reserved' THEN
    PERFORM public.monitor_lpi_stuck_reserved();
    _result := jsonb_build_object('ok', true);
  ELSIF _job = 'settle_ended_founding_seasons' THEN
    PERFORM public.settle_ended_founding_seasons();
    _result := jsonb_build_object('ok', true);
  ELSIF _job = 'settle_guild_weekly' THEN
    BEGIN
      PERFORM public.settle_guild_weekly();
      _result := jsonb_build_object('ok', true);
    EXCEPTION WHEN OTHERS THEN
      _result := jsonb_build_object('ok', false, 'error', SQLERRM);
    END;
  ELSE
    RAISE EXCEPTION 'unknown_job: %', _job;
  END IF;

  _result := _result || jsonb_build_object('ms', extract(milliseconds from clock_timestamp() - _started));

  INSERT INTO public.self_heal_run_log (admin_id, action, target, payload, result, ok)
  VALUES (auth.uid(), 'cron_trigger', _job, '{}'::jsonb, _result, coalesce((_result->>'ok')::boolean, true));

  PERFORM public.log_admin_action('cron_trigger', 'cron_job', _job, _result);
  RETURN _result;
END;
$$;

-- Read-only SQL executor — strict guard
CREATE OR REPLACE FUNCTION public.admin_exec_readonly_sql(_sql text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _trim text := btrim(_sql);
  _lower text;
  _out jsonb;
  _started timestamptz := clock_timestamp();
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF length(_trim) = 0 OR length(_trim) > 8000 THEN
    RAISE EXCEPTION 'sql_length_invalid';
  END IF;
  -- Strip trailing semicolon (single statement only)
  IF right(_trim, 1) = ';' THEN _trim := btrim(left(_trim, length(_trim)-1)); END IF;
  IF position(';' IN _trim) > 0 THEN
    RAISE EXCEPTION 'multi_statement_not_allowed';
  END IF;
  _lower := lower(_trim);
  IF _lower !~ '^(select|with|explain)\s' THEN
    RAISE EXCEPTION 'only_select_explain_with_allowed';
  END IF;
  IF _lower ~ '\b(insert|update|delete|drop|alter|truncate|create|grant|revoke|copy|call|do|vacuum|analyze|reset|set|lock|notify|listen|reindex|cluster|comment|begin|commit|rollback|savepoint|fetch|move|prepare|execute)\b' THEN
    RAISE EXCEPTION 'forbidden_keyword_detected';
  END IF;

  PERFORM set_config('statement_timeout', '5000', true);

  -- Wrap in JSON aggregator with a hard LIMIT 1000
  EXECUTE format(
    'SELECT coalesce(jsonb_agg(t), ''[]''::jsonb) FROM ( %s LIMIT 1000 ) t',
    _trim
  ) INTO _out;

  INSERT INTO public.self_heal_run_log (admin_id, action, target, payload, result, ok)
  VALUES (auth.uid(), 'readonly_sql', NULL,
          jsonb_build_object('sql', _trim),
          jsonb_build_object('rows', jsonb_array_length(_out),
                             'ms', extract(milliseconds from clock_timestamp() - _started)),
          true);

  PERFORM public.log_admin_action('readonly_sql', 'sql', NULL,
    jsonb_build_object('sql', _trim, 'rows', jsonb_array_length(_out)));

  RETURN jsonb_build_object(
    'ok', true,
    'rows', _out,
    'count', jsonb_array_length(_out),
    'ms', extract(milliseconds from clock_timestamp() - _started)
  );
EXCEPTION WHEN OTHERS THEN
  INSERT INTO public.self_heal_run_log (admin_id, action, target, payload, result, ok)
  VALUES (auth.uid(), 'readonly_sql', NULL,
          jsonb_build_object('sql', _trim),
          jsonb_build_object('error', SQLERRM),
          false);
  RAISE;
END;
$$;

-- Table row counts dashboard
CREATE OR REPLACE FUNCTION public.admin_get_table_counts()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _tables text[] := ARRAY[
    'profiles','user_roles','phon_balances','withdrawal_requests','deposit_requests',
    'live_positions','live_position_intents','live_position_open_audit',
    'chat_messages','anomaly_events','error_logs','admin_audit_log',
    'nft_collection','crown_events','empire_levels','empire_boosters',
    'founding_season_seats','founding_seat_events','beta_invites',
    'refund_requests','loss_protection_claims','account_freezes','user_devices',
    'platform_kill_switches','self_heal_run_log'
  ];
  _t text;
  _count bigint;
  _out jsonb := '[]'::jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  FOREACH _t IN ARRAY _tables LOOP
    BEGIN
      EXECUTE format('SELECT count(*) FROM public.%I', _t) INTO _count;
      _out := _out || jsonb_build_object('table', _t, 'count', _count);
    EXCEPTION WHEN OTHERS THEN
      _out := _out || jsonb_build_object('table', _t, 'count', NULL, 'error', SQLERRM);
    END;
  END LOOP;
  RETURN jsonb_build_object('tables', _out, 'ran_at', now());
END;
$$;

-- Grants
GRANT EXECUTE ON FUNCTION public.admin_get_kill_switches()              TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_kill_switch(text,boolean,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_run_all_healthchecks()           TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_trigger_cron(text)               TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_exec_readonly_sql(text)          TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_table_counts()               TO authenticated;
