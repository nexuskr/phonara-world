
-- 1) get_my_dashboard_state: imperial_scores 컬럼 정정 (score/level → total_is)
CREATE OR REPLACE FUNCTION public.get_my_dashboard_state()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _today date := ((now() AT TIME ZONE 'Asia/Seoul')::date);
  _score record; _booster record; _next record;
  _today_deposit bigint; _lifetime_deposit bigint; _rank integer; _trading_cap bigint;
  _total_is bigint; _level int;
BEGIN
  IF _uid IS NULL THEN RETURN '{}'::jsonb; END IF;
  SELECT * INTO _score FROM public.imperial_scores WHERE user_id = _uid;
  _total_is := COALESCE(_score.total_is, 0);
  _level := CASE WHEN _total_is < 1 THEN 0 ELSE floor(log(10, greatest(_total_is,1)))::int END;

  SELECT * INTO _booster FROM public.deposit_booster_windows
   WHERE user_id = _uid AND expires_at > now() ORDER BY expires_at DESC LIMIT 1;
  SELECT COALESCE(SUM(amount),0) INTO _today_deposit
    FROM public.package_purchases
   WHERE user_id = _uid AND status::text IN ('active','completed')
     AND ((approved_at AT TIME ZONE 'Asia/Seoul')::date) = _today;
  SELECT COALESCE(SUM(amount),0) INTO _lifetime_deposit
    FROM public.package_purchases
   WHERE user_id = _uid AND status::text IN ('active','completed');
  _trading_cap := _today_deposit * 10;
  SELECT m.* INTO _next FROM public.escalation_milestones_catalog m
   WHERE NOT EXISTS (
     SELECT 1 FROM public.user_escalation_progress p
      WHERE p.user_id = _uid AND p.milestone_key = m.key
        AND (m.threshold_window = 'lifetime' OR p.window_date = _today)
   ) ORDER BY m.sort_order LIMIT 1;
  SELECT rank INTO _rank FROM public.daily_whale_leaderboard
   WHERE date = _today AND user_id = _uid;
  RETURN jsonb_build_object(
    'imperial_score', _total_is,
    'level', _level,
    'today_deposit', _today_deposit,
    'lifetime_deposit', _lifetime_deposit,
    'trading_cap_today', _trading_cap,
    'whale_rank_today', _rank,
    'booster', CASE WHEN _booster.id IS NULL THEN NULL ELSE
      jsonb_build_object('multiplier', _booster.multiplier, 'expires_at', _booster.expires_at) END,
    'next_milestone', CASE WHEN _next.key IS NULL THEN NULL ELSE
      jsonb_build_object('key', _next.key, 'label', _next.label,
        'threshold_krw', _next.threshold_krw, 'window', _next.threshold_window) END
  );
END; $function$;

REVOKE ALL ON FUNCTION public.get_my_dashboard_state() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_dashboard_state() TO authenticated;

-- 2) get_slot_leaderboard: 신규
CREATE OR REPLACE FUNCTION public.get_slot_leaderboard(
  _window text DEFAULT '24h',
  _game_code text DEFAULT NULL,
  _metric text DEFAULT 'total_payout',
  _limit int DEFAULT 20
)
RETURNS TABLE (
  rank int,
  masked_name text,
  game_code text,
  total_bet numeric,
  total_payout numeric,
  net numeric,
  spin_count bigint,
  max_multiplier numeric,
  max_payout numeric
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _since timestamptz;
BEGIN
  _since := CASE _window
    WHEN '7d' THEN now() - interval '7 days'
    ELSE now() - interval '24 hours'
  END;

  RETURN QUERY
  WITH agg AS (
    SELECT
      s.user_id,
      MIN(s.game_code) AS game_code,
      SUM(s.bet_phon)::numeric AS total_bet,
      SUM(s.payout_phon)::numeric AS total_payout,
      (SUM(s.payout_phon) - SUM(s.bet_phon))::numeric AS net,
      COUNT(*)::bigint AS spin_count,
      MAX(CASE WHEN s.bet_phon > 0 THEN s.payout_phon / s.bet_phon ELSE 0 END)::numeric AS max_multiplier,
      MAX(s.payout_phon)::numeric AS max_payout
    FROM public.slot_spins s
    WHERE s.created_at >= _since
      AND (_game_code IS NULL OR s.game_code = _game_code)
    GROUP BY s.user_id
  ), ranked AS (
    SELECT a.*,
      RANK() OVER (ORDER BY
        CASE _metric
          WHEN 'max_multiplier' THEN a.max_multiplier
          WHEN 'net'            THEN a.net
          ELSE a.total_payout
        END DESC
      )::int AS rnk
    FROM agg a
  )
  SELECT
    r.rnk,
    public.mask_nickname(COALESCE(p.nickname, 'Player')) AS masked_name,
    r.game_code,
    r.total_bet, r.total_payout, r.net, r.spin_count, r.max_multiplier, r.max_payout
  FROM ranked r
  LEFT JOIN public.profiles p ON p.id = r.user_id
  WHERE r.rnk <= GREATEST(_limit, 1)
  ORDER BY r.rnk;
END; $$;

REVOKE ALL ON FUNCTION public.get_slot_leaderboard(text,text,text,int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_slot_leaderboard(text,text,text,int) TO authenticated, anon;

-- 3) get_recent_roulette_spins: 신규 (마스킹된 최근 스핀, JackpotEmpireBanner 시드)
CREATE OR REPLACE FUNCTION public.get_recent_roulette_spins(_limit int DEFAULT 20)
RETURNS TABLE (
  id uuid,
  masked_name text,
  prize_label text,
  amount bigint,
  kind text,
  created_at timestamptz
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT r.id,
         public.mask_nickname(COALESCE(p.nickname, 'Player')) AS masked_name,
         r.prize_label, r.amount, r.kind, r.created_at
    FROM public.roulette_spins r
    LEFT JOIN public.profiles p ON p.id = r.user_id
   ORDER BY r.created_at DESC
   LIMIT GREATEST(_limit, 1);
$$;

REVOKE ALL ON FUNCTION public.get_recent_roulette_spins(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_recent_roulette_spins(int) TO authenticated, anon;

-- 4) cron 정리: recompute_daily_whale_leaderboard (amount_krw → amount)
CREATE OR REPLACE FUNCTION public.recompute_daily_whale_leaderboard()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _today date := (now() AT TIME ZONE 'Asia/Seoul')::date;
  _start timestamptz := (_today::timestamp AT TIME ZONE 'Asia/Seoul');
  _end   timestamptz := ((_today + 1)::timestamp AT TIME ZONE 'Asia/Seoul');
BEGIN
  WITH agg AS (
    SELECT pp.user_id, SUM(pp.amount)::bigint AS deposit_total_krw
      FROM public.package_purchases pp
     WHERE pp.status::text IN ('active','completed')
       AND pp.created_at >= _start AND pp.created_at <  _end
     GROUP BY pp.user_id
  ), ranked AS (
    SELECT user_id, deposit_total_krw,
           RANK() OVER (ORDER BY deposit_total_krw DESC)::int AS rnk
      FROM agg
  )
  INSERT INTO public.daily_whale_leaderboard (date, user_id, deposit_total_krw, rank)
  SELECT _today, user_id, deposit_total_krw, rnk FROM ranked
  ON CONFLICT (date, user_id) DO UPDATE
    SET deposit_total_krw = EXCLUDED.deposit_total_krw, rank = EXCLUDED.rank;
END; $function$;

-- 5) cron 정리: update_bot_ratio_phase (profiles.last_seen_at 없음 → auth.users.last_sign_in_at 기준)
CREATE OR REPLACE FUNCTION public.update_bot_ratio_phase()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_dau int;
  v_low int;
  v_high int;
  v_enabled boolean;
  v_new_phase int;
BEGIN
  SELECT dau_threshold_low, dau_threshold_high, auto_phase_enabled
    INTO v_low, v_high, v_enabled
  FROM public.bot_settings WHERE id = 1;

  IF NOT v_enabled THEN RETURN; END IF;

  SELECT COUNT(DISTINCT u.id) INTO v_dau
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE u.last_sign_in_at >= now() - interval '24 hours'
    AND COALESCE(p.is_bot, false) = false;

  IF v_dau < v_low THEN
    v_new_phase := 1;
  ELSIF v_dau < v_high THEN
    v_new_phase := 2;
  ELSIF v_dau < v_high * 4 THEN
    v_new_phase := 3;
  ELSE
    v_new_phase := 4;
  END IF;

  UPDATE public.bot_settings
     SET bot_ratio_phase = v_new_phase,
         updated_at = now()
   WHERE id = 1 AND bot_ratio_phase <> v_new_phase;
END;
$function$;
