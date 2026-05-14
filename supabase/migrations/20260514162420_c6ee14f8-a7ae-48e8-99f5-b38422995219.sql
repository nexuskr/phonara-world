
-- ============================================================
-- PHASE 3: ORACLE FORTRESS — Multi-source consensus
-- ============================================================

-- 1) Raw per-source price table
CREATE TABLE IF NOT EXISTS public.oracle_prices_raw (
  symbol text NOT NULL,
  source text NOT NULL CHECK (source IN ('bybit','binance','coinbase')),
  last_price numeric NOT NULL CHECK (last_price > 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (symbol, source)
);

CREATE INDEX IF NOT EXISTS idx_opr_symbol_updated
  ON public.oracle_prices_raw (symbol, updated_at DESC);

ALTER TABLE public.oracle_prices_raw ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS opr_public_read ON public.oracle_prices_raw;
CREATE POLICY opr_public_read ON public.oracle_prices_raw
  FOR SELECT TO authenticated USING (true);
-- writes go through SECURITY DEFINER edge functions only

-- 2) Add consensus metadata to canonical oracle_prices
ALTER TABLE public.oracle_prices
  ADD COLUMN IF NOT EXISTS quorum_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS divergence_bps int,
  ADD COLUMN IF NOT EXISTS participating_sources text[] DEFAULT '{}';

-- 3) compute_oracle_consensus — median + outlier removal
CREATE OR REPLACE FUNCTION public.compute_oracle_consensus(_symbol text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_freshness_s int := 5;          -- only sources fresher than this count
  v_outlier_bps int := 30;         -- ±0.3% from median = outlier
  v_rows record;
  v_prices numeric[];
  v_sources text[];
  v_median numeric;
  v_kept_prices numeric[] := '{}';
  v_kept_sources text[] := '{}';
  v_max_div_bps int := 0;
  v_div_bps int;
  v_consensus numeric;
  v_quorum int;
BEGIN
  -- Collect fresh raw rows
  SELECT array_agg(last_price ORDER BY source),
         array_agg(source ORDER BY source)
    INTO v_prices, v_sources
    FROM public.oracle_prices_raw
   WHERE symbol = _symbol
     AND updated_at > now() - make_interval(secs => v_freshness_s);

  IF v_prices IS NULL OR array_length(v_prices, 1) IS NULL THEN
    RETURN jsonb_build_object(
      'symbol', _symbol, 'quorum', 0, 'reason', 'no_fresh_sources'
    );
  END IF;

  -- Median across fresh sources
  SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY p)
    INTO v_median
    FROM unnest(v_prices) AS p;

  -- Filter outliers
  FOR i IN 1 .. array_length(v_prices, 1) LOOP
    v_div_bps := abs(round(((v_prices[i] - v_median) / v_median) * 10000))::int;
    IF v_div_bps <= v_outlier_bps THEN
      v_kept_prices := array_append(v_kept_prices, v_prices[i]);
      v_kept_sources := array_append(v_kept_sources, v_sources[i]);
      IF v_div_bps > v_max_div_bps THEN v_max_div_bps := v_div_bps; END IF;
    END IF;
  END LOOP;

  v_quorum := COALESCE(array_length(v_kept_prices, 1), 0);

  IF v_quorum = 0 THEN
    RETURN jsonb_build_object(
      'symbol', _symbol, 'quorum', 0, 'reason', 'all_outliers',
      'median', v_median
    );
  END IF;

  -- Final consensus = median of kept
  SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY p)
    INTO v_consensus
    FROM unnest(v_kept_prices) AS p;

  -- Upsert into canonical oracle_prices
  INSERT INTO public.oracle_prices (
    symbol, last_price, source, updated_at,
    quorum_count, divergence_bps, participating_sources
  )
  VALUES (
    _symbol, v_consensus, 'consensus', now(),
    v_quorum, v_max_div_bps, v_kept_sources
  )
  ON CONFLICT (symbol) DO UPDATE
     SET last_price = EXCLUDED.last_price,
         source = EXCLUDED.source,
         updated_at = EXCLUDED.updated_at,
         quorum_count = EXCLUDED.quorum_count,
         divergence_bps = EXCLUDED.divergence_bps,
         participating_sources = EXCLUDED.participating_sources;

  RETURN jsonb_build_object(
    'symbol', _symbol,
    'consensus', v_consensus,
    'quorum', v_quorum,
    'sources', v_kept_sources,
    'divergence_bps', v_max_div_bps
  );
END;
$$;

REVOKE ALL ON FUNCTION public.compute_oracle_consensus(text) FROM public, anon, authenticated;

-- 4) Trigger: recompute consensus on every raw price change
CREATE OR REPLACE FUNCTION public.trg_recompute_consensus()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.compute_oracle_consensus(NEW.symbol);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_opr_consensus ON public.oracle_prices_raw;
CREATE TRIGGER trg_opr_consensus
  AFTER INSERT OR UPDATE ON public.oracle_prices_raw
  FOR EACH ROW EXECUTE FUNCTION public.trg_recompute_consensus();

-- 5) Admin: oracle health snapshot
CREATE OR REPLACE FUNCTION public.admin_get_oracle_health()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_matrix jsonb;
  v_summary jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'admin_only';
  END IF;

  SELECT jsonb_agg(
           jsonb_build_object(
             'symbol', op.symbol,
             'consensus', op.last_price,
             'quorum', op.quorum_count,
             'divergence_bps', op.divergence_bps,
             'sources', op.participating_sources,
             'consensus_age_s', extract(epoch FROM (now() - op.updated_at))::int,
             'raw', (
               SELECT jsonb_agg(jsonb_build_object(
                 'source', r.source,
                 'price', r.last_price,
                 'age_s', extract(epoch FROM (now() - r.updated_at))::int
               ) ORDER BY r.source)
               FROM public.oracle_prices_raw r
               WHERE r.symbol = op.symbol
             )
           )
           ORDER BY op.symbol
         )
    INTO v_matrix
    FROM public.oracle_prices op;

  SELECT jsonb_build_object(
           'healthy', count(*) FILTER (WHERE quorum_count >= 2),
           'degraded', count(*) FILTER (WHERE quorum_count = 1),
           'down', count(*) FILTER (WHERE quorum_count = 0),
           'total', count(*)
         )
    INTO v_summary
    FROM public.oracle_prices;

  RETURN jsonb_build_object('summary', v_summary, 'matrix', COALESCE(v_matrix, '[]'::jsonb));
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_oracle_health() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_oracle_health() TO authenticated;

-- 6) Chaos RPCs
CREATE OR REPLACE FUNCTION public.admin_oracle_chaos_stale_source(_source text, _minutes int DEFAULT 1)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_n int;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'admin_only';
  END IF;
  UPDATE public.oracle_prices_raw
     SET updated_at = now() - make_interval(mins => _minutes)
   WHERE source = _source;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_oracle_chaos_stale_source(text,int) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_oracle_chaos_stale_source(text,int) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_oracle_chaos_clear()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_n int;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'admin_only';
  END IF;
  -- Mark all raw rows as freshly observed (price unchanged), so consensus recomputes.
  UPDATE public.oracle_prices_raw
     SET updated_at = now()
   WHERE updated_at < now() - interval '20 seconds';
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_oracle_chaos_clear() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_oracle_chaos_clear() TO authenticated;

-- 7) Cron: recompute consensus every 5s for known symbols (safety net)
DO $$
BEGIN
  PERFORM cron.unschedule('oracle-consensus-tick');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'oracle-consensus-tick',
  '*/5 * * * * *',
  $$
  SELECT public.compute_oracle_consensus(symbol)
    FROM public.oracle_prices;
  $$
);
