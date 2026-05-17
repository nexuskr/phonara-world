CREATE OR REPLACE FUNCTION public.get_hot_symbols_24h(_limit int DEFAULT 5)
RETURNS TABLE (sym text, open_positions int, traders_24h int, score numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH opens AS (
    SELECT symbol AS s, count(*)::int AS op
    FROM live_positions
    WHERE status = 'open'
    GROUP BY symbol
  ),
  recent AS (
    SELECT symbol AS s, count(DISTINCT user_id)::int AS t24
    FROM live_positions
    WHERE opened_at >= now() - interval '24 hours'
    GROUP BY symbol
  )
  SELECT
    COALESCE(o.s, r.s) AS sym,
    COALESCE(o.op, 0) AS open_positions,
    COALESCE(r.t24, 0) AS traders_24h,
    (COALESCE(o.op, 0)::numeric * 2 + COALESCE(r.t24, 0)::numeric) AS score
  FROM opens o
  FULL OUTER JOIN recent r ON o.s = r.s
  WHERE COALESCE(o.s, r.s) ~ '^[A-Z]{2,10}USDT$'
  ORDER BY score DESC NULLS LAST
  LIMIT GREATEST(1, LEAST(_limit, 20));
$$;

GRANT EXECUTE ON FUNCTION public.get_hot_symbols_24h(int) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_symbol_side_counts(_symbol text)
RETURNS TABLE (longs int, shorts int)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(sum(CASE WHEN side = 'long'  THEN 1 ELSE 0 END), 0)::int,
    COALESCE(sum(CASE WHEN side = 'short' THEN 1 ELSE 0 END), 0)::int
  FROM live_positions
  WHERE status = 'open'
    AND symbol = _symbol
    AND _symbol ~ '^[A-Z]{2,10}USDT$';
$$;

GRANT EXECUTE ON FUNCTION public.get_symbol_side_counts(text) TO anon, authenticated;