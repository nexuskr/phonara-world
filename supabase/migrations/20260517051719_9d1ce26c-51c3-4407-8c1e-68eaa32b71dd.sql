
-- 1) Streak milestones table
CREATE TABLE IF NOT EXISTS public.streak_milestones (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  streak_len integer NOT NULL,
  phon_bonus bigint NOT NULL DEFAULT 0,
  awarded_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, streak_len)
);
ALTER TABLE public.streak_milestones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "streak_milestones_select_own" ON public.streak_milestones
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "streak_milestones_admin_all" ON public.streak_milestones
  FOR ALL USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));

-- 2) claim_daily_attendance_v2 — 기존 v1 보존, v2 신규 추가
CREATE OR REPLACE FUNCTION public.claim_daily_attendance_v2()
RETURNS TABLE(reward bigint, new_streak integer, weekly_bonus bigint, milestone_hit integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_today date := CURRENT_DATE;
  v_last date;
  v_streak integer;
  v_tier text;
  v_base bigint := 5000;
  v_weekly bigint := 0;
  v_milestone integer := 0;
  v_milestone_bonus bigint := 0;
  v_total bigint;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;

  SELECT tier, last_attendance, attendance_streak INTO v_tier, v_last, v_streak
  FROM public.profiles WHERE id = v_uid FOR UPDATE;

  IF v_last = v_today THEN
    RETURN QUERY SELECT 0::bigint, COALESCE(v_streak,0), 0::bigint, 0;
    RETURN;
  END IF;

  -- streak 정정: 어제가 아니면 1부터 다시
  IF v_last IS NULL OR v_last < v_today - 1 THEN
    v_streak := 1;
  ELSE
    v_streak := COALESCE(v_streak,0) + 1;
  END IF;

  v_base := CASE v_tier
    WHEN 'EMPIRE' THEN 25000
    WHEN 'GOD'    THEN 15000
    WHEN 'VIP'    THEN 8000
    ELSE 5000
  END;

  IF v_streak % 7 = 0 THEN
    v_weekly := v_base; -- 7일마다 1배 보너스
  END IF;

  -- milestone bonuses (1회)
  IF v_streak IN (7, 14, 30, 100) THEN
    v_milestone_bonus := CASE v_streak
      WHEN 7   THEN 3000
      WHEN 14  THEN 8000
      WHEN 30  THEN 25000
      WHEN 100 THEN 100000
    END;
    INSERT INTO public.streak_milestones(user_id, streak_len, phon_bonus)
    VALUES (v_uid, v_streak, v_milestone_bonus)
    ON CONFLICT (user_id, streak_len) DO NOTHING;
    IF NOT FOUND THEN
      v_milestone_bonus := 0; -- 이미 받음
    ELSE
      v_milestone := v_streak;
    END IF;
  END IF;

  UPDATE public.profiles
  SET last_attendance = v_today,
      attendance_streak = v_streak
  WHERE id = v_uid;

  v_total := v_base + v_weekly + v_milestone_bonus;

  INSERT INTO public.phon_balances(user_id, balance) VALUES (v_uid, v_total)
  ON CONFLICT (user_id) DO UPDATE SET balance = public.phon_balances.balance + EXCLUDED.balance, updated_at = now();

  RETURN QUERY SELECT v_base, v_streak, v_weekly, v_milestone;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_daily_attendance_v2() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_daily_attendance_v2() TO authenticated;

-- 3) Reactivation campaigns 보강 + 30d 신규
UPDATE public.reactivation_campaigns
SET phon_bonus = 10000,
    title = '🔥 7일 만에 돌아오세요',
    body  = '7일 만에 복귀 시 +10,000 PHON 즉시 지급. 폐하의 자리는 비워두었습니다.',
    cta_label = '복귀 보너스 +10,000',
    updated_at = now()
WHERE key = 'comeback_7d';

UPDATE public.reactivation_campaigns
SET phon_bonus = 5000,
    title = '⚡ 마지막 Founding Seat 우선권',
    body  = '14일째 휴면. +5,000 PHON + Founding Seat 우선권 + Empire Booster 24h.',
    cta_label = '복귀 + Founding 우선권',
    updated_at = now()
WHERE key = 'comeback_14d';

INSERT INTO public.reactivation_campaigns(key, title, body, cta_label, dormant_days, phon_bonus, expires_after_hours, channels, active)
VALUES (
  'comeback_30d',
  '👑 당신의 Empire 레벨이 올라갔어요',
  '30일 만에 돌아오시면 +25,000 PHON. 새로운 황제 칭호가 당신을 기다립니다.',
  '복귀 보너스 +25,000',
  30, 25000, 96,
  ARRAY['push','email','inapp'],
  true
)
ON CONFLICT (key) DO UPDATE
  SET title = EXCLUDED.title,
      body = EXCLUDED.body,
      cta_label = EXCLUDED.cta_label,
      phon_bonus = EXCLUDED.phon_bonus,
      expires_after_hours = EXCLUDED.expires_after_hours,
      active = true,
      updated_at = now();

-- 4) Mission daily status
CREATE TABLE IF NOT EXISTS public.mission_daily_status (
  user_id uuid NOT NULL,
  day date NOT NULL,
  completed_count integer NOT NULL DEFAULT 0,
  failed boolean NOT NULL DEFAULT false,
  recovery_bonus_pct integer NOT NULL DEFAULT 0,
  recovery_claimed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, day)
);
ALTER TABLE public.mission_daily_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mds_select_own" ON public.mission_daily_status
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "mds_admin_all" ON public.mission_daily_status
  FOR ALL USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));

-- 5) record_mission_outcome — 클라에서 미션 카드 마운트 시 호출, 어제까지의 fail 누적
CREATE OR REPLACE FUNCTION public.record_mission_outcome(_completed_today integer DEFAULT 0)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_today date := CURRENT_DATE;
  v_yesterday date := CURRENT_DATE - 1;
  v_consec_fail integer := 0;
  v_recovery_pct integer := 0;
  d date;
  r record;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;

  -- 어제 행 finalize: completed_count = 0 → failed=true
  INSERT INTO public.mission_daily_status(user_id, day, completed_count, failed)
  VALUES (v_uid, v_yesterday, 0, true)
  ON CONFLICT (user_id, day) DO UPDATE
    SET failed = (public.mission_daily_status.completed_count = 0),
        updated_at = now();

  -- 오늘 행 upsert
  INSERT INTO public.mission_daily_status(user_id, day, completed_count)
  VALUES (v_uid, v_today, GREATEST(_completed_today, 0))
  ON CONFLICT (user_id, day) DO UPDATE
    SET completed_count = GREATEST(public.mission_daily_status.completed_count, EXCLUDED.completed_count),
        updated_at = now();

  -- 연속 fail 카운트(어제부터 거꾸로)
  d := v_yesterday;
  FOR r IN
    SELECT day, failed FROM public.mission_daily_status
    WHERE user_id = v_uid AND day <= v_yesterday
    ORDER BY day DESC LIMIT 7
  LOOP
    IF r.day = d AND r.failed THEN
      v_consec_fail := v_consec_fail + 1;
      d := d - 1;
    ELSE
      EXIT;
    END IF;
  END LOOP;

  IF v_consec_fail >= 3 THEN
    v_recovery_pct := 30;
    UPDATE public.mission_daily_status
       SET recovery_bonus_pct = 30, updated_at = now()
     WHERE user_id = v_uid AND day = v_today AND recovery_bonus_pct < 30;
  END IF;

  RETURN jsonb_build_object('ok', true, 'consec_fail', v_consec_fail, 'recovery_pct', v_recovery_pct);
END;
$$;
REVOKE ALL ON FUNCTION public.record_mission_outcome(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_mission_outcome(integer) TO authenticated;

-- 6) get_mission_recovery_state
CREATE OR REPLACE FUNCTION public.get_mission_recovery_state()
RETURNS TABLE(consecutive_fails integer, recovery_pct integer, easy_mode boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_pct integer := 0;
  v_fails integer := 0;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;

  SELECT COALESCE(recovery_bonus_pct, 0) INTO v_pct
  FROM public.mission_daily_status
  WHERE user_id = v_uid AND day = CURRENT_DATE;

  SELECT COUNT(*)::integer INTO v_fails
  FROM (
    SELECT day, failed
    FROM public.mission_daily_status
    WHERE user_id = v_uid AND day BETWEEN CURRENT_DATE - 3 AND CURRENT_DATE - 1
    ORDER BY day DESC
  ) t
  WHERE failed;

  RETURN QUERY SELECT v_fails, COALESCE(v_pct,0), v_fails >= 3;
END;
$$;
REVOKE ALL ON FUNCTION public.get_mission_recovery_state() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_mission_recovery_state() TO authenticated;

-- 7) apply_recovery_bonus — 미션 보상 수령 시 클라이언트가 추가 호출, 30% 가산 1회
CREATE OR REPLACE FUNCTION public.apply_recovery_bonus(_base_amount bigint, _kind text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_pct integer;
  v_bonus bigint := 0;
  v_today date := CURRENT_DATE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;
  IF _base_amount IS NULL OR _base_amount <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason','no_base');
  END IF;

  SELECT recovery_bonus_pct INTO v_pct
  FROM public.mission_daily_status
  WHERE user_id = v_uid AND day = v_today FOR UPDATE;

  IF COALESCE(v_pct,0) <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason','no_recovery');
  END IF;

  -- 일 1회만 가산
  UPDATE public.mission_daily_status
     SET recovery_claimed_at = now(),
         recovery_bonus_pct = 0,
         updated_at = now()
   WHERE user_id = v_uid AND day = v_today
     AND recovery_claimed_at IS NULL
     AND recovery_bonus_pct > 0;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason','already_claimed');
  END IF;

  v_bonus := (_base_amount * v_pct) / 100;

  IF v_bonus > 0 THEN
    INSERT INTO public.phon_balances(user_id, balance) VALUES (v_uid, v_bonus)
    ON CONFLICT (user_id) DO UPDATE
      SET balance = public.phon_balances.balance + EXCLUDED.balance,
          updated_at = now();
  END IF;

  RETURN jsonb_build_object('ok', true, 'bonus', v_bonus, 'kind', _kind, 'pct', v_pct);
END;
$$;
REVOKE ALL ON FUNCTION public.apply_recovery_bonus(bigint,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_recovery_bonus(bigint,text) TO authenticated;

-- 8) FOMO 집계 RPC
CREATE OR REPLACE FUNCTION public.get_today_mission_completion_stats()
RETURNS TABLE(overall_pct numeric, my_remaining integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_total integer;
  v_done integer;
  v_my_done integer := 0;
  v_my_remaining integer := 4; -- 3 missions + guild
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;

  SELECT COUNT(*)::integer INTO v_total
  FROM public.mission_daily_status
  WHERE day = CURRENT_DATE;

  SELECT COUNT(*)::integer INTO v_done
  FROM public.mission_daily_status
  WHERE day = CURRENT_DATE AND completed_count >= 3;

  SELECT COALESCE(completed_count,0) INTO v_my_done
  FROM public.mission_daily_status
  WHERE day = CURRENT_DATE AND user_id = v_uid;

  v_my_remaining := GREATEST(0, 4 - COALESCE(v_my_done,0));

  RETURN QUERY SELECT
    CASE WHEN v_total > 0 THEN ROUND((v_done::numeric / v_total) * 100, 0)
         ELSE 87::numeric END,
    v_my_remaining;
END;
$$;
REVOKE ALL ON FUNCTION public.get_today_mission_completion_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_today_mission_completion_stats() TO authenticated;
