
CREATE TABLE IF NOT EXISTS public.reactivation_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  title text NOT NULL,
  body text NOT NULL,
  cta_label text NOT NULL DEFAULT '복귀 보너스 받기',
  dormant_days int NOT NULL CHECK (dormant_days BETWEEN 1 AND 365),
  phon_bonus bigint NOT NULL DEFAULT 0 CHECK (phon_bonus >= 0),
  expires_after_hours int NOT NULL DEFAULT 24 CHECK (expires_after_hours BETWEEN 1 AND 720),
  channels text[] NOT NULL DEFAULT ARRAY['push','email','inapp']::text[],
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.reactivation_campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "campaigns admin manage" ON public.reactivation_campaigns;
CREATE POLICY "campaigns admin manage" ON public.reactivation_campaigns FOR ALL
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "campaigns authenticated read active" ON public.reactivation_campaigns;
CREATE POLICY "campaigns authenticated read active" ON public.reactivation_campaigns FOR SELECT
  TO authenticated USING (active = true);

CREATE TABLE IF NOT EXISTS public.reactivation_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  campaign_id uuid NOT NULL REFERENCES public.reactivation_campaigns(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('push','email','inapp')),
  expires_at timestamptz NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  opened_at timestamptz,
  clicked_at timestamptz,
  claimed_at timestamptz,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (user_id, campaign_id)
);
CREATE INDEX IF NOT EXISTS idx_reactivation_sends_user ON public.reactivation_sends(user_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_reactivation_sends_campaign ON public.reactivation_sends(campaign_id, sent_at DESC);
ALTER TABLE public.reactivation_sends ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sends self read" ON public.reactivation_sends;
CREATE POLICY "sends self read" ON public.reactivation_sends FOR SELECT
  TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.reactivation_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  campaign_id uuid NOT NULL REFERENCES public.reactivation_campaigns(id) ON DELETE CASCADE,
  send_id uuid REFERENCES public.reactivation_sends(id) ON DELETE SET NULL,
  phon_credited bigint NOT NULL DEFAULT 0,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, campaign_id)
);
ALTER TABLE public.reactivation_claims ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "claims self read" ON public.reactivation_claims;
CREATE POLICY "claims self read" ON public.reactivation_claims FOR SELECT
  TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.enqueue_reactivation_for_campaign(_campaign_id uuid, _max_users int DEFAULT 500)
RETURNS TABLE(enqueued_count int)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_camp public.reactivation_campaigns%ROWTYPE;
  v_count int := 0;
  v_has_push boolean;
  v_channel text;
  v_expires timestamptz;
  r record;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR auth.uid() IS NULL) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT * INTO v_camp FROM public.reactivation_campaigns WHERE id = _campaign_id AND active = true;
  IF v_camp.id IS NULL THEN RETURN QUERY SELECT 0; RETURN; END IF;
  v_expires := now() + make_interval(hours => v_camp.expires_after_hours);

  FOR r IN
    SELECT u.id AS user_id
    FROM auth.users u
    LEFT JOIN public.reactivation_sends s ON s.user_id = u.id AND s.campaign_id = v_camp.id
    WHERE s.id IS NULL
      AND u.last_sign_in_at IS NOT NULL
      AND u.last_sign_in_at < (now() - make_interval(days => v_camp.dormant_days))
      AND u.last_sign_in_at > (now() - make_interval(days => v_camp.dormant_days + 30))
      AND u.deleted_at IS NULL
    LIMIT _max_users
  LOOP
    SELECT EXISTS(SELECT 1 FROM public.push_subscriptions WHERE user_id = r.user_id) INTO v_has_push;
    IF v_has_push AND 'push' = ANY(v_camp.channels) THEN v_channel := 'push';
    ELSIF 'email' = ANY(v_camp.channels) THEN v_channel := 'email';
    ELSE v_channel := 'inapp';
    END IF;
    INSERT INTO public.reactivation_sends(user_id, campaign_id, channel, expires_at)
    VALUES (r.user_id, v_camp.id, v_channel, v_expires)
    ON CONFLICT (user_id, campaign_id) DO NOTHING;
    INSERT INTO public.notifications(user_id, kind, title, body, payload)
    VALUES (r.user_id, 'reactivation', v_camp.title, v_camp.body,
      jsonb_build_object('campaign_id', v_camp.id, 'phon_bonus', v_camp.phon_bonus, 'expires_at', v_expires));
    v_count := v_count + 1;
  END LOOP;
  RETURN QUERY SELECT v_count;
END; $$;
REVOKE ALL ON FUNCTION public.enqueue_reactivation_for_campaign(uuid, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enqueue_reactivation_for_campaign(uuid, int) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.run_reactivation_campaigns()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c record; total int := 0; per int; results jsonb := '[]'::jsonb;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR auth.uid() IS NULL) THEN RAISE EXCEPTION 'forbidden'; END IF;
  FOR c IN SELECT id, key FROM public.reactivation_campaigns WHERE active = true ORDER BY dormant_days LOOP
    SELECT enqueued_count INTO per FROM public.enqueue_reactivation_for_campaign(c.id, 1000);
    total := total + COALESCE(per,0);
    results := results || jsonb_build_object('campaign', c.key, 'enqueued', COALESCE(per,0));
  END LOOP;
  RETURN jsonb_build_object('total', total, 'campaigns', results, 'ran_at', now());
END; $$;
REVOKE ALL ON FUNCTION public.run_reactivation_campaigns() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.run_reactivation_campaigns() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_my_reactivation_offer()
RETURNS TABLE(send_id uuid, campaign_id uuid, campaign_key text, title text, body text, cta_label text, phon_bonus bigint, expires_at timestamptz, channel text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.id, c.id, c.key, c.title, c.body, c.cta_label, c.phon_bonus, s.expires_at, s.channel
  FROM public.reactivation_sends s
  JOIN public.reactivation_campaigns c ON c.id = s.campaign_id
  WHERE s.user_id = auth.uid() AND s.claimed_at IS NULL AND s.expires_at > now() AND c.active = true
  ORDER BY c.phon_bonus DESC, s.sent_at DESC LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.get_my_reactivation_offer() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_reactivation_offer() TO authenticated;

CREATE OR REPLACE FUNCTION public.claim_reactivation_offer(_send_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_send public.reactivation_sends%ROWTYPE;
  v_camp public.reactivation_campaigns%ROWTYPE;
  v_credit bigint;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;
  SELECT * INTO v_send FROM public.reactivation_sends WHERE id = _send_id AND user_id = v_uid FOR UPDATE;
  IF v_send.id IS NULL THEN RAISE EXCEPTION 'send_not_found'; END IF;
  IF v_send.claimed_at IS NOT NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'already_claimed'); END IF;
  IF v_send.expires_at <= now() THEN RETURN jsonb_build_object('ok', false, 'reason', 'expired'); END IF;
  SELECT * INTO v_camp FROM public.reactivation_campaigns WHERE id = v_send.campaign_id;
  v_credit := COALESCE(v_camp.phon_bonus, 0);
  UPDATE public.reactivation_sends SET clicked_at = COALESCE(clicked_at, now()), claimed_at = now() WHERE id = _send_id;
  INSERT INTO public.reactivation_claims(user_id, campaign_id, send_id, phon_credited)
  VALUES (v_uid, v_send.campaign_id, _send_id, v_credit)
  ON CONFLICT (user_id, campaign_id) DO NOTHING;
  IF v_credit > 0 THEN
    INSERT INTO public.phon_balances(user_id, balance) VALUES (v_uid, v_credit)
    ON CONFLICT (user_id) DO UPDATE SET balance = public.phon_balances.balance + EXCLUDED.balance, updated_at = now();
  END IF;
  RETURN jsonb_build_object('ok', true, 'phon_credited', v_credit, 'campaign_key', v_camp.key);
END; $$;
REVOKE ALL ON FUNCTION public.claim_reactivation_offer(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_reactivation_offer(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.mark_reactivation_event(_send_id uuid, _event text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  IF _event = 'open' THEN
    UPDATE public.reactivation_sends SET opened_at = COALESCE(opened_at, now()) WHERE id = _send_id AND user_id = auth.uid();
  ELSIF _event = 'click' THEN
    UPDATE public.reactivation_sends SET clicked_at = COALESCE(clicked_at, now()), opened_at = COALESCE(opened_at, now()) WHERE id = _send_id AND user_id = auth.uid();
  END IF;
END; $$;
REVOKE ALL ON FUNCTION public.mark_reactivation_event(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_reactivation_event(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_get_reactivation_funnel()
RETURNS TABLE(campaign_key text, title text, dormant_days int, phon_bonus bigint,
  sent_30d bigint, opened_30d bigint, clicked_30d bigint, claimed_30d bigint,
  open_rate numeric, click_rate numeric, claim_rate numeric, phon_credited_30d bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.key, c.title, c.dormant_days, c.phon_bonus,
    COUNT(s.id), COUNT(s.opened_at), COUNT(s.clicked_at), COUNT(s.claimed_at),
    CASE WHEN COUNT(s.id) > 0 THEN ROUND(COUNT(s.opened_at)::numeric * 100 / COUNT(s.id), 1) ELSE 0 END,
    CASE WHEN COUNT(s.id) > 0 THEN ROUND(COUNT(s.clicked_at)::numeric * 100 / COUNT(s.id), 1) ELSE 0 END,
    CASE WHEN COUNT(s.id) > 0 THEN ROUND(COUNT(s.claimed_at)::numeric * 100 / COUNT(s.id), 1) ELSE 0 END,
    COALESCE(SUM(cl.phon_credited), 0)
  FROM public.reactivation_campaigns c
  LEFT JOIN public.reactivation_sends s ON s.campaign_id = c.id AND s.sent_at > now() - interval '30 days'
  LEFT JOIN public.reactivation_claims cl ON cl.campaign_id = c.id AND cl.claimed_at > now() - interval '30 days'
  WHERE public.has_role(auth.uid(), 'admin')
  GROUP BY c.id, c.key, c.title, c.dormant_days, c.phon_bonus
  ORDER BY c.dormant_days;
$$;
REVOKE ALL ON FUNCTION public.admin_get_reactivation_funnel() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_reactivation_funnel() TO authenticated, service_role;

INSERT INTO public.function_permissions_baseline(function_name, function_args, allowed_roles, category, note) VALUES
  ('enqueue_reactivation_for_campaign', 'uuid, integer',                ARRAY['authenticated','service_role'], 'reactivation', 'admin/cron only via internal guard'),
  ('run_reactivation_campaigns',        '',                             ARRAY['authenticated','service_role'], 'reactivation', 'admin/cron only via internal guard'),
  ('get_my_reactivation_offer',         '',                             ARRAY['authenticated'],                'reactivation', 'returns auth.uid() pending offer'),
  ('claim_reactivation_offer',          'uuid',                         ARRAY['authenticated'],                'reactivation', 'idempotent PHON credit'),
  ('mark_reactivation_event',           'uuid, text',                   ARRAY['authenticated'],                'reactivation', 'open/click tracking'),
  ('admin_get_reactivation_funnel',     '',                             ARRAY['authenticated','service_role'], 'reactivation', 'admin-only via has_role guard')
ON CONFLICT (function_name, function_args) DO UPDATE
  SET allowed_roles = EXCLUDED.allowed_roles, category = EXCLUDED.category, note = EXCLUDED.note, updated_at = now();

INSERT INTO public.reactivation_campaigns(key, title, body, cta_label, dormant_days, phon_bonus, expires_after_hours, channels, active) VALUES
  ('comeback_3d',  '👑 황제께서 자리를 비우셨습니다',     '24시간 내 복귀 시 +200 PHON 즉시 지급. 제국이 당신을 기다립니다.', '복귀 보너스 +200',  3,  200, 24, ARRAY['push','email','inapp'], true),
  ('comeback_7d',  '🔥 7일째 자리를 비우셨습니다',        '복귀 보너스 +500 PHON. Whale들이 당신의 자리를 노리고 있습니다.',  '복귀 보너스 +500',  7,  500, 48, ARRAY['push','email','inapp'], true),
  ('comeback_14d', '⚡ 마지막 호출 — 황제 자리 회수 직전',  '14일째 휴면. +1500 PHON 복귀 보너스 + Empire Booster 24h.',         '복귀 보너스 +1500', 14, 1500, 72, ARRAY['push','email','inapp'], true)
ON CONFLICT (key) DO NOTHING;
