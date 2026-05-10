
INSERT INTO public.mission_templates(key, title, description, category, difficulty, reward_credit, reward_xp, duration_minutes, auto_approve, active)
VALUES ('paper_trade_close', 'Paper 거래 종료', 'Paper Long/Short 포지션 종료', 'trade', 'easy', 0, 10, 0, true, true)
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.record_paper_trade_outcome(
  p_symbol text,
  p_side text,
  p_pnl numeric,
  p_is_win boolean
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_xp int := CASE WHEN p_is_win THEN 10 ELSE 2 END;
  v_iso text := to_char(now(), 'IYYY-"W"IW');
  v_today date := (now() at time zone 'utc')::date;
  v_streak int;
  v_best int;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;

  -- 1) daily_stats upsert
  INSERT INTO public.daily_stats(user_id, stat_date, earned, wins, losses, current_streak, best_streak, withdrawals_count)
  VALUES (v_user, v_today,
          GREATEST(p_pnl::bigint, 0),
          CASE WHEN p_is_win THEN 1 ELSE 0 END,
          CASE WHEN p_is_win THEN 0 ELSE 1 END,
          CASE WHEN p_is_win THEN 1 ELSE 0 END,
          CASE WHEN p_is_win THEN 1 ELSE 0 END,
          0)
  ON CONFLICT (user_id, stat_date) DO UPDATE
    SET earned = public.daily_stats.earned + GREATEST(p_pnl::bigint, 0),
        wins   = public.daily_stats.wins   + CASE WHEN p_is_win THEN 1 ELSE 0 END,
        losses = public.daily_stats.losses + CASE WHEN p_is_win THEN 0 ELSE 1 END,
        current_streak = CASE WHEN p_is_win THEN public.daily_stats.current_streak + 1 ELSE 0 END,
        best_streak = GREATEST(public.daily_stats.best_streak,
                                CASE WHEN p_is_win THEN public.daily_stats.current_streak + 1 ELSE public.daily_stats.best_streak END)
  RETURNING current_streak, best_streak INTO v_streak, v_best;

  -- 2) weekly_pass_progress
  INSERT INTO public.weekly_pass_progress(user_id, iso_week, xp, level, claimed_levels)
  VALUES (v_user, v_iso, v_xp, GREATEST(1, v_xp / 100), '[]'::jsonb)
  ON CONFLICT (user_id, iso_week) DO UPDATE
    SET xp = public.weekly_pass_progress.xp + v_xp,
        level = GREATEST(1, ((public.weekly_pass_progress.xp + v_xp) / 100)::int),
        updated_at = now();

  -- 3) season_pass_progress (current open season if exists)
  UPDATE public.season_pass_progress
    SET xp = xp + v_xp,
        level = GREATEST(1, ((xp + v_xp) / 200)::int),
        updated_at = now()
  WHERE user_id = v_user
    AND season_id = (SELECT id FROM public.seasons WHERE now() BETWEEN starts_at AND ends_at ORDER BY starts_at DESC LIMIT 1);

  -- 4) mission_history record
  INSERT INTO public.mission_history(user_id, mission_id, is_win, base_reward, final_reward, streak, multiplier, tier, cap_remaining)
  VALUES (v_user, 'paper_trade_close', p_is_win, v_xp, v_xp, COALESCE(v_streak,0), 1.0,
          (SELECT tier FROM public.profiles WHERE user_id = v_user), 0);

  RETURN jsonb_build_object('xp_awarded', v_xp, 'streak', COALESCE(v_streak,0), 'best_streak', COALESCE(v_best,0));
END $$;

REVOKE ALL ON FUNCTION public.record_paper_trade_outcome(text,text,numeric,boolean) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.record_paper_trade_outcome(text,text,numeric,boolean) TO authenticated;
