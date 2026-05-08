REVOKE ALL ON FUNCTION public.ingest_span_quality_alert(text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ingest_span_quality_alert(text, jsonb) TO authenticated;