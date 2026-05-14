
ALTER TABLE public.error_logs
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz,
  ADD COLUMN IF NOT EXISTS resolved_by uuid,
  ADD COLUMN IF NOT EXISTS resolution_note text;

CREATE INDEX IF NOT EXISTS idx_error_logs_unresolved
  ON public.error_logs (created_at DESC)
  WHERE resolved_at IS NULL;

CREATE OR REPLACE FUNCTION public.admin_resolve_errors(
  _ids uuid[],
  _note text DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_count integer;
BEGIN
  IF v_uid IS NULL OR NOT public.has_role(v_uid, 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  UPDATE public.error_logs
     SET resolved_at = now(),
         resolved_by = v_uid,
         resolution_note = COALESCE(_note, resolution_note)
   WHERE id = ANY(_ids)
     AND resolved_at IS NULL;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_resolve_errors(uuid[], text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_resolve_errors(uuid[], text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_get_recent_errors(
  _limit integer DEFAULT 100,
  _only_unresolved boolean DEFAULT true
)
RETURNS TABLE (
  id uuid, user_id uuid, level text, message text,
  stack text, url text, user_agent text, context jsonb,
  created_at timestamptz, resolved_at timestamptz, resolved_by uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT e.id, e.user_id, e.level, e.message, e.stack, e.url,
         e.user_agent, e.context, e.created_at, e.resolved_at, e.resolved_by
    FROM public.error_logs e
   WHERE (NOT _only_unresolved) OR e.resolved_at IS NULL
   ORDER BY e.created_at DESC
   LIMIT GREATEST(1, LEAST(_limit, 500));
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_recent_errors(integer, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_recent_errors(integer, boolean) TO authenticated;
