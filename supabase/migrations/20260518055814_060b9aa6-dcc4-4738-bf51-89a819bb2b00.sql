
-- Phase 5 Migration A: Expand function_permissions_baseline to reflect reality.
-- Money-flow 8 paths / imperial_* function bodies: 0-byte change.
-- Permission grants: 0-byte change. This migration is INSERT-only into a tracking table.

INSERT INTO public.function_permissions_baseline (function_name, function_args, allowed_roles, category, note)
SELECT
  g.fn,
  g.args,
  CASE
    WHEN g.anon_x AND g.auth_x THEN ARRAY['anon','authenticated']
    WHEN g.anon_x THEN ARRAY['anon']
    ELSE ARRAY['authenticated']
  END,
  CASE
    WHEN g.fn LIKE 'admin\_%' ESCAPE '\' THEN 'admin'
    ELSE 'user_callable'
  END,
  'phase5-A-2026-05-18'
FROM (
  SELECT
    p.proname AS fn,
    pg_get_function_identity_arguments(p.oid) AS args,
    has_function_privilege('authenticated', p.oid, 'EXECUTE') AS auth_x,
    has_function_privilege('anon',          p.oid, 'EXECUTE') AS anon_x
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.prosecdef = true
) g
WHERE (g.auth_x OR g.anon_x)
  -- Exclude Migration B targets (internal helpers / triggers / monitors)
  AND g.fn NOT LIKE '\_%' ESCAPE '\'
  AND g.fn NOT LIKE 'trg\_%' ESCAPE '\'
  AND g.fn NOT LIKE '%\_trigger' ESCAPE '\'
  AND g.fn NOT LIKE 'monitor\_%' ESCAPE '\'
ON CONFLICT (function_name, function_args) DO NOTHING;
