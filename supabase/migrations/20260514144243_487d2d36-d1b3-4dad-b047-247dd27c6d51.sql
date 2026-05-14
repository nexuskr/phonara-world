
-- 1) Risk engine event log (admin dashboard fuel)
CREATE TABLE IF NOT EXISTS public.risk_engine_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  symbol text NOT NULL,
  status text NOT NULL CHECK (status IN ('PASS','WARN','REJECT')),
  rpi numeric NOT NULL,
  safety_distance numeric NOT NULL,
  leverage int NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_risk_engine_events_created ON public.risk_engine_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_risk_engine_events_status ON public.risk_engine_events(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_risk_engine_events_symbol ON public.risk_engine_events(symbol, created_at DESC);

ALTER TABLE public.risk_engine_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "risk_engine_events_self_insert" ON public.risk_engine_events;
CREATE POLICY "risk_engine_events_self_insert" ON public.risk_engine_events
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "risk_engine_events_admin_select" ON public.risk_engine_events;
CREATE POLICY "risk_engine_events_admin_select" ON public.risk_engine_events
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 2) Pre-trade validate RPC: RAW DATA ONLY (no math here).
CREATE OR REPLACE FUNCTION public.live_pre_trade_validate(p_symbol text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_mark numeric := 0;
  v_age int := 0;
  v_balance numeric := 0;
  v_used numeric := 0;
  v_mmr numeric := 0.005;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated' USING ERRCODE='42501'; END IF;

  SELECT last_price, EXTRACT(EPOCH FROM (now()-updated_at))::int
    INTO v_mark, v_age
    FROM oracle_prices WHERE symbol = p_symbol;

  SELECT COALESCE(balance,0) INTO v_balance FROM phon_balances WHERE user_id = v_uid;
  SELECT COALESCE(SUM(margin),0) INTO v_used
    FROM live_positions WHERE user_id = v_uid AND status='open';

  RETURN jsonb_build_object(
    'mark_price', COALESCE(v_mark, 0),
    'oracle_age_s', COALESCE(v_age, 99999),
    'equity', GREATEST(v_balance - 0, 0),
    'used_margin', v_used,
    'mmr', v_mmr,
    'symbol', p_symbol,
    'ts', extract(epoch from now())
  );
END;
$$;

REVOKE ALL ON FUNCTION public.live_pre_trade_validate(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.live_pre_trade_validate(text) TO authenticated;

-- 3) Client logger
CREATE OR REPLACE FUNCTION public.risk_engine_log(
  p_symbol text,
  p_status text,
  p_rpi numeric,
  p_safety_distance numeric,
  p_leverage int,
  p_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  IF p_status NOT IN ('PASS','WARN','REJECT') THEN RETURN; END IF;
  INSERT INTO risk_engine_events(user_id, symbol, status, rpi, safety_distance, leverage, reason)
  VALUES (auth.uid(), p_symbol, p_status, p_rpi, p_safety_distance, p_leverage, p_reason);
END;
$$;

REVOKE ALL ON FUNCTION public.risk_engine_log(text,text,numeric,numeric,int,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.risk_engine_log(text,text,numeric,numeric,int,text) TO authenticated;

-- 4) Admin stats: 24h avg RPI, rejected count, symbol heatmap
CREATE OR REPLACE FUNCTION public.admin_get_risk_engine_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $$
DECLARE
  v_avg_rpi numeric := 0;
  v_rejected int := 0;
  v_warned int := 0;
  v_total int := 0;
  v_heat jsonb := '[]'::jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE='42501';
  END IF;

  SELECT
    COALESCE(AVG(rpi),0)::numeric(10,4),
    COALESCE(COUNT(*) FILTER (WHERE status='REJECT'),0)::int,
    COALESCE(COUNT(*) FILTER (WHERE status='WARN'),0)::int,
    COALESCE(COUNT(*),0)::int
  INTO v_avg_rpi, v_rejected, v_warned, v_total
  FROM risk_engine_events
  WHERE created_at > now() - interval '24 hours';

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'symbol', symbol,
    'avg_rpi', avg_rpi,
    'avg_safety', avg_safety,
    'rejects', rejects,
    'warns', warns
  ) ORDER BY avg_rpi DESC), '[]'::jsonb)
  INTO v_heat
  FROM (
    SELECT symbol,
      AVG(rpi)::numeric(10,4) AS avg_rpi,
      AVG(safety_distance)::numeric(10,4) AS avg_safety,
      COUNT(*) FILTER (WHERE status='REJECT')::int AS rejects,
      COUNT(*) FILTER (WHERE status='WARN')::int AS warns
    FROM risk_engine_events
    WHERE created_at > now() - interval '24 hours'
    GROUP BY symbol
    LIMIT 12
  ) s;

  RETURN jsonb_build_object(
    'avg_rpi', v_avg_rpi,
    'rejected_24h', v_rejected,
    'warned_24h', v_warned,
    'total_24h', v_total,
    'heatmap', v_heat
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_risk_engine_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_risk_engine_stats() TO authenticated;
