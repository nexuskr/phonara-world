
-- ============================================================
-- Sprint 1 Week 3 — Earn Hub MVP + Viral Foundation
-- ============================================================

-- 1) daily_quick_claims — 멱등 일일 보상 클레임 원장
CREATE TABLE IF NOT EXISTS public.daily_quick_claims (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  day DATE NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Seoul')::date,
  amount BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT daily_quick_claims_uniq UNIQUE (user_id, kind, day)
);

CREATE INDEX IF NOT EXISTS idx_dqc_user_day ON public.daily_quick_claims (user_id, day DESC);

ALTER TABLE public.daily_quick_claims ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dqc_self_select" ON public.daily_quick_claims;
CREATE POLICY "dqc_self_select" ON public.daily_quick_claims
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "dqc_admin_all" ON public.daily_quick_claims;
CREATE POLICY "dqc_admin_all" ON public.daily_quick_claims
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- INSERT only via SECURITY DEFINER RPC — no direct insert policy.

-- ============================================================
-- 2) claim_daily_quick_reward(_kind) — 미션/플레이 보상 클레임
-- ============================================================
CREATE OR REPLACE FUNCTION public.claim_daily_quick_reward(_kind text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _today date := (now() AT TIME ZONE 'Asia/Seoul')::date;
  _amount bigint := 0;
  _inserted boolean := false;
  _new_balance numeric := 0;
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'auth_required');
  END IF;

  _amount := CASE _kind
    WHEN 'mission_play'    THEN 100
    WHEN 'mission_invite'  THEN 150
    WHEN 'mission_deposit' THEN 300
    WHEN 'play_today'      THEN 80
    ELSE 0
  END;

  IF _amount = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_kind');
  END IF;

  INSERT INTO public.daily_quick_claims (user_id, kind, day, amount)
  VALUES (_uid, _kind, _today, _amount)
  ON CONFLICT (user_id, kind, day) DO NOTHING
  RETURNING true INTO _inserted;

  IF NOT COALESCE(_inserted, false) THEN
    SELECT balance INTO _new_balance FROM public.phon_balances WHERE user_id = _uid;
    RETURN jsonb_build_object(
      'ok', true, 'already_claimed', true,
      'kind', _kind, 'amount', 0, 'balance', COALESCE(_new_balance, 0)
    );
  END IF;

  INSERT INTO public.phon_balances (user_id, balance) VALUES (_uid, _amount)
  ON CONFLICT (user_id) DO UPDATE SET
    balance = public.phon_balances.balance + EXCLUDED.balance,
    updated_at = now()
  RETURNING balance INTO _new_balance;

  RETURN jsonb_build_object(
    'ok', true, 'already_claimed', false,
    'kind', _kind, 'amount', _amount, 'balance', _new_balance
  );
END;
$$;

REVOKE ALL ON FUNCTION public.claim_daily_quick_reward(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_daily_quick_reward(text) TO authenticated;

-- ============================================================
-- 3) claim_share_reward(_channel) — 채널 공유 일일 1회 보상
-- ============================================================
CREATE OR REPLACE FUNCTION public.claim_share_reward(_channel text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _today date := (now() AT TIME ZONE 'Asia/Seoul')::date;
  _amount bigint := 200;
  _allowed text[] := ARRAY['instagram','tiktok','youtube','x','naver','kakao','line','copy'];
  _inserted boolean := false;
  _kind text;
  _new_balance numeric := 0;
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'auth_required');
  END IF;
  IF NOT (_channel = ANY (_allowed)) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_channel');
  END IF;

  _kind := 'share_' || _channel;

  INSERT INTO public.daily_quick_claims (user_id, kind, day, amount)
  VALUES (_uid, _kind, _today, _amount)
  ON CONFLICT (user_id, kind, day) DO NOTHING
  RETURNING true INTO _inserted;

  -- 항상 share 이벤트 로그 (멱등 분석용)
  PERFORM public.log_share_event(
    'bigwin_dialog',
    'shared',
    _channel,
    jsonb_build_object('reward', CASE WHEN _inserted THEN _amount ELSE 0 END)
  );

  IF NOT COALESCE(_inserted, false) THEN
    SELECT balance INTO _new_balance FROM public.phon_balances WHERE user_id = _uid;
    RETURN jsonb_build_object(
      'ok', true, 'already_claimed', true,
      'channel', _channel, 'amount', 0, 'balance', COALESCE(_new_balance, 0)
    );
  END IF;

  INSERT INTO public.phon_balances (user_id, balance) VALUES (_uid, _amount)
  ON CONFLICT (user_id) DO UPDATE SET
    balance = public.phon_balances.balance + EXCLUDED.balance,
    updated_at = now()
  RETURNING balance INTO _new_balance;

  RETURN jsonb_build_object(
    'ok', true, 'already_claimed', false,
    'channel', _channel, 'amount', _amount, 'balance', _new_balance
  );
END;
$$;

REVOKE ALL ON FUNCTION public.claim_share_reward(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_share_reward(text) TO authenticated;

-- ============================================================
-- 4) get_earn_hub_state() — 5카드 상태 단일 조회
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_earn_hub_state()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _today date := (now() AT TIME ZONE 'Asia/Seoul')::date;
  _streak int := 0;
  _last_att date;
  _att_today boolean := false;
  _ref_code text;
  _ref_count int := 0;
  _ref_total bigint := 0;
  _today_earned bigint := 0;
  _mission_play boolean := false;
  _mission_invite boolean := false;
  _mission_deposit boolean := false;
  _play_today_done boolean := false;
  _share_channels text[] := ARRAY[]::text[];
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'auth_required');
  END IF;

  SELECT attendance_streak, last_attendance, referral_code
    INTO _streak, _last_att, _ref_code
  FROM public.profiles WHERE id = _uid;

  _att_today := (_last_att = _today);

  SELECT COUNT(*), COALESCE(SUM(commission), 0)
    INTO _ref_count, _ref_total
  FROM public.referral_earnings WHERE inviter_id = _uid;

  SELECT COALESCE(SUM(amount), 0) INTO _today_earned
  FROM public.daily_quick_claims
  WHERE user_id = _uid AND day = _today;

  -- 출석 보너스를 today_earned에 합산 (오늘 출석 완료 시 streak 기반 추정)
  IF _att_today THEN
    _today_earned := _today_earned + LEAST(100 + (_streak - 1) * 100, 1500);
  END IF;

  SELECT
    bool_or(kind = 'mission_play'),
    bool_or(kind = 'mission_invite'),
    bool_or(kind = 'mission_deposit'),
    bool_or(kind = 'play_today'),
    COALESCE(array_agg(kind) FILTER (WHERE kind LIKE 'share_%'), ARRAY[]::text[])
  INTO _mission_play, _mission_invite, _mission_deposit, _play_today_done, _share_channels
  FROM public.daily_quick_claims
  WHERE user_id = _uid AND day = _today;

  RETURN jsonb_build_object(
    'ok', true,
    'today_earned', _today_earned,
    'streak', jsonb_build_object(
      'days', COALESCE(_streak, 0),
      'claimed_today', _att_today,
      'next_reward', LEAST(100 + COALESCE(_streak, 0) * 100, 1500)
    ),
    'missions', jsonb_build_object(
      'play',    jsonb_build_object('claimed', COALESCE(_mission_play, false),    'amount', 100),
      'invite',  jsonb_build_object('claimed', COALESCE(_mission_invite, false),  'amount', 150),
      'deposit', jsonb_build_object('claimed', COALESCE(_mission_deposit, false), 'amount', 300)
    ),
    'play_today', jsonb_build_object(
      'claimed', COALESCE(_play_today_done, false), 'amount', 80
    ),
    'share_today', jsonb_build_object(
      'channels', COALESCE(_share_channels, ARRAY[]::text[]),
      'amount_each', 200
    ),
    'referral', jsonb_build_object(
      'code', COALESCE(_ref_code, ''),
      'invited', COALESCE(_ref_count, 0),
      'earned_total', COALESCE(_ref_total, 0)
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_earn_hub_state() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_earn_hub_state() TO authenticated;
