
-- Heartbeat table
CREATE TABLE IF NOT EXISTS public.realtime_region_heartbeats (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID,
  region TEXT NOT NULL CHECK (region IN ('ap','us','eu')),
  partition TEXT NOT NULL CHECK (partition IN ('wallet','game','chat','market')),
  latency_ms INTEGER NOT NULL CHECK (latency_ms >= 0 AND latency_ms < 60000),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_rrh_recorded_at ON public.realtime_region_heartbeats(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_rrh_region_recorded ON public.realtime_region_heartbeats(region, recorded_at DESC);

ALTER TABLE public.realtime_region_heartbeats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rrh_admin_read"
  ON public.realtime_region_heartbeats FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "rrh_user_insert"
  ON public.realtime_region_heartbeats FOR INSERT
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- Client-callable: record a heartbeat sample (sanitized, fire-and-forget)
CREATE OR REPLACE FUNCTION public.record_realtime_heartbeat(
  _region TEXT,
  _partition TEXT,
  _latency_ms INTEGER
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _region NOT IN ('ap','us','eu') THEN RETURN; END IF;
  IF _partition NOT IN ('wallet','game','chat','market') THEN RETURN; END IF;
  IF _latency_ms IS NULL OR _latency_ms < 0 OR _latency_ms >= 60000 THEN RETURN; END IF;

  INSERT INTO public.realtime_region_heartbeats(user_id, region, partition, latency_ms)
  VALUES (auth.uid(), _region, _partition, _latency_ms);
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_realtime_heartbeat(TEXT, TEXT, INTEGER) TO authenticated, anon;

-- Admin: region health summary (last 5 minutes)
CREATE OR REPLACE FUNCTION public.admin_get_realtime_region_health()
RETURNS TABLE (
  region TEXT,
  active_users BIGINT,
  samples BIGINT,
  avg_latency_ms NUMERIC,
  p95_latency_ms NUMERIC,
  last_sample_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  RETURN QUERY
  WITH base AS (
    SELECT r.region, r.user_id, r.latency_ms, r.recorded_at
    FROM public.realtime_region_heartbeats r
    WHERE r.recorded_at > now() - interval '5 minutes'
  ),
  regions AS (
    SELECT unnest(ARRAY['ap','us','eu']) AS region
  )
  SELECT
    rg.region,
    COUNT(DISTINCT b.user_id)::BIGINT AS active_users,
    COUNT(b.*)::BIGINT AS samples,
    COALESCE(ROUND(AVG(b.latency_ms)::NUMERIC, 1), 0) AS avg_latency_ms,
    COALESCE(ROUND(
      percentile_cont(0.95) WITHIN GROUP (ORDER BY b.latency_ms)::NUMERIC, 1
    ), 0) AS p95_latency_ms,
    MAX(b.recorded_at) AS last_sample_at
  FROM regions rg
  LEFT JOIN base b ON b.region = rg.region
  GROUP BY rg.region
  ORDER BY rg.region;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_realtime_region_health() TO authenticated;

-- Admin: broadcast failover hint via platform_kill_switches
CREATE OR REPLACE FUNCTION public.admin_broadcast_region_failover(
  _target_region TEXT,
  _reason TEXT DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'admin only';
  END IF;
  IF _target_region NOT IN ('ap','us','eu','auto') THEN
    RAISE EXCEPTION 'invalid region: %', _target_region;
  END IF;

  INSERT INTO public.platform_kill_switches(key, enabled, value, updated_at, updated_by)
  VALUES (
    'realtime_region_pin',
    _target_region <> 'auto',
    jsonb_build_object('region', _target_region, 'reason', COALESCE(_reason,''), 'at', now()),
    now(),
    auth.uid()
  )
  ON CONFLICT (key) DO UPDATE
    SET enabled = EXCLUDED.enabled,
        value = EXCLUDED.value,
        updated_at = now(),
        updated_by = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_broadcast_region_failover(TEXT, TEXT) TO authenticated;

-- Auto-prune old heartbeats (30 days)
CREATE OR REPLACE FUNCTION public.prune_realtime_region_heartbeats()
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.realtime_region_heartbeats WHERE recorded_at < now() - interval '30 days';
$$;
