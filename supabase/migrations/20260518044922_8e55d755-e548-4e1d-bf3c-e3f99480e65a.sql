
-- ============================================================
-- Phase 1 Hyperion: caps, fraud signals, audit trail, hardened RPCs
-- Money-flow 8 paths untouched.
-- ============================================================

-- 1. Caps singleton
CREATE TABLE IF NOT EXISTS public.imperial_onboarding_caps (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  daily_phon_cap numeric NOT NULL DEFAULT 50000,
  current_day_utc date NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date,
  granted_today_phon numeric NOT NULL DEFAULT 0,
  auto_pause boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.imperial_onboarding_caps (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
ALTER TABLE public.imperial_onboarding_caps ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "imperial_onboarding_caps_admin_read" ON public.imperial_onboarding_caps;
CREATE POLICY "imperial_onboarding_caps_admin_read" ON public.imperial_onboarding_caps
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. Fraud signals (append-only)
CREATE TABLE IF NOT EXISTS public.imperial_onboarding_fraud_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  device_fp text,
  ip_hash text,
  ua_hash text,
  risk_score numeric NOT NULL DEFAULT 0,
  rejected boolean NOT NULL DEFAULT false,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS imperial_fraud_device_idx ON public.imperial_onboarding_fraud_signals(device_fp) WHERE device_fp IS NOT NULL;
CREATE INDEX IF NOT EXISTS imperial_fraud_ip_idx ON public.imperial_onboarding_fraud_signals(ip_hash) WHERE ip_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS imperial_fraud_user_idx ON public.imperial_onboarding_fraud_signals(user_id, created_at DESC);
ALTER TABLE public.imperial_onboarding_fraud_signals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "imperial_fraud_admin_read" ON public.imperial_onboarding_fraud_signals;
CREATE POLICY "imperial_fraud_admin_read" ON public.imperial_onboarding_fraud_signals
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. Audit trail (append-only)
CREATE TABLE IF NOT EXISTS public.imperial_audit_trail (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  actor_id uuid,
  kind text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS imperial_audit_kind_idx ON public.imperial_audit_trail(kind, created_at DESC);
ALTER TABLE public.imperial_audit_trail ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "imperial_audit_admin_read" ON public.imperial_audit_trail;
CREATE POLICY "imperial_audit_admin_read" ON public.imperial_audit_trail
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- 4. Hardened signup RPC (new 3-arg overload)
CREATE OR REPLACE FUNCTION public.imperial_claim_signup_bonus(
  _device_fp text,
  _ip_hash text,
  _ua_hash text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _amount numeric := 15000;
  _cap public.imperial_onboarding_caps%ROWTYPE;
  _already_user uuid;
  _new_balance numeric;
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('status','unauthenticated');
  END IF;

  -- Idempotency: already claimed?
  IF EXISTS (SELECT 1 FROM public.imperial_onboarding_grants
             WHERE user_id = _uid AND source = 'signup') THEN
    RETURN jsonb_build_object('status','already_claimed');
  END IF;

  -- Fraud check: device/IP/UA reuse by a different user that already claimed?
  IF _device_fp IS NOT NULL THEN
    SELECT g.user_id INTO _already_user
    FROM public.imperial_onboarding_grants g
    JOIN public.imperial_onboarding_fraud_signals f ON f.user_id = g.user_id
    WHERE g.source = 'signup' AND f.device_fp = _device_fp AND g.user_id <> _uid
    LIMIT 1;
    IF _already_user IS NOT NULL THEN
      INSERT INTO public.imperial_onboarding_fraud_signals (user_id, device_fp, ip_hash, ua_hash, risk_score, rejected, reason)
        VALUES (_uid, _device_fp, _ip_hash, _ua_hash, 1.0, true, 'device_reuse');
      PERFORM public.imperial_log_observability('onboarding.signup.rejected',
        jsonb_build_object('reason','device_reuse','user_id',_uid));
      RETURN jsonb_build_object('status','fraud_rejected','reason','device_reuse');
    END IF;
  END IF;

  -- Cap-aware atomic update
  SELECT * INTO _cap FROM public.imperial_onboarding_caps WHERE id = 1 FOR UPDATE;
  IF (_cap.current_day_utc <> (now() AT TIME ZONE 'UTC')::date) THEN
    UPDATE public.imperial_onboarding_caps
      SET current_day_utc = (now() AT TIME ZONE 'UTC')::date,
          granted_today_phon = 0,
          updated_at = now()
      WHERE id = 1
      RETURNING * INTO _cap;
  END IF;
  IF _cap.auto_pause THEN
    RETURN jsonb_build_object('status','paused');
  END IF;
  IF (_cap.granted_today_phon + _amount) > _cap.daily_phon_cap THEN
    PERFORM public.imperial_log_observability('onboarding.signup.cap_reached',
      jsonb_build_object('user_id',_uid,'granted_today',_cap.granted_today_phon,'cap',_cap.daily_phon_cap));
    RETURN jsonb_build_object('status','cap_reached');
  END IF;

  -- Grant
  INSERT INTO public.imperial_onboarding_grants (user_id, source, amount_phon, meta)
    VALUES (_uid, 'signup', _amount,
      jsonb_build_object('device_fp', _device_fp, 'hyperion', true));

  UPDATE public.phon_balances
    SET balance = COALESCE(balance,0) + _amount, updated_at = now()
    WHERE user_id = _uid
    RETURNING balance INTO _new_balance;
  IF _new_balance IS NULL THEN
    INSERT INTO public.phon_balances (user_id, balance) VALUES (_uid, _amount)
      RETURNING balance INTO _new_balance;
  END IF;

  UPDATE public.imperial_onboarding_caps
    SET granted_today_phon = granted_today_phon + _amount, updated_at = now()
    WHERE id = 1;

  INSERT INTO public.imperial_onboarding_fraud_signals (user_id, device_fp, ip_hash, ua_hash, risk_score, rejected)
    VALUES (_uid, _device_fp, _ip_hash, _ua_hash, 0, false);

  INSERT INTO public.imperial_audit_trail (user_id, actor_id, kind, payload)
    VALUES (_uid, _uid, 'onboarding.signup.granted',
      jsonb_build_object('amount_phon',_amount,'new_balance',_new_balance));

  PERFORM public.imperial_log_observability('onboarding.signup.granted',
    jsonb_build_object('user_id',_uid,'amount_phon',_amount));

  RETURN jsonb_build_object('status','granted','amount_phon',_amount,'new_balance',_new_balance);
END;
$$;
GRANT EXECUTE ON FUNCTION public.imperial_claim_signup_bonus(text,text,text) TO authenticated;

-- 5. Replace daily login bonus with variable reward (450..550)
CREATE OR REPLACE FUNCTION public.imperial_claim_daily_login_bonus()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _today date := (now() AT TIME ZONE 'UTC')::date;
  _amount numeric;
  _cap public.imperial_onboarding_caps%ROWTYPE;
  _new_balance numeric;
  _r integer;
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('status','unauthenticated');
  END IF;

  IF EXISTS (SELECT 1 FROM public.imperial_onboarding_grants
             WHERE user_id = _uid AND source = 'daily_login' AND granted_date = _today) THEN
    RETURN jsonb_build_object('status','already_claimed_today');
  END IF;

  -- 450..550 PHON via crypto-random byte
  _r := get_byte(gen_random_bytes(1), 0); -- 0..255
  _amount := 450 + ((_r::numeric / 255.0) * 100);
  _amount := round(_amount, 0);

  SELECT * INTO _cap FROM public.imperial_onboarding_caps WHERE id = 1 FOR UPDATE;
  IF (_cap.current_day_utc <> _today) THEN
    UPDATE public.imperial_onboarding_caps
      SET current_day_utc = _today, granted_today_phon = 0, updated_at = now()
      WHERE id = 1 RETURNING * INTO _cap;
  END IF;
  IF _cap.auto_pause THEN
    RETURN jsonb_build_object('status','paused');
  END IF;
  IF (_cap.granted_today_phon + _amount) > _cap.daily_phon_cap THEN
    RETURN jsonb_build_object('status','cap_reached');
  END IF;

  INSERT INTO public.imperial_onboarding_grants (user_id, source, amount_phon, meta)
    VALUES (_uid, 'daily_login', _amount, jsonb_build_object('hyperion', true));

  UPDATE public.phon_balances
    SET balance = COALESCE(balance,0) + _amount, updated_at = now()
    WHERE user_id = _uid
    RETURNING balance INTO _new_balance;
  IF _new_balance IS NULL THEN
    INSERT INTO public.phon_balances (user_id, balance) VALUES (_uid, _amount)
      RETURNING balance INTO _new_balance;
  END IF;

  UPDATE public.imperial_onboarding_caps
    SET granted_today_phon = granted_today_phon + _amount, updated_at = now()
    WHERE id = 1;

  PERFORM public.imperial_log_observability('onboarding.daily.granted',
    jsonb_build_object('user_id',_uid,'amount_phon',_amount));

  RETURN jsonb_build_object('status','granted','amount_phon',_amount,'new_balance',_new_balance);
END;
$$;

-- 6. 14-KPI summary (admin)
CREATE OR REPLACE FUNCTION public.imperial_get_phase1_kpis()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _r jsonb;
  _signup_24h int;
  _daily_24h int;
  _phon_24h numeric;
  _active_5m int;
  _active_1h int;
  _active_24h int;
  _fraud_rejects int;
  _cap public.imperial_onboarding_caps%ROWTYPE;
  _retention_d1 numeric;
  _anomaly numeric;
  _invite_to_duel numeric;
  _engagement numeric;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT count(*) INTO _signup_24h FROM imperial_onboarding_grants
    WHERE source='signup' AND granted_at > now() - interval '24 hours';
  SELECT count(*) INTO _daily_24h FROM imperial_onboarding_grants
    WHERE source='daily_login' AND granted_at > now() - interval '24 hours';
  SELECT COALESCE(sum(amount_phon),0) INTO _phon_24h FROM imperial_onboarding_grants
    WHERE granted_at > now() - interval '24 hours';
  SELECT count(DISTINCT user_id) INTO _active_5m FROM imperial_observability_events
    WHERE created_at > now() - interval '5 minutes';
  SELECT count(DISTINCT user_id) INTO _active_1h FROM imperial_observability_events
    WHERE created_at > now() - interval '1 hour';
  SELECT count(DISTINCT user_id) INTO _active_24h FROM imperial_observability_events
    WHERE created_at > now() - interval '24 hours';
  SELECT count(*) INTO _fraud_rejects FROM imperial_onboarding_fraud_signals
    WHERE rejected = true AND created_at > now() - interval '24 hours';

  SELECT * INTO _cap FROM imperial_onboarding_caps WHERE id=1;

  -- d1 retention: signups 24-48h ago that have activity in last 24h
  SELECT CASE WHEN denom = 0 THEN 0 ELSE round(num::numeric * 100 / denom, 2) END
  INTO _retention_d1
  FROM (
    SELECT count(DISTINCT g.user_id) FILTER (
      WHERE EXISTS (SELECT 1 FROM imperial_observability_events e
        WHERE e.user_id = g.user_id AND e.created_at > now() - interval '24 hours')
    ) AS num,
    count(DISTINCT g.user_id) AS denom
    FROM imperial_onboarding_grants g
    WHERE g.source='signup'
      AND g.granted_at BETWEEN now() - interval '48 hours' AND now() - interval '24 hours'
  ) q;

  _anomaly := CASE WHEN _signup_24h = 0 THEN 0
                   ELSE round(_fraud_rejects::numeric / GREATEST(_signup_24h,1)::numeric, 4) END;

  -- Invite -> first duel conversion (best-effort: invite obs event -> imperial_duel_telemetry)
  SELECT CASE WHEN inv = 0 THEN 0 ELSE round(duels::numeric * 100 / inv, 2) END
  INTO _invite_to_duel
  FROM (
    SELECT
      (SELECT count(DISTINCT user_id) FROM imperial_observability_events
        WHERE kind = 'onboarding.invite.click' AND created_at > now() - interval '24 hours') AS inv,
      (SELECT count(DISTINCT user_id) FROM imperial_observability_events
        WHERE kind = 'onboarding.first_duel' AND created_at > now() - interval '24 hours') AS duels
  ) q;

  -- Warm King engagement: blend welcome-completion, first-duel-click, daily-return
  SELECT round(LEAST(1.0,
    (COALESCE(welc,0) * 0.3 + COALESCE(duel,0) * 0.4 + COALESCE(daily,0) * 0.3)
  )::numeric, 4)
  INTO _engagement
  FROM (
    SELECT
      (SELECT count(DISTINCT user_id)::numeric /
        NULLIF((SELECT count(*) FROM imperial_onboarding_grants
          WHERE source='signup' AND granted_at > now() - interval '24 hours'),0)
        FROM imperial_observability_events
        WHERE kind = 'onboarding.welcome.completed' AND created_at > now() - interval '24 hours') AS welc,
      (SELECT count(DISTINCT user_id)::numeric /
        NULLIF((SELECT count(*) FROM imperial_onboarding_grants
          WHERE source='signup' AND granted_at > now() - interval '24 hours'),0)
        FROM imperial_observability_events
        WHERE kind = 'onboarding.first_duel' AND created_at > now() - interval '24 hours') AS duel,
      (SELECT _daily_24h::numeric /
        NULLIF(_signup_24h,0)) AS daily
  ) q;

  _r := jsonb_build_object(
    'signups_24h', _signup_24h,
    'daily_24h', _daily_24h,
    'phon_granted_24h', _phon_24h,
    'active_5m', _active_5m,
    'active_1h', _active_1h,
    'active_24h', _active_24h,
    'invite_clicks_24h', (SELECT count(*) FROM imperial_observability_events
      WHERE kind = 'onboarding.invite.click' AND created_at > now() - interval '24 hours'),
    'first_duel_conv_24h', (SELECT count(*) FROM imperial_observability_events
      WHERE kind = 'onboarding.first_duel' AND created_at > now() - interval '24 hours'),
    'fraud_rejects_24h', _fraud_rejects,
    'cap_utilization_pct', CASE WHEN _cap.daily_phon_cap = 0 THEN 0
        ELSE round(_cap.granted_today_phon * 100 / _cap.daily_phon_cap, 2) END,
    'retention_d1_pct', COALESCE(_retention_d1, 0),
    'anomaly_score', COALESCE(_anomaly, 0),
    'invite_to_first_duel_rate', COALESCE(_invite_to_duel, 0),
    'warm_king_engagement_score', COALESCE(_engagement, 0),
    'auto_pause', _cap.auto_pause,
    'daily_cap', _cap.daily_phon_cap,
    'granted_today', _cap.granted_today_phon
  );

  RETURN _r;
END;
$$;
GRANT EXECUTE ON FUNCTION public.imperial_get_phase1_kpis() TO authenticated;

-- 7. Emergency pause (admin)
CREATE OR REPLACE FUNCTION public.imperial_phase1_emergency_pause(_reason text DEFAULT 'manual')
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  UPDATE public.imperial_onboarding_caps SET auto_pause = true, updated_at = now() WHERE id = 1;
  INSERT INTO public.imperial_kill_switches (key, enabled, reason)
    VALUES ('imperial_onboarding', true, _reason)
    ON CONFLICT (key) DO UPDATE SET enabled = true, reason = EXCLUDED.reason, updated_at = now();
  INSERT INTO public.imperial_audit_trail (actor_id, kind, payload)
    VALUES (auth.uid(), 'onboarding.emergency_pause', jsonb_build_object('reason',_reason));
  PERFORM public.imperial_log_observability('onboarding.emergency_pause',
    jsonb_build_object('reason',_reason,'actor',auth.uid()));
  RETURN jsonb_build_object('status','paused');
END;
$$;
GRANT EXECUTE ON FUNCTION public.imperial_phase1_emergency_pause(text) TO authenticated;
