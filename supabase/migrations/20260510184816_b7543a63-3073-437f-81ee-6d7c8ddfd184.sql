CREATE OR REPLACE FUNCTION public.get_my_security_events(_limit int DEFAULT 50)
RETURNS TABLE (
  id uuid,
  rule text,
  severity text,
  evidence jsonb,
  created_at timestamptz,
  acknowledged boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, rule, severity, evidence, created_at, acknowledged
  FROM public.anomaly_events
  WHERE user_id = auth.uid()
    AND auth.uid() IS NOT NULL
  ORDER BY created_at DESC
  LIMIT LEAST(GREATEST(_limit, 1), 200);
$$;

REVOKE ALL ON FUNCTION public.get_my_security_events(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_security_events(int) TO authenticated;

INSERT INTO public.function_permissions_baseline (function_name, function_args, allowed_roles, category, note)
VALUES (
  'get_my_security_events', '(integer)',
  ARRAY['authenticated']::text[],
  'security',
  'Returns the calling user''s own anomaly_events only (auth.uid() guard, no other users'' data).'
)
ON CONFLICT (function_name, function_args) DO UPDATE
SET allowed_roles = EXCLUDED.allowed_roles,
    category = EXCLUDED.category,
    note = EXCLUDED.note,
    updated_at = now();