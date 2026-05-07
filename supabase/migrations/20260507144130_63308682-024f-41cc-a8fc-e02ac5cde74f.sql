
CREATE OR REPLACE FUNCTION public.get_admin_metrics(_days INT DEFAULT 30)
RETURNS TABLE(
  day DATE,
  new_users BIGINT,
  deposits_total BIGINT,
  withdrawals_total BIGINT,
  missions_count BIGINT,
  missions_reward BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _n INT := GREATEST(1, LEAST(_days, 365));
BEGIN
  IF NOT public.has_role(_uid,'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;

  RETURN QUERY
  WITH days AS (
    SELECT generate_series(
      (CURRENT_DATE - (_n - 1))::date,
      CURRENT_DATE::date,
      interval '1 day'
    )::date AS day
  ),
  u AS (
    SELECT created_at::date AS d, COUNT(*)::bigint AS c
    FROM public.profiles
    WHERE created_at >= CURRENT_DATE - (_n - 1)
    GROUP BY 1
  ),
  d AS (
    SELECT approved_at::date AS d, COALESCE(SUM(amount),0)::bigint AS s
    FROM public.deposit_requests
    WHERE status='approved' AND approved_at >= CURRENT_DATE - (_n - 1)
    GROUP BY 1
  ),
  w AS (
    SELECT completed_at::date AS d, COALESCE(SUM(amount),0)::bigint AS s
    FROM public.withdrawal_requests
    WHERE status='completed' AND completed_at >= CURRENT_DATE - (_n - 1)
    GROUP BY 1
  ),
  m AS (
    SELECT created_at::date AS d, COUNT(*)::bigint AS c, COALESCE(SUM(final_reward),0)::bigint AS s
    FROM public.mission_history
    WHERE is_win=true AND created_at >= CURRENT_DATE - (_n - 1)
    GROUP BY 1
  )
  SELECT
    days.day,
    COALESCE(u.c, 0),
    COALESCE(d.s, 0),
    COALESCE(w.s, 0),
    COALESCE(m.c, 0),
    COALESCE(m.s, 0)
  FROM days
  LEFT JOIN u ON u.d = days.day
  LEFT JOIN d ON d.d = days.day
  LEFT JOIN w ON w.d = days.day
  LEFT JOIN m ON m.d = days.day
  ORDER BY days.day;
END $$;

REVOKE EXECUTE ON FUNCTION public.get_admin_metrics(INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_metrics(INT) TO authenticated;
