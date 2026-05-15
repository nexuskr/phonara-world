CREATE OR REPLACE FUNCTION public.admin_get_slot_anomaly_summary_24h()
RETURNS TABLE (kind text, game_code text, n bigint, last_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
  SELECT a.kind, COALESCE(a.game_code,'(none)') AS game_code, COUNT(*)::bigint AS n, MAX(a.created_at) AS last_at
  FROM public.slot_anomaly_log a
  WHERE a.created_at > now() - interval '24 hours'
  GROUP BY a.kind, COALESCE(a.game_code,'(none)')
  ORDER BY n DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_slot_anomalies(_kind text DEFAULT NULL, _limit int DEFAULT 100)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  game_code text,
  kind text,
  expected numeric,
  actual numeric,
  meta jsonb,
  created_at timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
  SELECT a.id, a.user_id, a.game_code, a.kind, a.expected, a.actual, a.meta, a.created_at
  FROM public.slot_anomaly_log a
  WHERE (_kind IS NULL OR a.kind = _kind)
  ORDER BY a.created_at DESC
  LIMIT GREATEST(1, LEAST(_limit, 500));
END;
$$;