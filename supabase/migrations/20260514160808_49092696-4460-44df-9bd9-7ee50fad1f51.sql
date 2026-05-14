
-- ═══════════════════════════════════════════════════════════════
-- Phase 2 — Kernel Observability (admin RPCs + reclaim cron)
-- ═══════════════════════════════════════════════════════════════

-- 1. Reclaim: actively mark expired reserved as failed/released
CREATE OR REPLACE FUNCTION public.reclaim_stale_intents()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int := 0;
  r record;
BEGIN
  FOR r IN
    SELECT client_request_id, user_id, lease_owner, lease_until, created_at
    FROM public.live_position_idempotency
    WHERE status = 'reserved'
      AND lease_until < now() - interval '120 seconds'
    ORDER BY lease_until ASC
    LIMIT 500
    FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE public.live_position_idempotency
       SET status = 'failed',
           result = COALESCE(result, '{}'::jsonb) ||
                    jsonb_build_object(
                      'reclaimed', true,
                      'reclaim_reason', 'lease_expired',
                      'reclaimed_at', now()
                    )
     WHERE client_request_id = r.client_request_id
       AND status = 'reserved';

    INSERT INTO public.live_position_open_audit
      (user_id, client_request_id, lease_owner, outcome, error_code, request_meta)
    VALUES (
      r.user_id, r.client_request_id, r.lease_owner,
      'failed', 'reclaimed_lease_expired',
      jsonb_build_object(
        'lease_until',     r.lease_until,
        'reserved_at',     r.created_at,
        'stuck_seconds',   EXTRACT(EPOCH FROM (now() - r.lease_until))::int
      )
    );

    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END $$;

REVOKE ALL ON FUNCTION public.reclaim_stale_intents() FROM PUBLIC;

-- 2. Admin RPC: in-flight intents (reserved)
CREATE OR REPLACE FUNCTION public.admin_get_kernel_inflight(_limit int DEFAULT 100)
RETURNS TABLE (
  client_request_id uuid,
  user_id uuid,
  lease_owner uuid,
  lease_until timestamptz,
  created_at timestamptz,
  seconds_to_expire int,
  is_expired boolean,
  params_hash text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT
    lpi.client_request_id,
    lpi.user_id,
    lpi.lease_owner,
    lpi.lease_until,
    lpi.created_at,
    EXTRACT(EPOCH FROM (lpi.lease_until - now()))::int AS seconds_to_expire,
    (lpi.lease_until < now())                          AS is_expired,
    lpi.params_hash
  FROM public.live_position_idempotency lpi
  WHERE lpi.status = 'reserved'
  ORDER BY lpi.lease_until ASC
  LIMIT GREATEST(1, LEAST(_limit, 500));
END $$;

REVOKE ALL ON FUNCTION public.admin_get_kernel_inflight(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_kernel_inflight(int) TO authenticated;

-- 3. Admin RPC: audit search
CREATE OR REPLACE FUNCTION public.admin_search_kernel_audit(
  _outcome    text  DEFAULT NULL,
  _error_code text  DEFAULT NULL,
  _user_id    uuid  DEFAULT NULL,
  _crid       uuid  DEFAULT NULL,
  _since      timestamptz DEFAULT (now() - interval '24 hours'),
  _limit      int   DEFAULT 100,
  _offset     int   DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  client_request_id uuid,
  outcome text,
  error_code text,
  oracle_snapshot jsonb,
  position_id uuid,
  entry_price numeric,
  request_meta jsonb,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT a.id, a.user_id, a.client_request_id, a.outcome, a.error_code,
         a.oracle_snapshot, a.position_id, a.entry_price, a.request_meta, a.created_at
  FROM public.live_position_open_audit a
  WHERE a.created_at >= _since
    AND (_outcome    IS NULL OR a.outcome = _outcome)
    AND (_error_code IS NULL OR a.error_code ILIKE '%'||_error_code||'%')
    AND (_user_id    IS NULL OR a.user_id = _user_id)
    AND (_crid       IS NULL OR a.client_request_id = _crid)
  ORDER BY a.created_at DESC
  LIMIT GREATEST(1, LEAST(_limit, 500))
  OFFSET GREATEST(0, _offset);
END $$;

REVOKE ALL ON FUNCTION public.admin_search_kernel_audit(text, text, uuid, uuid, timestamptz, int, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_search_kernel_audit(text, text, uuid, uuid, timestamptz, int, int) TO authenticated;

-- 4. Admin RPC: drift counters by error_code (24h, hourly)
CREATE OR REPLACE FUNCTION public.admin_get_kernel_drift_24h()
RETURNS TABLE (
  bucket_hour timestamptz,
  error_code text,
  cnt bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT date_trunc('hour', a.created_at) AS bucket_hour,
         COALESCE(a.error_code, 'unknown') AS error_code,
         COUNT(*)::bigint AS cnt
  FROM public.live_position_open_audit a
  WHERE a.created_at >= now() - interval '24 hours'
    AND a.outcome = 'failed'
  GROUP BY 1, 2
  ORDER BY 1 DESC, 3 DESC;
END $$;

REVOKE ALL ON FUNCTION public.admin_get_kernel_drift_24h() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_kernel_drift_24h() TO authenticated;

-- 5. Admin RPC: kernel summary (one-shot KPIs)
CREATE OR REPLACE FUNCTION public.admin_get_kernel_summary()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT jsonb_build_object(
    'inflight_total',
      (SELECT COUNT(*) FROM public.live_position_idempotency WHERE status='reserved'),
    'inflight_expired',
      (SELECT COUNT(*) FROM public.live_position_idempotency
        WHERE status='reserved' AND lease_until < now()),
    'success_24h',
      (SELECT COUNT(*) FROM public.live_position_open_audit
        WHERE outcome='success' AND created_at >= now() - interval '24 hours'),
    'failed_24h',
      (SELECT COUNT(*) FROM public.live_position_open_audit
        WHERE outcome='failed' AND created_at >= now() - interval '24 hours'),
    'failure_rate_24h',
      (SELECT CASE WHEN COUNT(*)=0 THEN 0
              ELSE ROUND( (COUNT(*) FILTER (WHERE outcome='failed'))::numeric
                          / COUNT(*)::numeric, 4)
              END
       FROM public.live_position_open_audit
       WHERE created_at >= now() - interval '24 hours'),
    'top_errors_24h',
      (SELECT COALESCE(jsonb_agg(jsonb_build_object('code', error_code, 'cnt', cnt)
                                  ORDER BY cnt DESC), '[]'::jsonb)
         FROM (
           SELECT COALESCE(error_code,'unknown') AS error_code, COUNT(*) AS cnt
           FROM public.live_position_open_audit
           WHERE outcome='failed' AND created_at >= now() - interval '24 hours'
           GROUP BY 1
           ORDER BY 2 DESC
           LIMIT 5
         ) s),
    'reclaimed_24h',
      (SELECT COUNT(*) FROM public.live_position_open_audit
        WHERE error_code='reclaimed_lease_expired'
          AND created_at >= now() - interval '24 hours'),
    'generated_at', now()
  ) INTO v;

  RETURN v;
END $$;

REVOKE ALL ON FUNCTION public.admin_get_kernel_summary() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_kernel_summary() TO authenticated;

-- 6. Cron: reclaim every minute
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('reclaim-stale-intents')
      WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname='reclaim-stale-intents');

    PERFORM cron.schedule(
      'reclaim-stale-intents',
      '* * * * *',
      $cron$ SELECT public.reclaim_stale_intents(); $cron$
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron schedule skipped: %', SQLERRM;
END $$;

COMMENT ON FUNCTION public.reclaim_stale_intents() IS
  'Phase 2 — actively marks reserved intents with lease expired >120s as failed and writes audit row.';
COMMENT ON FUNCTION public.admin_get_kernel_summary() IS
  'Phase 2 — single-call KPI snapshot for /admin Kernel tab.';
