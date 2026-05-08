CREATE OR REPLACE FUNCTION public.ingest_span_quality_alert(_reason text, _metrics jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_key text := 'span_quality:' || coalesce(_reason, 'unknown') || ':' || to_char(date_trunc('minute', now()) - (extract(minute from now())::int % 5) * interval '1 minute', 'YYYY-MM-DD HH24:MI');
  v_id uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM public.anomaly_events WHERE dedupe_key = v_key) THEN
    RETURN NULL;
  END IF;
  INSERT INTO public.anomaly_events (dedupe_key, severity, rule, user_id, evidence)
  VALUES (
    v_key,
    CASE WHEN coalesce((_metrics->>'loss_rate')::numeric, 0) >= 0.4 THEN 'high' ELSE 'medium' END,
    'span_quality',
    v_uid,
    jsonb_build_object('reason', _reason, 'metrics', _metrics, 'reported_at', now())
  )
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.ingest_span_quality_alert(text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ingest_span_quality_alert(text, jsonb) TO authenticated;