
-- Idempotency keys (generic, for future mutation RPCs)
CREATE TABLE IF NOT EXISTS public.idempotency_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  scope TEXT NOT NULL,
  key TEXT NOT NULL,
  response JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (scope, key)
);

ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY ik_admin_read ON public.idempotency_keys
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_idem_user ON public.idempotency_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_idem_created ON public.idempotency_keys(created_at DESC);

-- Recover stuck settlements (>6h overdue)
CREATE OR REPLACE FUNCTION public.recover_stuck_settlements()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _stuck INT := 0;
  _recovered INT := 0;
  _err TEXT;
  _start TIMESTAMPTZ := clock_timestamp();
BEGIN
  -- Auth: service_role OR admin
  IF NOT (auth.role() = 'service_role' OR public.has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT COUNT(*) INTO _stuck
  FROM public.package_purchases
  WHERE status = 'active' AND next_settle_at IS NOT NULL AND next_settle_at < now() - interval '6 hours';

  IF _stuck > 0 THEN
    BEGIN
      PERFORM public._cron_settle_package_daily();
      _recovered := _stuck;
    EXCEPTION WHEN OTHERS THEN
      _err := SQLERRM;
    END;
  END IF;

  INSERT INTO public.cron_settle_audit_log(ok, settled_count, duration_ms, caller, error, metadata)
  VALUES (
    _err IS NULL,
    _recovered,
    EXTRACT(MILLISECOND FROM (clock_timestamp() - _start))::INT,
    'recover_stuck_settlements',
    _err,
    jsonb_build_object('stuck_found', _stuck)
  );

  RETURN jsonb_build_object('ok', _err IS NULL, 'stuck', _stuck, 'recovered', _recovered, 'error', _err);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.recover_stuck_settlements() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.recover_stuck_settlements() TO authenticated, service_role;

-- SLO aggregator (admin only)
CREATE OR REPLACE FUNCTION public.settlement_slo()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _total INT;
  _ok INT;
  _p95 INT;
  _last TIMESTAMPTZ;
  _last_ok TIMESTAMPTZ;
  _stuck INT;
  _consec_fail INT;
  _next_due TIMESTAMPTZ;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE ok),
    COALESCE(percentile_disc(0.95) WITHIN GROUP (ORDER BY duration_ms), 0)::INT,
    MAX(created_at),
    MAX(created_at) FILTER (WHERE ok)
  INTO _total, _ok, _p95, _last, _last_ok
  FROM public.cron_settle_audit_log
  WHERE created_at > now() - interval '7 days';

  SELECT COUNT(*) INTO _stuck
  FROM public.package_purchases
  WHERE status='active' AND next_settle_at IS NOT NULL AND next_settle_at < now() - interval '6 hours';

  -- consecutive failures from most recent
  SELECT COUNT(*) INTO _consec_fail FROM (
    SELECT ok FROM public.cron_settle_audit_log ORDER BY created_at DESC LIMIT 20
  ) t WHERE NOT ok AND NOT EXISTS (
    SELECT 1 FROM public.cron_settle_audit_log
    WHERE ok AND created_at > (SELECT MAX(created_at) FROM public.cron_settle_audit_log WHERE NOT ok)
  );

  SELECT MIN(next_settle_at) INTO _next_due
  FROM public.package_purchases WHERE status='active' AND next_settle_at IS NOT NULL;

  RETURN jsonb_build_object(
    'window_days', 7,
    'total_runs', _total,
    'success_runs', _ok,
    'success_rate', CASE WHEN _total > 0 THEN ROUND((_ok::numeric / _total) * 100, 2) ELSE NULL END,
    'p95_duration_ms', _p95,
    'last_run_at', _last,
    'last_ok_at', _last_ok,
    'stuck_count', _stuck,
    'consecutive_failures', _consec_fail,
    'next_due_at', _next_due,
    'health',
      CASE
        WHEN _stuck > 0 OR _consec_fail >= 3 THEN 'critical'
        WHEN _consec_fail >= 1 OR (_last IS NOT NULL AND _last < now() - interval '26 hours') THEN 'degraded'
        ELSE 'ok'
      END
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.settlement_slo() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.settlement_slo() TO authenticated;
