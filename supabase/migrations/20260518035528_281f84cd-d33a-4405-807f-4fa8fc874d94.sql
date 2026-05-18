
-- IMPERIAL PHASE 4 — Limited Rollout Production Launch
-- Money-flow 8경로 본문 무변경 (git diff = 0). 신규 객체 imperial_ prefix.

-- =========================================================
-- 1) Observability Events (전사 관측)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.imperial_observability_events (
  id bigserial PRIMARY KEY,
  ts timestamptz NOT NULL DEFAULT now(),
  kind text NOT NULL,
  severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info','warn','error','critical')),
  dedupe_key text,
  user_id uuid,
  trace_id text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_imp_obs_ts ON public.imperial_observability_events (ts DESC);
CREATE INDEX IF NOT EXISTS idx_imp_obs_kind_ts ON public.imperial_observability_events (kind, ts DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_imp_obs_dedupe
  ON public.imperial_observability_events (kind, dedupe_key)
  WHERE dedupe_key IS NOT NULL;

ALTER TABLE public.imperial_observability_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "imp_obs_admin_select" ON public.imperial_observability_events;
CREATE POLICY "imp_obs_admin_select" ON public.imperial_observability_events
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- =========================================================
-- 2) Rollout Phases
-- =========================================================
CREATE TABLE IF NOT EXISTS public.imperial_rollout_phases (
  id bigserial PRIMARY KEY,
  phase int NOT NULL CHECK (phase BETWEEN 1 AND 4),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','rolled_back')),
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  started_by uuid,
  notes text,
  metrics_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_imp_rollout_started ON public.imperial_rollout_phases (started_at DESC);

ALTER TABLE public.imperial_rollout_phases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "imp_rollout_admin_select" ON public.imperial_rollout_phases;
CREATE POLICY "imp_rollout_admin_select" ON public.imperial_rollout_phases
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- =========================================================
-- 3) Auto-Heal Log
-- =========================================================
CREATE TABLE IF NOT EXISTS public.imperial_auto_heal_log (
  id bigserial PRIMARY KEY,
  ts timestamptz NOT NULL DEFAULT now(),
  kind text NOT NULL,
  severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info','warn','error','critical')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_imp_heal_ts ON public.imperial_auto_heal_log (ts DESC);

ALTER TABLE public.imperial_auto_heal_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "imp_heal_admin_select" ON public.imperial_auto_heal_log;
CREATE POLICY "imp_heal_admin_select" ON public.imperial_auto_heal_log
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- =========================================================
-- RPC: imperial_log_observability
-- =========================================================
CREATE OR REPLACE FUNCTION public.imperial_log_observability(
  _kind text,
  _severity text DEFAULT 'info',
  _dedupe_key text DEFAULT NULL,
  _payload jsonb DEFAULT '{}'::jsonb
) RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id bigint;
BEGIN
  INSERT INTO public.imperial_observability_events (kind, severity, dedupe_key, user_id, payload)
  VALUES (_kind, COALESCE(_severity,'info'), _dedupe_key, auth.uid(), COALESCE(_payload,'{}'::jsonb))
  ON CONFLICT (kind, dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;

REVOKE ALL ON FUNCTION public.imperial_log_observability(text,text,text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.imperial_log_observability(text,text,text,jsonb) TO authenticated;

-- =========================================================
-- RPC: imperial_rollout_activate (admin only)
-- =========================================================
CREATE OR REPLACE FUNCTION public.imperial_rollout_activate(
  _phase int,
  _notes text DEFAULT NULL,
  _metrics jsonb DEFAULT '{}'::jsonb
) RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id bigint;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden: admin only';
  END IF;
  IF _phase < 1 OR _phase > 4 THEN
    RAISE EXCEPTION 'invalid phase';
  END IF;

  -- close any active phase
  UPDATE public.imperial_rollout_phases
     SET status='completed', ended_at=now()
   WHERE status='active';

  INSERT INTO public.imperial_rollout_phases (phase, status, started_by, notes, metrics_snapshot)
  VALUES (_phase, 'active', auth.uid(), _notes, COALESCE(_metrics,'{}'::jsonb))
  RETURNING id INTO v_id;

  PERFORM public.imperial_log_observability(
    'rollout_phase_activated', 'info', 'phase:'||_phase||':'||to_char(now(),'YYYYMMDDHH24MI'),
    jsonb_build_object('phase', _phase, 'notes', _notes)
  );

  RETURN v_id;
END $$;

REVOKE ALL ON FUNCTION public.imperial_rollout_activate(int,text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.imperial_rollout_activate(int,text,jsonb) TO authenticated;

-- =========================================================
-- RPC: imperial_get_rollout_state (admin)
-- =========================================================
CREATE OR REPLACE FUNCTION public.imperial_get_rollout_state()
RETURNS TABLE(phase int, status text, started_at timestamptz, started_by uuid, notes text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT phase, status, started_at, started_by, notes
    FROM public.imperial_rollout_phases
   WHERE status='active'
   ORDER BY started_at DESC
   LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.imperial_get_rollout_state() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.imperial_get_rollout_state() TO authenticated;

-- =========================================================
-- RPC: imperial_auto_heal_tick (cron)
-- =========================================================
CREATE OR REPLACE FUNCTION public.imperial_auto_heal_tick()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reclaimed int := 0;
  v_burn_1h numeric := 0;
  v_inject_1h numeric := 0;
  v_emission_scale numeric := 1;
  v_alerts int := 0;
BEGIN
  -- 1) reclaim stale intents (delegate if function exists)
  BEGIN
    PERFORM public.reclaim_stale_intents();
    v_reclaimed := 1;
  EXCEPTION WHEN undefined_function THEN
    v_reclaimed := 0;
  END;

  -- 2) burn vs injection sanity (last 1h)
  BEGIN
    SELECT COALESCE(SUM(amount),0) INTO v_burn_1h
      FROM public.imperial_treasury_ledger
     WHERE kind='burn' AND ts > now() - interval '1 hour';
    SELECT COALESCE(SUM(amount),0) INTO v_inject_1h
      FROM public.imperial_treasury_ledger
     WHERE kind='injection_in' AND ts > now() - interval '1 hour';
  EXCEPTION WHEN undefined_table OR undefined_column THEN
    v_burn_1h := 0; v_inject_1h := 0;
  END;

  IF v_burn_1h = 0 AND v_inject_1h > 0 THEN
    PERFORM public.imperial_log_observability(
      'auto_heal_burn_zero_with_injection', 'warn',
      to_char(now(),'YYYYMMDDHH24'),
      jsonb_build_object('burn_1h', v_burn_1h, 'inject_1h', v_inject_1h)
    );
    v_alerts := v_alerts + 1;
  END IF;

  -- 3) emission scale drift
  BEGIN
    SELECT COALESCE(scale_factor, 1) INTO v_emission_scale
      FROM public.imperial_emission_state LIMIT 1;
  EXCEPTION WHEN undefined_table OR undefined_column THEN
    v_emission_scale := 1;
  END;

  IF ABS(v_emission_scale - 1) > 0.5 THEN
    PERFORM public.imperial_log_observability(
      'auto_heal_emission_drift', 'warn',
      to_char(now(),'YYYYMMDDHH24'),
      jsonb_build_object('scale', v_emission_scale)
    );
    v_alerts := v_alerts + 1;
  END IF;

  INSERT INTO public.imperial_auto_heal_log (kind, severity, payload)
  VALUES ('tick', CASE WHEN v_alerts>0 THEN 'warn' ELSE 'info' END,
    jsonb_build_object(
      'reclaimed_called', v_reclaimed,
      'burn_1h', v_burn_1h,
      'inject_1h', v_inject_1h,
      'emission_scale', v_emission_scale,
      'alerts', v_alerts
    ));

  RETURN jsonb_build_object(
    'ok', true,
    'alerts', v_alerts,
    'burn_1h', v_burn_1h,
    'inject_1h', v_inject_1h,
    'emission_scale', v_emission_scale
  );
END $$;

REVOKE ALL ON FUNCTION public.imperial_auto_heal_tick() FROM PUBLIC;

-- =========================================================
-- RPC: imperial_get_auto_heal_log (admin)
-- =========================================================
CREATE OR REPLACE FUNCTION public.imperial_get_auto_heal_log(_hours int DEFAULT 24)
RETURNS TABLE(id bigint, ts timestamptz, kind text, severity text, payload jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
    SELECT l.id, l.ts, l.kind, l.severity, l.payload
      FROM public.imperial_auto_heal_log l
     WHERE l.ts > now() - make_interval(hours => GREATEST(1, _hours))
     ORDER BY l.ts DESC
     LIMIT 500;
END $$;

REVOKE ALL ON FUNCTION public.imperial_get_auto_heal_log(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.imperial_get_auto_heal_log(int) TO authenticated;

-- =========================================================
-- RPC: imperial_get_observability_stream (admin)
-- =========================================================
CREATE OR REPLACE FUNCTION public.imperial_get_observability_stream(
  _hours int DEFAULT 6,
  _severity text DEFAULT NULL
) RETURNS TABLE(id bigint, ts timestamptz, kind text, severity text, dedupe_key text, payload jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
    SELECT e.id, e.ts, e.kind, e.severity, e.dedupe_key, e.payload
      FROM public.imperial_observability_events e
     WHERE e.ts > now() - make_interval(hours => GREATEST(1, _hours))
       AND (_severity IS NULL OR e.severity = _severity)
     ORDER BY e.ts DESC
     LIMIT 500;
END $$;

REVOKE ALL ON FUNCTION public.imperial_get_observability_stream(int,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.imperial_get_observability_stream(int,text) TO authenticated;
