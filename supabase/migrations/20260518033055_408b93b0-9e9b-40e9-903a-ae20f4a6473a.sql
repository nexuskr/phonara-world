
-- ============================================================
-- Phase 3.5 Hardening — Safety, Burn, NFT, Rollback, Rollout
-- ============================================================

-- 1) KILL SWITCHES ------------------------------------------------
CREATE TABLE IF NOT EXISTS public.imperial_kill_switches (
  key text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT false,
  reason text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
ALTER TABLE public.imperial_kill_switches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "imperial_kill_switches admin read"
  ON public.imperial_kill_switches FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));
-- Authenticated read is fine (clients need to know if frozen)
CREATE POLICY "imperial_kill_switches authed read"
  ON public.imperial_kill_switches FOR SELECT
  TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.imperial_kill_switch_audit (
  id bigserial PRIMARY KEY,
  key text NOT NULL,
  enabled boolean NOT NULL,
  reason text,
  actor uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.imperial_kill_switch_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "imperial_kill_switch_audit admin read"
  ON public.imperial_kill_switch_audit FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.imperial_kill_switches(key, enabled)
VALUES
  ('imperial_betting', false),
  ('imperial_flywheel', false),
  ('imperial_withdrawal', false),
  ('imperial_burn', false),
  ('imperial_nft_mint', false)
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.imperial_is_betting_allowed()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.imperial_kill_switches
    WHERE key = 'imperial_betting' AND enabled = true
  );
$$;

CREATE OR REPLACE FUNCTION public.admin_set_imperial_kill_switch(
  _key text, _enabled boolean, _reason text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  UPDATE public.imperial_kill_switches
     SET enabled = _enabled, reason = _reason,
         updated_at = now(), updated_by = auth.uid()
   WHERE key = _key;
  INSERT INTO public.imperial_kill_switch_audit(key, enabled, reason, actor)
  VALUES (_key, _enabled, _reason, auth.uid());
END;
$$;

CREATE OR REPLACE FUNCTION public.emergency_freeze_all(_reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE k text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  FOR k IN SELECT key FROM public.imperial_kill_switches LOOP
    UPDATE public.imperial_kill_switches
       SET enabled = true, reason = _reason,
           updated_at = now(), updated_by = auth.uid()
     WHERE key = k;
    INSERT INTO public.imperial_kill_switch_audit(key, enabled, reason, actor)
    VALUES (k, true, _reason, auth.uid());
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.emergency_unfreeze_all(_reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE k text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  FOR k IN SELECT key FROM public.imperial_kill_switches LOOP
    UPDATE public.imperial_kill_switches
       SET enabled = false, reason = _reason,
           updated_at = now(), updated_by = auth.uid()
     WHERE key = k;
    INSERT INTO public.imperial_kill_switch_audit(key, enabled, reason, actor)
    VALUES (k, false, _reason, auth.uid());
  END LOOP;
END;
$$;

-- 2) TOKEN BURN LEDGER + NFT --------------------------------------
DO $$ BEGIN
  CREATE TYPE public.imperial_burn_source AS ENUM ('house_edge','volatility','near_miss','manual');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.imperial_token_burns (
  id bigserial PRIMARY KEY,
  user_id uuid,
  source public.imperial_burn_source NOT NULL,
  base_amount numeric NOT NULL,
  burn_rate numeric NOT NULL,
  burn_amount numeric NOT NULL,
  ref_id text,
  ref_type text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source, ref_id, ref_type)
);
CREATE INDEX IF NOT EXISTS idx_imperial_token_burns_user_created
  ON public.imperial_token_burns (user_id, created_at DESC);
ALTER TABLE public.imperial_token_burns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "imperial_token_burns self read"
  ON public.imperial_token_burns FOR SELECT
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.imperial_user_nfts (
  user_id uuid PRIMARY KEY,
  tier smallint NOT NULL DEFAULT 0 CHECK (tier BETWEEN 0 AND 5),
  lifetime_burn numeric NOT NULL DEFAULT 0,
  last_upgraded_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.imperial_user_nfts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "imperial_user_nfts self read"
  ON public.imperial_user_nfts FOR SELECT
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.imperial_nft_audit (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL,
  from_tier smallint NOT NULL,
  to_tier smallint NOT NULL,
  lifetime_burn numeric NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.imperial_nft_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "imperial_nft_audit self read"
  ON public.imperial_nft_audit FOR SELECT
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Burn rate resolution
CREATE OR REPLACE FUNCTION public.imperial_get_burn_rate(
  _source public.imperial_burn_source,
  _tier text DEFAULT NULL,
  _meta jsonb DEFAULT '{}'::jsonb
) RETURNS numeric LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  base numeric := 0;
  vol  numeric := 0;
  nm   numeric;
BEGIN
  IF _source = 'house_edge' THEN
    base := 0.26;
    IF _tier IS NOT NULL THEN
      vol := CASE _tier
        WHEN 'calm'    THEN 0.008
        WHEN 'warm'    THEN 0.012
        WHEN 'hot'     THEN 0.018
        WHEN 'surge'   THEN 0.024
        WHEN 'extreme' THEN 0.032
        ELSE 0 END;
    END IF;
    RETURN base + vol;
  ELSIF _source = 'volatility' THEN
    RETURN CASE _tier
      WHEN 'calm'    THEN 0.008
      WHEN 'warm'    THEN 0.012
      WHEN 'hot'     THEN 0.018
      WHEN 'surge'   THEN 0.024
      WHEN 'extreme' THEN 0.032
      ELSE 0 END;
  ELSIF _source = 'near_miss' THEN
    -- 12..22% deterministic from ref hash if provided, else midpoint
    nm := COALESCE((_meta->>'rate')::numeric, 0.17);
    RETURN GREATEST(0.12, LEAST(0.22, nm));
  ELSE
    RETURN COALESCE((_meta->>'rate')::numeric, 0);
  END IF;
END;
$$;

-- NFT tier thresholds
CREATE OR REPLACE FUNCTION public.imperial_nft_tier_for(_lifetime numeric)
RETURNS smallint LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN _lifetime >= 25000000 THEN 5
    WHEN _lifetime >=  2500000 THEN 4
    WHEN _lifetime >=   250000 THEN 3
    WHEN _lifetime >=    25000 THEN 2
    WHEN _lifetime >=     1000 THEN 1
    ELSE 0 END::smallint
$$;

CREATE OR REPLACE FUNCTION public._maybe_upgrade_nft(_user uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  cur_tier smallint;
  new_tier smallint;
  total    numeric;
  killed   boolean;
BEGIN
  SELECT enabled INTO killed FROM public.imperial_kill_switches WHERE key='imperial_nft_mint';
  IF COALESCE(killed,false) THEN RETURN; END IF;

  SELECT COALESCE(SUM(burn_amount),0) INTO total
    FROM public.imperial_token_burns WHERE user_id = _user;

  INSERT INTO public.imperial_user_nfts(user_id, tier, lifetime_burn)
  VALUES (_user, 0, total)
  ON CONFLICT (user_id) DO UPDATE SET lifetime_burn = EXCLUDED.lifetime_burn, updated_at = now();

  SELECT tier INTO cur_tier FROM public.imperial_user_nfts WHERE user_id = _user;
  new_tier := public.imperial_nft_tier_for(total);

  IF new_tier > COALESCE(cur_tier,0) THEN
    UPDATE public.imperial_user_nfts
       SET tier = new_tier, last_upgraded_at = now(), updated_at = now()
     WHERE user_id = _user;
    INSERT INTO public.imperial_nft_audit(user_id, from_tier, to_tier, lifetime_burn, reason)
    VALUES (_user, COALESCE(cur_tier,0), new_tier, total, 'auto_upgrade');
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_token_burn(
  _user uuid,
  _source public.imperial_burn_source,
  _base numeric,
  _ref_id text,
  _ref_type text,
  _tier text DEFAULT NULL,
  _meta jsonb DEFAULT '{}'::jsonb
) RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  killed boolean;
  rate numeric;
  amt  numeric;
BEGIN
  SELECT enabled INTO killed FROM public.imperial_kill_switches WHERE key='imperial_burn';
  IF COALESCE(killed,false) THEN RETURN 0; END IF;
  IF _base IS NULL OR _base <= 0 THEN RETURN 0; END IF;

  rate := public.imperial_get_burn_rate(_source, _tier, _meta);
  amt  := round((_base * rate)::numeric, 6);

  INSERT INTO public.imperial_token_burns(user_id, source, base_amount, burn_rate, burn_amount, ref_id, ref_type, meta)
  VALUES (_user, _source, _base, rate, amt, _ref_id, _ref_type, COALESCE(_meta,'{}'::jsonb))
  ON CONFLICT (source, ref_id, ref_type) DO NOTHING;

  IF FOUND AND _user IS NOT NULL THEN
    PERFORM public._maybe_upgrade_nft(_user);
  END IF;
  RETURN amt;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_burn_leaderboard(_limit int DEFAULT 20)
RETURNS TABLE(rank int, user_id uuid, lifetime_burn numeric, tier smallint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT (row_number() OVER (ORDER BY lifetime_burn DESC))::int AS rank,
         user_id, lifetime_burn, tier
    FROM public.imperial_user_nfts
   WHERE lifetime_burn > 0
   ORDER BY lifetime_burn DESC
   LIMIT GREATEST(1, LEAST(_limit, 100));
$$;

CREATE OR REPLACE FUNCTION public.admin_get_burn_distribution(_hours int DEFAULT 24)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'window_hours', _hours,
    'total_burn', COALESCE((SELECT SUM(burn_amount) FROM public.imperial_token_burns
                              WHERE created_at > now() - make_interval(hours => _hours)),0),
    'by_source', COALESCE((SELECT jsonb_object_agg(source::text, s)
                             FROM (SELECT source, SUM(burn_amount) s FROM public.imperial_token_burns
                                    WHERE created_at > now() - make_interval(hours => _hours)
                                    GROUP BY source) x),'{}'::jsonb),
    'tier_distribution', COALESCE((SELECT jsonb_object_agg(tier::text, c)
                             FROM (SELECT tier, count(*) c FROM public.imperial_user_nfts
                                    GROUP BY tier) y),'{}'::jsonb)
  )
  WHERE public.has_role(auth.uid(), 'admin');
$$;

-- 3) ROLLBACK SYSTEM ----------------------------------------------
CREATE TABLE IF NOT EXISTS public.imperial_rollback_snapshots (
  id bigserial PRIMARY KEY,
  event_id uuid NOT NULL,
  pre jsonb NOT NULL,
  post jsonb,
  reason text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.imperial_rollback_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "imperial_rollback_snapshots admin read"
  ON public.imperial_rollback_snapshots FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.imperial_injection_events
  ADD COLUMN IF NOT EXISTS rolled_back_at timestamptz,
  ADD COLUMN IF NOT EXISTS rolled_back_by uuid;

CREATE OR REPLACE FUNCTION public.rollback_injection_event(_event_id uuid, _reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  ev record;
  pre jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT * INTO ev FROM public.imperial_injection_events WHERE id::text = _event_id::text FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'event_not_found'; END IF;
  IF ev.rolled_back_at IS NOT NULL THEN RAISE EXCEPTION 'already_rolled_back'; END IF;

  pre := to_jsonb(ev);
  -- Reversal ledger entry (append-only). Kind explicitly 'injection_in_out' with negative amount.
  INSERT INTO public.imperial_treasury_ledger(kind, amount, ref_id, ref_type, meta)
  VALUES ('injection_in_out', - COALESCE(ev.amount_in,0),
          _event_id::text, 'rollback',
          jsonb_build_object('original_event_id', _event_id, 'reason', _reason, 'actor', auth.uid()));

  UPDATE public.imperial_injection_events
     SET rolled_back_at = now(), rolled_back_by = auth.uid()
   WHERE id = ev.id;

  INSERT INTO public.imperial_rollback_snapshots(event_id, pre, post, reason, created_by)
  VALUES (_event_id, pre, to_jsonb((SELECT e FROM public.imperial_injection_events e WHERE e.id = ev.id)),
          _reason, auth.uid());

  RETURN jsonb_build_object('ok', true, 'event_id', _event_id);
END;
$$;

-- 4) ROLLOUT GUARDRAILS -------------------------------------------
CREATE TABLE IF NOT EXISTS public.imperial_rollout_tiers (
  user_id uuid PRIMARY KEY,
  tier smallint NOT NULL DEFAULT 0 CHECK (tier BETWEEN 0 AND 3),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
ALTER TABLE public.imperial_rollout_tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "imperial_rollout_tiers self read"
  ON public.imperial_rollout_tiers FOR SELECT
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.imperial_rollout_consents (
  user_id uuid PRIMARY KEY,
  consented_at timestamptz NOT NULL DEFAULT now(),
  version text NOT NULL DEFAULT 'v1'
);
ALTER TABLE public.imperial_rollout_consents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "imperial_rollout_consents self read"
  ON public.imperial_rollout_consents FOR SELECT
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "imperial_rollout_consents self insert"
  ON public.imperial_rollout_consents FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.imperial_can_participate(_user uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  tier smallint;
  consented boolean;
  betting_allowed boolean;
BEGIN
  SELECT COALESCE(tier,0) INTO tier FROM public.imperial_rollout_tiers WHERE user_id = _user;
  tier := COALESCE(tier, 0);
  SELECT (EXISTS(SELECT 1 FROM public.imperial_rollout_consents WHERE user_id = _user)) INTO consented;
  SELECT public.imperial_is_betting_allowed() INTO betting_allowed;
  RETURN jsonb_build_object(
    'tier', tier,
    'consented', consented,
    'betting_allowed', betting_allowed,
    'can_play', (tier > 0 AND consented AND betting_allowed),
    'daily_cap_phon', CASE tier WHEN 0 THEN 0 WHEN 1 THEN 50000 WHEN 2 THEN 250000 ELSE NULL END
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_rollout_tier(_user uuid, _tier smallint)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  INSERT INTO public.imperial_rollout_tiers(user_id, tier, updated_by)
  VALUES (_user, _tier, auth.uid())
  ON CONFLICT (user_id) DO UPDATE SET tier = _tier, updated_at = now(), updated_by = auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION public.imperial_record_consent()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.imperial_rollout_consents(user_id) VALUES (auth.uid())
  ON CONFLICT (user_id) DO NOTHING;
$$;
