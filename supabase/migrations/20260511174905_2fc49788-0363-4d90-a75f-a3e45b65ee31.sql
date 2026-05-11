
CREATE OR REPLACE FUNCTION public.recompute_daily_whale_leaderboard()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _today date := (now() AT TIME ZONE 'Asia/Seoul')::date;
  _start timestamptz := (_today::timestamp AT TIME ZONE 'Asia/Seoul');
  _end   timestamptz := ((_today + 1)::timestamp AT TIME ZONE 'Asia/Seoul');
BEGIN
  WITH agg AS (
    SELECT pp.user_id,
           SUM(pp.amount_krw)::bigint AS deposit_total_krw
      FROM public.package_purchases pp
     WHERE pp.status = 'confirmed'
       AND pp.created_at >= _start
       AND pp.created_at <  _end
     GROUP BY pp.user_id
  ),
  ranked AS (
    SELECT a.user_id,
           a.deposit_total_krw,
           ROW_NUMBER() OVER (ORDER BY a.deposit_total_krw DESC) AS rnk
      FROM agg a
     ORDER BY a.deposit_total_krw DESC
     LIMIT 100
  )
  INSERT INTO public.daily_whale_leaderboard (date, user_id, deposit_total_krw, is_total, rank, nickname_masked, updated_at)
  SELECT _today,
         r.user_id,
         r.deposit_total_krw,
         COALESCE(s.total_is, 0),
         r.rnk::int,
         COALESCE(LEFT(p.nickname, 2), '익명') || '***',
         now()
    FROM ranked r
    LEFT JOIN public.profiles p ON p.user_id = r.user_id
    LEFT JOIN public.imperial_scores s ON s.user_id = r.user_id
   ON CONFLICT (date, user_id) DO UPDATE
     SET deposit_total_krw = EXCLUDED.deposit_total_krw,
         is_total         = EXCLUDED.is_total,
         rank             = EXCLUDED.rank,
         nickname_masked  = EXCLUDED.nickname_masked,
         updated_at       = now();

  -- 떨어진 사용자(Top 100 밖)는 rank=NULL 처리
  UPDATE public.daily_whale_leaderboard
     SET rank = NULL, updated_at = now()
   WHERE date = _today
     AND user_id NOT IN (SELECT user_id FROM public.daily_whale_leaderboard WHERE date = _today ORDER BY deposit_total_krw DESC LIMIT 100);
END;
$$;

REVOKE ALL ON FUNCTION public.recompute_daily_whale_leaderboard() FROM PUBLIC, anon, authenticated;

-- pg_cron 1분 주기 등록
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'recompute-whale-leaderboard';
    PERFORM cron.schedule(
      'recompute-whale-leaderboard',
      '* * * * *',
      $cmd$ SELECT public.recompute_daily_whale_leaderboard(); $cmd$
    );
  END IF;
END $$;
