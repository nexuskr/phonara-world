
CREATE OR REPLACE FUNCTION public.admin_resolve_anomaly_rule(_rule text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  acked_count int := 0;
  rebaselined int := 0;
  ids uuid[];
  r record;
  observed text[];
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF _rule IS NULL OR length(_rule) = 0 THEN
    RAISE EXCEPTION 'rule_required';
  END IF;

  -- Rule-specific automated remediation
  IF _rule = 'permission_drift' THEN
    -- For each baseline entry, recompute observed roles and update baseline to match.
    FOR r IN SELECT * FROM public.function_permissions_baseline LOOP
      SELECT COALESCE(array_agg(DISTINCT grantee::text ORDER BY grantee::text), '{}'::text[])
        INTO observed
      FROM information_schema.routine_privileges
      WHERE routine_schema='public' AND routine_name=r.function_name
        AND privilege_type='EXECUTE'
        AND grantee::text IN ('anon','authenticated','PUBLIC');

      IF NOT (observed <@ r.allowed_roles AND r.allowed_roles <@ observed) THEN
        UPDATE public.function_permissions_baseline
           SET allowed_roles = observed,
               updated_at = now(),
               note = COALESCE(note,'') || ' [auto-rebaselined ' || to_char(now(),'YYYY-MM-DD HH24:MI') || ']'
         WHERE id = r.id;
        rebaselined := rebaselined + 1;
      END IF;
    END LOOP;
  END IF;

  -- Ack all unacknowledged events for this rule
  WITH upd AS (
    UPDATE public.anomaly_events
       SET acknowledged = true,
           acknowledged_at = now(),
           acknowledged_by = auth.uid(),
           ack_note = COALESCE(ack_note,'') || ' [auto-resolved]'
     WHERE rule = _rule AND acknowledged = false
     RETURNING id
  )
  SELECT count(*), array_agg(id) INTO acked_count, ids FROM upd;

  RETURN jsonb_build_object(
    'ok', true,
    'rule', _rule,
    'acked', COALESCE(acked_count,0),
    'rebaselined', rebaselined,
    'resolved_at', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_resolve_anomaly_rule(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_resolve_anomaly_rule(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_resolve_all_anomalies()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec record;
  results jsonb := '[]'::jsonb;
  total int := 0;
  per jsonb;
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  FOR rec IN
    SELECT DISTINCT rule
      FROM public.anomaly_events
     WHERE acknowledged = false
  LOOP
    per := public.admin_resolve_anomaly_rule(rec.rule);
    results := results || per;
    total := total + COALESCE((per->>'acked')::int, 0);
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'total_acked', total,
    'rules', results,
    'resolved_at', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_resolve_all_anomalies() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_resolve_all_anomalies() TO authenticated;
