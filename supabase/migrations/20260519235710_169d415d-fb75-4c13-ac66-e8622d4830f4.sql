
-- 1. apex_game_rolls 멱등키
ALTER TABLE public.apex_game_rolls
  ADD COLUMN IF NOT EXISTS idempotency_key text;
CREATE UNIQUE INDEX IF NOT EXISTS uq_apex_rolls_user_idem
  ON public.apex_game_rolls(user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- 2. apex_vault_claims
CREATE TABLE IF NOT EXISTS public.apex_vault_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  ymd date NOT NULL,
  reward_phon numeric NOT NULL DEFAULT 0,
  opened_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, ymd)
);
ALTER TABLE public.apex_vault_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "apex_vault_self_select" ON public.apex_vault_claims
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- 3. apex_kakao_shares
CREATE TABLE IF NOT EXISTS public.apex_kakao_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('kakao','band','twitter','web_share','referral')),
  ref_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_apex_shares_user_time
  ON public.apex_kakao_shares(user_id, created_at DESC);
ALTER TABLE public.apex_kakao_shares ENABLE ROW LEVEL SECURITY;
CREATE POLICY "apex_shares_self_select" ON public.apex_kakao_shares
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- 4. apex_daily_cap
CREATE TABLE IF NOT EXISTS public.apex_daily_cap (
  user_id uuid NOT NULL,
  ymd date NOT NULL,
  count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, ymd)
);
ALTER TABLE public.apex_daily_cap ENABLE ROW LEVEL SECURITY;
CREATE POLICY "apex_cap_self_select" ON public.apex_daily_cap
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- 5. RPC: my summary
CREATE OR REPLACE FUNCTION public.apex_get_my_summary()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  v_count int := 0;
  v_bet numeric := 0;
  v_pay numeric := 0;
  v_streak int := 0;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('error','unauthorized'); END IF;
  SELECT count(*), coalesce(sum(bet_phon+bet_usdt*1300),0), coalesce(sum(payout_phon+payout_usdt*1300),0)
    INTO v_count, v_bet, v_pay
  FROM public.apex_game_rolls
  WHERE user_id = uid AND created_at > now() - interval '24 hours';
  RETURN jsonb_build_object(
    'rolls_24h', v_count,
    'bet_phon_eq', v_bet,
    'payout_phon_eq', v_pay,
    'rtp_24h', CASE WHEN v_bet>0 THEN round(v_pay/v_bet*100,2) ELSE NULL END,
    'streak', v_streak
  );
END $$;
REVOKE ALL ON FUNCTION public.apex_get_my_summary() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apex_get_my_summary() TO authenticated;

-- 6. RPC: live bigwins (public)
CREATE OR REPLACE FUNCTION public.apex_get_live_bigwins(_limit int DEFAULT 20)
RETURNS TABLE(nick text, game_code text, multiplier numeric, payout_phon_eq numeric, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    CASE WHEN p.nickname IS NULL THEN '익명' 
         ELSE substr(p.nickname,1,1)||'***' END AS nick,
    r.game_code,
    r.multiplier,
    (r.payout_phon + r.payout_usdt*1300) AS payout_phon_eq,
    r.created_at
  FROM public.apex_game_rolls r
  LEFT JOIN public.profiles p ON p.id = r.user_id
  WHERE r.multiplier >= 5
    AND r.created_at > now() - interval '6 hours'
  ORDER BY r.created_at DESC
  LIMIT greatest(1, least(coalesce(_limit,20), 100));
$$;
REVOKE ALL ON FUNCTION public.apex_get_live_bigwins(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apex_get_live_bigwins(int) TO authenticated, anon;

-- 7. RPC: daily vault claim
CREATE OR REPLACE FUNCTION public.apex_claim_daily_vault()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  v_ymd date := (now() AT TIME ZONE 'Asia/Seoul')::date;
  v_reward numeric;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('error','unauthorized'); END IF;
  -- 100~750 PHON 랜덤
  v_reward := 100 + floor(random()*650);
  INSERT INTO public.apex_vault_claims(user_id, ymd, reward_phon)
    VALUES (uid, v_ymd, v_reward)
    ON CONFLICT (user_id, ymd) DO NOTHING;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error','already_claimed','ymd',v_ymd);
  END IF;
  -- PHON 적립 (기존 잔고 함수 사용 시도)
  BEGIN
    UPDATE public.phon_balances SET balance = balance + v_reward, updated_at = now()
    WHERE user_id = uid;
    IF NOT FOUND THEN
      INSERT INTO public.phon_balances(user_id, balance) VALUES (uid, v_reward);
    END IF;
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;
  RETURN jsonb_build_object('ok',true,'reward_phon',v_reward,'ymd',v_ymd);
END $$;
REVOKE ALL ON FUNCTION public.apex_claim_daily_vault() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apex_claim_daily_vault() TO authenticated;

-- 8. RPC: verify roll
CREATE OR REPLACE FUNCTION public.apex_verify_roll(_roll_id uuid, _client_seed text)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  r record;
BEGIN
  SELECT * INTO r FROM public.apex_game_rolls WHERE id = _roll_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('error','not_found'); END IF;
  RETURN jsonb_build_object(
    'ok', true,
    'roll_id', r.id,
    'game_code', r.game_code,
    'server_seed_hash', r.server_seed_hash,
    'client_seed_stored', r.client_seed,
    'client_seed_input', _client_seed,
    'nonce', r.nonce,
    'result', r.result_json,
    'multiplier', r.multiplier
  );
END $$;
REVOKE ALL ON FUNCTION public.apex_verify_roll(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apex_verify_roll(uuid,text) TO authenticated;

-- 9. RPC: kakao share log
CREATE OR REPLACE FUNCTION public.apex_log_kakao_share(_kind text, _ref_id text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  v_today_count int;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('error','unauthorized'); END IF;
  IF _kind NOT IN ('kakao','band','twitter','web_share','referral') THEN
    RETURN jsonb_build_object('error','invalid_kind');
  END IF;
  INSERT INTO public.apex_kakao_shares(user_id, kind, ref_id) VALUES (uid,_kind,_ref_id);
  SELECT count(*) INTO v_today_count FROM public.apex_kakao_shares
    WHERE user_id = uid AND created_at > (now() AT TIME ZONE 'Asia/Seoul')::date AT TIME ZONE 'Asia/Seoul';
  RETURN jsonb_build_object('ok',true,'today_count',v_today_count);
END $$;
REVOKE ALL ON FUNCTION public.apex_log_kakao_share(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apex_log_kakao_share(text,text) TO authenticated;
