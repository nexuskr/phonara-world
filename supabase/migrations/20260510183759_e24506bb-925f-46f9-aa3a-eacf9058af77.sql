CREATE INDEX IF NOT EXISTS idx_wr_completed_completed_at
  ON public.withdrawal_requests (completed_at DESC)
  WHERE status = 'completed' AND completed_at IS NOT NULL;

CREATE OR REPLACE FUNCTION public.public_withdrawal_sla()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH d7 AS (
    SELECT
      EXTRACT(EPOCH FROM (completed_at - created_at))/60.0 AS mins,
      amount
    FROM public.withdrawal_requests
    WHERE status = 'completed' AND completed_at IS NOT NULL
      AND created_at >= now() - interval '7 days'
  ),
  d30 AS (
    SELECT
      EXTRACT(EPOCH FROM (completed_at - created_at))/60.0 AS mins,
      amount
    FROM public.withdrawal_requests
    WHERE status = 'completed' AND completed_at IS NOT NULL
      AND created_at >= now() - interval '30 days'
  )
  SELECT jsonb_build_object(
    'count_7d', (SELECT count(*) FROM d7),
    'avg_minutes_7d', COALESCE((SELECT avg(mins) FROM d7), 0),
    'p95_minutes_7d', COALESCE((SELECT percentile_cont(0.95) WITHIN GROUP (ORDER BY mins) FROM d7), 0),
    'sla_30min_rate_7d', COALESCE((SELECT (count(*) FILTER (WHERE mins <= 30))::numeric * 100 / NULLIF(count(*),0) FROM d7), 0),
    'count_30d', (SELECT count(*) FROM d30),
    'paid_30d', COALESCE((SELECT sum(amount) FROM d30), 0),
    'avg_minutes_30d', COALESCE((SELECT avg(mins) FROM d30), 0),
    'p95_minutes_30d', COALESCE((SELECT percentile_cont(0.95) WITHIN GROUP (ORDER BY mins) FROM d30), 0),
    'sla_30min_rate_30d', COALESCE((SELECT (count(*) FILTER (WHERE mins <= 30))::numeric * 100 / NULLIF(count(*),0) FROM d30), 0),
    'generated_at', now()
  );
$$;

REVOKE ALL ON FUNCTION public.public_withdrawal_sla() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_withdrawal_sla() TO anon, authenticated;

INSERT INTO public.function_permissions_baseline (function_name, function_args, allowed_roles, category, note)
VALUES (
  'public_withdrawal_sla', '()',
  ARRAY['anon','authenticated']::text[],
  'public_metrics',
  'Public withdrawal SLA aggregate (7d/30d). Aggregate-only, no PII.'
)
ON CONFLICT (function_name, function_args) DO UPDATE
SET allowed_roles = EXCLUDED.allowed_roles,
    category = EXCLUDED.category,
    note = EXCLUDED.note,
    updated_at = now();