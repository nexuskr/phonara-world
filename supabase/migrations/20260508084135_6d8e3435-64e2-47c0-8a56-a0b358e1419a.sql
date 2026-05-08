
-- ============ 1. DRY RUN PAYOUT (admin diagnostic) ============
CREATE OR REPLACE FUNCTION public.pay_weekly_leaderboard_dry_run()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _wk text := to_char(now(),'IYYY-IW');
        _r record; _amt bigint; _rank int := 0; _result jsonb := '[]'::jsonb;
BEGIN
  IF NOT public.has_role(_uid,'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  FOR _r IN
    SELECT inviter_id, COUNT(*) AS cnt, COALESCE(SUM(commission),0) AS total
    FROM public.referral_earnings
    WHERE created_at >= date_trunc('week', now())
    GROUP BY inviter_id
    ORDER BY total DESC, cnt DESC
    LIMIT 3
  LOOP
    _rank := _rank + 1;
    _amt := CASE _rank WHEN 1 THEN 50000 WHEN 2 THEN 30000 ELSE 15000 END;
    _result := _result || jsonb_build_object(
      'rank', _rank, 'user_id', _r.inviter_id,
      'invitees', _r.cnt, 'commission', _r.total,
      'would_pay', _amt,
      'already_paid', EXISTS(SELECT 1 FROM public.weekly_payout_log
                              WHERE iso_week=_wk AND rank=_rank AND user_id=_r.inviter_id)
    );
  END LOOP;
  RETURN jsonb_build_object('iso_week', _wk, 'preview', _result, 'now', now());
END $$;
REVOKE ALL ON FUNCTION public.pay_weekly_leaderboard_dry_run() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.pay_weekly_leaderboard_dry_run() TO authenticated;

-- ============ 2. WEEKLY PASS VERIFY ============
CREATE OR REPLACE FUNCTION public.verify_weekly_pass_finalize(_iso_week text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid();
        _wk text := COALESCE(_iso_week, to_char(now() - interval '1 day','IYYY-IW'));
        _stats jsonb;
BEGIN
  IF NOT public.has_role(_uid,'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT jsonb_build_object(
    'iso_week', _wk,
    'progress_users',          (SELECT count(*) FROM public.weekly_pass_progress WHERE iso_week=_wk),
    'finalize_notifications',  (SELECT count(*) FROM public.notifications
                                  WHERE kind='weekly_pass_end' AND payload->>'iso_week'=_wk),
    'unclaimed_max_level',     (SELECT count(*) FROM public.weekly_pass_progress
                                  WHERE iso_week=_wk AND level >= 10
                                    AND NOT (claimed_levels @> to_jsonb(10))),
    'avg_level',               (SELECT round(avg(level)::numeric, 2) FROM public.weekly_pass_progress WHERE iso_week=_wk),
    'top_levels',              (SELECT jsonb_agg(jsonb_build_object('user_id',user_id,'level',level,'claimed',claimed_levels) ORDER BY level DESC)
                                  FROM (SELECT user_id, level, claimed_levels FROM public.weekly_pass_progress
                                        WHERE iso_week=_wk ORDER BY level DESC LIMIT 5) t),
    'next_week_clean',         (SELECT count(*)=0 FROM public.weekly_pass_progress
                                  WHERE iso_week=to_char(now(),'IYYY-IW')
                                    AND (xp > 0 OR jsonb_array_length(claimed_levels) > 0)
                                    AND user_id IN (SELECT user_id FROM public.weekly_pass_progress WHERE iso_week=_wk))
  ) INTO _stats;
  RETURN _stats;
END $$;
REVOKE ALL ON FUNCTION public.verify_weekly_pass_finalize(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.verify_weekly_pass_finalize(text) TO authenticated;

-- ============ 3. AUDITED CRON WRAPPERS ============
CREATE OR REPLACE FUNCTION public.cron_run_pay_weekly_leaderboard()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _t timestamptz := clock_timestamp(); _r jsonb; _err text;
BEGIN
  BEGIN
    SELECT public.pay_weekly_leaderboard() INTO _r;
    INSERT INTO public.cron_settle_audit_log(caller, ok, settled_count, duration_ms, metadata)
      VALUES('weekly_leaderboard_payout', true, COALESCE((_r->>'paid')::int, 0),
             extract(milliseconds from clock_timestamp() - _t)::int, _r);
    RETURN _r;
  EXCEPTION WHEN OTHERS THEN
    _err := SQLERRM;
    INSERT INTO public.cron_settle_audit_log(caller, ok, settled_count, duration_ms, error)
      VALUES('weekly_leaderboard_payout', false, 0,
             extract(milliseconds from clock_timestamp() - _t)::int, _err);
    RAISE;
  END;
END $$;
REVOKE ALL ON FUNCTION public.cron_run_pay_weekly_leaderboard() FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.cron_run_finalize_weekly_pass()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _t timestamptz := clock_timestamp(); _r jsonb; _err text;
BEGIN
  BEGIN
    SELECT public.finalize_weekly_pass() INTO _r;
    INSERT INTO public.cron_settle_audit_log(caller, ok, settled_count, duration_ms, metadata)
      VALUES('weekly_pass_finalize', true, COALESCE((_r->>'notified')::int, 0),
             extract(milliseconds from clock_timestamp() - _t)::int, _r);
    RETURN _r;
  EXCEPTION WHEN OTHERS THEN
    _err := SQLERRM;
    INSERT INTO public.cron_settle_audit_log(caller, ok, settled_count, duration_ms, error)
      VALUES('weekly_pass_finalize', false, 0,
             extract(milliseconds from clock_timestamp() - _t)::int, _err);
    RAISE;
  END;
END $$;
REVOKE ALL ON FUNCTION public.cron_run_finalize_weekly_pass() FROM public, anon, authenticated;

DO $$
DECLARE _jobs text[] := ARRAY['weekly-leaderboard-payout','weekly-pass-finalize'];
        _j text;
BEGIN
  FOREACH _j IN ARRAY _jobs LOOP
    PERFORM cron.unschedule(_j) WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname=_j);
  END LOOP;
END $$;

SELECT cron.schedule('weekly-leaderboard-payout', '0 0 * * 1',
  $$ SELECT public.cron_run_pay_weekly_leaderboard(); $$);
SELECT cron.schedule('weekly-pass-finalize', '5 0 * * 1',
  $$ SELECT public.cron_run_finalize_weekly_pass(); $$);

-- ============ 4. PERMISSION BASELINE ============
INSERT INTO public.function_permissions_baseline (function_name, function_args, allowed_roles, category, note) VALUES
  ('pay_weekly_leaderboard_dry_run','','{authenticated}','referral','admin diagnostic'),
  ('verify_weekly_pass_finalize','_iso_week text','{authenticated}','weekly_pass','admin diagnostic'),
  ('cron_run_pay_weekly_leaderboard','','{}','referral','cron only — audited wrapper'),
  ('cron_run_finalize_weekly_pass','','{}','weekly_pass','cron only — audited wrapper')
ON CONFLICT (function_name, function_args) DO UPDATE SET
  allowed_roles=EXCLUDED.allowed_roles, category=EXCLUDED.category, note=EXCLUDED.note, updated_at=now();
