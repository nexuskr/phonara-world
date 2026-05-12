CREATE OR REPLACE FUNCTION public.get_cockpit_snapshot()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  is_admin boolean;
  -- revenue
  rev_30d bigint := 0;
  rev_today bigint := 0;
  rev_24h bigint := 0;
  rev_target bigint := 3000000; -- KPI 목표 (₩3,000,000 — 내부 운영 지표, UI 표기는 SIM/단위 추상화)
  -- flows
  dep_today_count int := 0;
  dep_today_sum bigint := 0;
  wd_today_count int := 0;
  wd_today_sum bigint := 0;
  wd_pending_count int := 0;
  wd_pending_sum bigint := 0;
  -- baron
  baron_active int := 0;
  baron_promotions_24h int := 0;
  baron_promotions_7d int := 0;
  -- crown war
  cw jsonb := '{}'::jsonb;
  cw_war record;
  cw_top jsonb := '[]'::jsonb;
  cw_total int := 0;
  -- booster
  booster_active_users int := 0;
  booster_total_users int := 0;
  booster_holding_rate numeric := 0;
  -- bot ratio
  real_dau int := 0;
  bot_active_24h int := 0;
  real_total int := 0;
  bot_total int := 0;
  -- funnel
  signups_30d int := 0;
  practiced_30d int := 0;
  crowned_30d int := 0;
  baron_30d int := 0;
  -- risk quick
  unack_anomalies int := 0;
  freezes_active int := 0;
BEGIN
  SELECT has_role(auth.uid(), 'admin'::app_role) INTO is_admin;
  IF NOT COALESCE(is_admin, false) THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  -- ===== revenue =====
  SELECT COALESCE(SUM(amount),0) INTO rev_30d
  FROM public.package_purchases
  WHERE status IN ('approved','completed')
    AND created_at > now() - interval '30 days';

  SELECT COALESCE(SUM(amount),0) INTO rev_today
  FROM public.package_purchases
  WHERE status IN ('approved','completed')
    AND created_at >= date_trunc('day', now() AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'Asia/Seoul';

  SELECT COALESCE(SUM(amount),0) INTO rev_24h
  FROM public.package_purchases
  WHERE status IN ('approved','completed')
    AND created_at > now() - interval '24 hours';

  -- ===== flows =====
  SELECT COUNT(*), COALESCE(SUM(amount),0) INTO dep_today_count, dep_today_sum
  FROM public.package_purchases
  WHERE status IN ('approved','completed')
    AND created_at >= date_trunc('day', now() AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'Asia/Seoul';

  SELECT COUNT(*), COALESCE(SUM(amount),0) INTO wd_today_count, wd_today_sum
  FROM public.withdrawal_requests
  WHERE status='completed'
    AND completed_at >= date_trunc('day', now() AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'Asia/Seoul';

  SELECT COUNT(*), COALESCE(SUM(amount),0) INTO wd_pending_count, wd_pending_sum
  FROM public.withdrawal_requests
  WHERE status='pending';

  -- ===== baron =====
  SELECT COUNT(*) INTO baron_active
  FROM public.profiles WHERE empire_level >= 7;

  BEGIN
    SELECT COUNT(*) INTO baron_promotions_24h
    FROM public.fomo_notifications
    WHERE kind = 'baron_promotion' AND created_at > now() - interval '24 hours';
    SELECT COUNT(*) INTO baron_promotions_7d
    FROM public.fomo_notifications
    WHERE kind = 'baron_promotion' AND created_at > now() - interval '7 days';
  EXCEPTION WHEN OTHERS THEN
    baron_promotions_24h := 0;
    baron_promotions_7d := 0;
  END;

  -- ===== crown war (current/last) =====
  BEGIN
    SELECT * INTO cw_war FROM public.crown_wars
      WHERE status IN ('live','settling','open')
      ORDER BY started_at DESC LIMIT 1;
    IF cw_war.id IS NULL THEN
      SELECT * INTO cw_war FROM public.crown_wars
        ORDER BY started_at DESC LIMIT 1;
    END IF;

    IF cw_war.id IS NOT NULL THEN
      SELECT COUNT(*) INTO cw_total FROM public.crown_war_participants WHERE war_id = cw_war.id;
      SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.rnk ASC), '[]'::jsonb) INTO cw_top
      FROM (
        SELECT
          ROW_NUMBER() OVER (ORDER BY p.score DESC, p.last_event_at ASC) AS rnk,
          p.score,
          COALESCE(pr.empire_level, 1) AS level,
          CASE
            WHEN COALESCE(pr.nickname,'') = '' THEN 'Empire●●●'
            WHEN char_length(pr.nickname) <= 2 THEN substr(pr.nickname,1,1)||'●●'
            ELSE substr(pr.nickname,1,1)||repeat('●', greatest(1, char_length(pr.nickname)-2))||substr(pr.nickname, char_length(pr.nickname),1)
          END AS nick
        FROM public.crown_war_participants p
        LEFT JOIN public.profiles pr ON pr.id = p.user_id
        WHERE p.war_id = cw_war.id
        ORDER BY p.score DESC, p.last_event_at ASC
        LIMIT 3
      ) t;
      cw := jsonb_build_object(
        'id', cw_war.id,
        'status', cw_war.status,
        'started_at', cw_war.started_at,
        'ends_at', cw_war.ends_at,
        'participants', GREATEST(cw_total, COALESCE(cw_war.total_participants,0)),
        'top3', cw_top
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    cw := '{}'::jsonb;
  END;

  -- ===== booster =====
  BEGIN
    SELECT COUNT(DISTINCT user_id) INTO booster_active_users
    FROM public.empire_boosters
    WHERE expires_at > now();
    SELECT COUNT(*) INTO booster_total_users FROM public.profiles;
    IF booster_total_users > 0 THEN
      booster_holding_rate := round((booster_active_users::numeric / booster_total_users::numeric) * 100, 2);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    booster_active_users := 0;
    booster_holding_rate := 0;
  END;

  -- ===== bot vs real =====
  SELECT COUNT(DISTINCT user_id) INTO real_dau
  FROM public.transactions WHERE created_at > now() - interval '24 hours';

  SELECT COUNT(*) INTO real_total FROM public.profiles;

  BEGIN
    SELECT COUNT(*) INTO bot_active_24h
    FROM public.bot_personas WHERE last_active_at > now() - interval '24 hours';
    SELECT COUNT(*) INTO bot_total FROM public.bot_personas;
  EXCEPTION WHEN OTHERS THEN
    bot_active_24h := 0;
    bot_total := 0;
  END;

  -- ===== funnel (30d) =====
  SELECT COUNT(*) INTO signups_30d
  FROM public.profiles WHERE created_at > now() - interval '30 days';

  BEGIN
    SELECT COUNT(DISTINCT user_id) INTO practiced_30d
    FROM public.transactions
    WHERE type IN ('practice_win','practice_loss','sim_practice','practice')
      AND created_at > now() - interval '30 days';
  EXCEPTION WHEN OTHERS THEN
    practiced_30d := 0;
  END;

  BEGIN
    SELECT COUNT(DISTINCT user_id) INTO crowned_30d
    FROM public.crown_events
    WHERE created_at > now() - interval '30 days';
  EXCEPTION WHEN OTHERS THEN
    crowned_30d := 0;
  END;

  SELECT COUNT(*) INTO baron_30d
  FROM public.profiles
  WHERE empire_level >= 7 AND updated_at > now() - interval '30 days';

  -- ===== risk =====
  BEGIN
    SELECT COUNT(*) INTO unack_anomalies FROM public.anomaly_events WHERE acknowledged = false;
  EXCEPTION WHEN OTHERS THEN unack_anomalies := 0;
  END;
  BEGIN
    SELECT COUNT(*) INTO freezes_active FROM public.account_freezes WHERE expires_at > now();
  EXCEPTION WHEN OTHERS THEN freezes_active := 0;
  END;

  RETURN jsonb_build_object(
    'generated_at', now(),
    'revenue', jsonb_build_object(
      'd30', rev_30d, 'today', rev_today, 'd24h', rev_24h,
      'target_30d', rev_target,
      'progress_pct', CASE WHEN rev_target>0 THEN round((rev_30d::numeric/rev_target::numeric)*100, 2) ELSE 0 END
    ),
    'flows', jsonb_build_object(
      'deposits_today_count', dep_today_count,
      'deposits_today_sum', dep_today_sum,
      'withdrawals_today_count', wd_today_count,
      'withdrawals_today_sum', wd_today_sum,
      'withdrawals_pending_count', wd_pending_count,
      'withdrawals_pending_sum', wd_pending_sum
    ),
    'baron', jsonb_build_object(
      'active', baron_active,
      'promoted_24h', baron_promotions_24h,
      'promoted_7d', baron_promotions_7d
    ),
    'crown_war', cw,
    'booster', jsonb_build_object(
      'active_users', booster_active_users,
      'holding_rate_pct', booster_holding_rate
    ),
    'bot_ratio', jsonb_build_object(
      'real_dau', real_dau,
      'real_total', real_total,
      'bot_active_24h', bot_active_24h,
      'bot_total', bot_total,
      'real_share_pct', CASE WHEN (real_dau+bot_active_24h)>0
        THEN round((real_dau::numeric / (real_dau+bot_active_24h)::numeric) * 100, 2)
        ELSE 0 END
    ),
    'funnel', jsonb_build_object(
      'signups_30d', signups_30d,
      'practiced_30d', practiced_30d,
      'crowned_30d', crowned_30d,
      'baron_30d', baron_30d,
      'practice_rate_pct', CASE WHEN signups_30d>0 THEN round((practiced_30d::numeric/signups_30d::numeric)*100,2) ELSE 0 END,
      'crown_rate_pct', CASE WHEN practiced_30d>0 THEN round((crowned_30d::numeric/practiced_30d::numeric)*100,2) ELSE 0 END,
      'baron_rate_pct', CASE WHEN crowned_30d>0 THEN round((baron_30d::numeric/crowned_30d::numeric)*100,2) ELSE 0 END
    ),
    'risk', jsonb_build_object(
      'unack_anomalies', unack_anomalies,
      'freezes_active', freezes_active
    )
  );
END $function$;

REVOKE ALL ON FUNCTION public.get_cockpit_snapshot() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_cockpit_snapshot() TO authenticated;