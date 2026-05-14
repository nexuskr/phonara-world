
-- 1) Add event_type column for strict REAL vs SIM separation
ALTER TABLE public.risk_engine_events
  ADD COLUMN IF NOT EXISTS event_type text NOT NULL DEFAULT 'REAL';

ALTER TABLE public.risk_engine_events
  DROP CONSTRAINT IF EXISTS risk_engine_events_event_type_check;
ALTER TABLE public.risk_engine_events
  ADD CONSTRAINT risk_engine_events_event_type_check
  CHECK (event_type IN ('REAL','SIM_oracle_spike','SIM_equity_volatility','SIM_liquidation_pressure','SIM_full_flow'));

CREATE INDEX IF NOT EXISTS idx_risk_engine_events_event_type
  ON public.risk_engine_events(event_type, created_at DESC);

-- 2) New SIM-only logger (does NOT modify existing risk_engine_log signature)
CREATE OR REPLACE FUNCTION public.risk_engine_log_sim(
  p_symbol text,
  p_status text,
  p_rpi numeric,
  p_safety_distance numeric,
  p_leverage integer,
  p_event_type text,
  p_reason text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'auth required';
  END IF;
  IF p_event_type NOT IN ('SIM_oracle_spike','SIM_equity_volatility','SIM_liquidation_pressure','SIM_full_flow') THEN
    RAISE EXCEPTION 'invalid event_type for sim log';
  END IF;
  IF p_status NOT IN ('PASS','WARN','REJECT') THEN
    RAISE EXCEPTION 'invalid status';
  END IF;
  INSERT INTO public.risk_engine_events(
    user_id, symbol, status, rpi, safety_distance, leverage, reason, event_type
  ) VALUES (
    auth.uid(), p_symbol, p_status, p_rpi, p_safety_distance, p_leverage, p_reason, p_event_type
  );
END;
$$;

REVOKE ALL ON FUNCTION public.risk_engine_log_sim(text,text,numeric,numeric,integer,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.risk_engine_log_sim(text,text,numeric,numeric,integer,text,text) TO authenticated;

-- 3) Admin aggregator (last 1h) for stress test dashboard
CREATE OR REPLACE FUNCTION public.admin_get_stress_test_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  WITH win AS (
    SELECT * FROM public.risk_engine_events
    WHERE created_at > now() - interval '1 hour'
      AND event_type LIKE 'SIM_%'
  ),
  by_type AS (
    SELECT
      event_type,
      count(*)::int AS total,
      count(*) FILTER (WHERE status='REJECT')::int AS rejects,
      count(*) FILTER (WHERE status='WARN')::int AS warns,
      count(*) FILTER (WHERE status='PASS')::int AS passes,
      coalesce(avg(rpi),0)::numeric AS avg_rpi,
      coalesce(avg(safety_distance),0)::numeric AS avg_safety
    FROM win
    GROUP BY event_type
  ),
  heat AS (
    SELECT symbol,
           coalesce(avg(rpi),0)::numeric AS avg_rpi,
           count(*) FILTER (WHERE status='REJECT')::int AS rejects
    FROM win
    GROUP BY symbol
    ORDER BY avg_rpi DESC
    LIMIT 8
  )
  SELECT jsonb_build_object(
    'window', '1h',
    'total', (SELECT count(*) FROM win),
    'by_type', coalesce((SELECT jsonb_agg(to_jsonb(by_type)) FROM by_type), '[]'::jsonb),
    'heatmap', coalesce((SELECT jsonb_agg(to_jsonb(heat)) FROM heat), '[]'::jsonb),
    'near_miss_count', (SELECT count(*) FROM win WHERE rpi >= 0.94 AND rpi < 0.96)::int
  ) INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_stress_test_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_stress_test_stats() TO authenticated;
