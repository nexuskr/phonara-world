
CREATE OR REPLACE FUNCTION public.public_live_pulse()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  completed_24h int := 0;
  signups_24h int := 0;
  last_completed_at timestamptz;
  hourly jsonb := '[]'::jsonb;
BEGIN
  SELECT COUNT(*) INTO completed_24h
  FROM public.withdrawal_requests
  WHERE status = 'completed' AND completed_at > now() - interval '24 hours';

  SELECT MAX(completed_at) INTO last_completed_at
  FROM public.withdrawal_requests
  WHERE status = 'completed';

  SELECT COUNT(*) INTO signups_24h
  FROM public.profiles
  WHERE created_at > now() - interval '24 hours';

  SELECT COALESCE(jsonb_agg(jsonb_build_object('h', h, 'c', c) ORDER BY h), '[]'::jsonb) INTO hourly
  FROM (
    SELECT date_trunc('hour', completed_at) AS h, COUNT(*)::int AS c
    FROM public.withdrawal_requests
    WHERE status = 'completed' AND completed_at > now() - interval '24 hours'
    GROUP BY 1
  ) t;

  RETURN jsonb_build_object(
    'completed_24h', completed_24h,
    'signups_24h', signups_24h,
    'last_completed_at', last_completed_at,
    'hourly', hourly,
    'generated_at', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.public_live_pulse() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_live_pulse() TO anon, authenticated;

INSERT INTO public.function_permissions_baseline (function_name, function_args, allowed_roles, category, note)
VALUES ('public_live_pulse', '', ARRAY['anon','authenticated'], 'public_metrics', 'Public landing pulse: anonymized 24h aggregates')
ON CONFLICT (function_name, function_args) DO UPDATE
SET allowed_roles = EXCLUDED.allowed_roles, category = EXCLUDED.category, note = EXCLUDED.note, updated_at = now();
