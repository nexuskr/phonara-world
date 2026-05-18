
-- IMPERIAL-SINGULARITY v3.5: Deflationary Flywheel Core

-- 1) Ledger of all flywheel money movements (admin-only)
CREATE TABLE IF NOT EXISTS public.imperial_treasury_ledger (
  id          bigserial PRIMARY KEY,
  ts          timestamptz NOT NULL DEFAULT now(),
  source      text NOT NULL,            -- 'house_edge_split' | 'injection' | 'manual'
  kind        text NOT NULL CHECK (kind IN ('burn','treasury','reward','liquidity','injection_out','injection_in')),
  phon_delta  numeric NOT NULL,
  balance_after numeric,
  ref_id      text,
  meta        jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_treasury_ledger_ts ON public.imperial_treasury_ledger(ts DESC);
CREATE INDEX IF NOT EXISTS idx_treasury_ledger_kind_ts ON public.imperial_treasury_ledger(kind, ts DESC);
ALTER TABLE public.imperial_treasury_ledger ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS treasury_ledger_admin_read ON public.imperial_treasury_ledger;
CREATE POLICY treasury_ledger_admin_read ON public.imperial_treasury_ledger
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 2) Singleton emission state
CREATE TABLE IF NOT EXISTS public.imperial_emission_state (
  id            int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  circulating_phon numeric NOT NULL DEFAULT 0,
  target_phon      numeric NOT NULL DEFAULT 1,
  scale_factor     numeric NOT NULL DEFAULT 1.0,
  updated_at       timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.imperial_emission_state(id) VALUES (1) ON CONFLICT DO NOTHING;
ALTER TABLE public.imperial_emission_state ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS emission_state_admin_read ON public.imperial_emission_state;
CREATE POLICY emission_state_admin_read ON public.imperial_emission_state
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 3) Volatility window buckets (30-min rolling, exactly 5 tiers)
CREATE TABLE IF NOT EXISTS public.imperial_volatility_window (
  bucket_start timestamptz PRIMARY KEY,
  vol_score    numeric NOT NULL DEFAULT 0,
  tier         text NOT NULL CHECK (tier IN ('calm','warm','hot','surge','extreme')),
  sample_n     int NOT NULL DEFAULT 0
);
ALTER TABLE public.imperial_volatility_window ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS volatility_window_admin_read ON public.imperial_volatility_window;
CREATE POLICY volatility_window_admin_read ON public.imperial_volatility_window
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 4) Injection events
CREATE TABLE IF NOT EXISTS public.imperial_injection_events (
  id               bigserial PRIMARY KEY,
  ts               timestamptz NOT NULL DEFAULT now(),
  trigger_vol_score numeric,
  trigger_tier     text,
  amount_in        numeric NOT NULL,
  amount_out       numeric NOT NULL DEFAULT 0,
  excess_return    numeric NOT NULL DEFAULT 0,
  reason           text NOT NULL,
  meta             jsonb NOT NULL DEFAULT '{}'::jsonb
);
ALTER TABLE public.imperial_injection_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS injection_events_admin_read ON public.imperial_injection_events;
CREATE POLICY injection_events_admin_read ON public.imperial_injection_events
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 5) Hot-reloadable params with immutable history
CREATE TABLE IF NOT EXISTS public.imperial_flywheel_params (
  key        text PRIMARY KEY,
  value      jsonb NOT NULL,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.imperial_flywheel_params ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS flywheel_params_admin_read ON public.imperial_flywheel_params;
CREATE POLICY flywheel_params_admin_read ON public.imperial_flywheel_params
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.imperial_flywheel_params_audit (
  id         bigserial PRIMARY KEY,
  ts         timestamptz NOT NULL DEFAULT now(),
  key        text NOT NULL,
  old_value  jsonb,
  new_value  jsonb NOT NULL,
  updated_by uuid
);
ALTER TABLE public.imperial_flywheel_params_audit ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS flywheel_params_audit_admin_read ON public.imperial_flywheel_params_audit;
CREATE POLICY flywheel_params_audit_admin_read ON public.imperial_flywheel_params_audit
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Seed default params
INSERT INTO public.imperial_flywheel_params(key, value) VALUES
  ('split',                '{"burn":0.45,"treasury":0.35,"reward":0.15,"liquidity":0.05}'::jsonb),
  ('slippage',             '{"exponent":1.75,"scale":1.85,"cap":0.42}'::jsonb),
  ('emission_scale_bounds','{"min":0.4,"max":1.6}'::jsonb),
  ('volatility_tiers',     '{"calm":1.0,"warm":1.08,"hot":1.18,"surge":1.30,"extreme":1.45}'::jsonb),
  ('injection',            '{"min_reserve":50000,"max_amount":200000,"trigger_tiers":["surge","extreme"]}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 6) Kill switches (default OFF = inactive)
INSERT INTO public.platform_kill_switches(key, enabled, reason) VALUES
  ('flywheel_burn',           false, 'Phase 3.5 default OFF'),
  ('flywheel_injection',      false, 'Phase 3.5 default OFF'),
  ('flywheel_emission_scale', false, 'Phase 3.5 default OFF')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- RPCs
-- ============================================================

-- Atomic 45/35/15/5 split: single transaction, four ledger inserts, idempotent via ref_id
CREATE OR REPLACE FUNCTION public._apply_house_edge_split(_total_phon numeric, _ref_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_split jsonb;
  v_burn numeric; v_treasury numeric; v_reward numeric; v_liquidity numeric;
  v_kill boolean;
BEGIN
  IF _total_phon IS NULL OR _total_phon <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason','non_positive');
  END IF;

  -- Idempotency: if any ledger rows exist for this ref_id, return without re-applying.
  IF EXISTS (SELECT 1 FROM public.imperial_treasury_ledger WHERE ref_id = _ref_id) THEN
    RETURN jsonb_build_object('ok', true, 'idempotent', true, 'ref_id', _ref_id);
  END IF;

  -- Kill switch: when burn is killed, route 100% to treasury as a fallback (still atomic + logged).
  SELECT enabled INTO v_kill FROM public.platform_kill_switches WHERE key='flywheel_burn';
  v_kill := COALESCE(v_kill, false);

  SELECT value INTO v_split FROM public.imperial_flywheel_params WHERE key='split';
  IF v_split IS NULL THEN
    v_split := '{"burn":0.45,"treasury":0.35,"reward":0.15,"liquidity":0.05}'::jsonb;
  END IF;

  v_burn      := round((_total_phon * (v_split->>'burn')::numeric)::numeric, 6);
  v_treasury  := round((_total_phon * (v_split->>'treasury')::numeric)::numeric, 6);
  v_reward    := round((_total_phon * (v_split->>'reward')::numeric)::numeric, 6);
  -- Liquidity absorbs rounding drift so the four legs sum to exactly _total_phon
  v_liquidity := _total_phon - v_burn - v_treasury - v_reward;

  IF v_kill THEN
    v_treasury := v_treasury + v_burn;
    v_burn := 0;
  END IF;

  -- Four ledger inserts in one statement => single transaction.
  INSERT INTO public.imperial_treasury_ledger(source, kind, phon_delta, ref_id, meta) VALUES
    ('house_edge_split','burn',      v_burn,      _ref_id, jsonb_build_object('total', _total_phon)),
    ('house_edge_split','treasury',  v_treasury,  _ref_id, jsonb_build_object('total', _total_phon)),
    ('house_edge_split','reward',    v_reward,    _ref_id, jsonb_build_object('total', _total_phon)),
    ('house_edge_split','liquidity', v_liquidity, _ref_id, jsonb_build_object('total', _total_phon));

  RETURN jsonb_build_object(
    'ok', true,
    'burn', v_burn, 'treasury', v_treasury,
    'reward', v_reward, 'liquidity', v_liquidity,
    'killed_burn', v_kill
  );
END;
$$;
REVOKE ALL ON FUNCTION public._apply_house_edge_split(numeric, text) FROM PUBLIC;

-- Emission scale: clamp(target/circulating, min, max). Kill switch holds scale at 1.0.
CREATE OR REPLACE FUNCTION public._recompute_emission_scale()
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_circ numeric; v_target numeric; v_scale numeric; v_lo numeric; v_hi numeric;
  v_kill boolean; v_bounds jsonb;
BEGIN
  SELECT enabled INTO v_kill FROM public.platform_kill_switches WHERE key='flywheel_emission_scale';
  v_kill := COALESCE(v_kill, false);

  SELECT value INTO v_bounds FROM public.imperial_flywheel_params WHERE key='emission_scale_bounds';
  v_lo := COALESCE((v_bounds->>'min')::numeric, 0.4);
  v_hi := COALESCE((v_bounds->>'max')::numeric, 1.6);

  -- circulating = sum of phon_balances (cheap; falls back to 0)
  SELECT COALESCE(SUM(balance), 0) INTO v_circ FROM public.phon_balances;
  -- target = current target row, default 1
  SELECT GREATEST(1, target_phon) INTO v_target FROM public.imperial_emission_state WHERE id=1;

  v_scale := CASE WHEN v_circ <= 0 THEN 1.0 ELSE LEAST(v_hi, GREATEST(v_lo, v_target / v_circ)) END;
  IF v_kill THEN v_scale := 1.0; END IF;

  UPDATE public.imperial_emission_state
     SET circulating_phon = v_circ, scale_factor = v_scale, updated_at = now()
   WHERE id=1;
  RETURN v_scale;
END;
$$;
REVOKE ALL ON FUNCTION public._recompute_emission_scale() FROM PUBLIC;

-- Volatility tier from last-30-min bet variance (5 tiers: calm/warm/hot/surge/extreme)
CREATE OR REPLACE FUNCTION public._recompute_volatility_tier()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bucket timestamptz := date_trunc('minute', now()) - (extract(minute from now())::int % 30) * interval '1 minute';
  v_n int; v_var numeric; v_tier text;
BEGIN
  SELECT count(*)::int, COALESCE(variance(phon_delta),0)
    INTO v_n, v_var
    FROM public.imperial_treasury_ledger
   WHERE ts > now() - interval '30 minutes'
     AND kind = 'treasury';

  v_tier := CASE
    WHEN v_n < 5 THEN 'calm'
    WHEN v_var < 100         THEN 'calm'
    WHEN v_var < 1000        THEN 'warm'
    WHEN v_var < 10000       THEN 'hot'
    WHEN v_var < 100000      THEN 'surge'
    ELSE 'extreme'
  END;

  INSERT INTO public.imperial_volatility_window(bucket_start, vol_score, tier, sample_n)
  VALUES (v_bucket, v_var, v_tier, v_n)
  ON CONFLICT (bucket_start)
  DO UPDATE SET vol_score = EXCLUDED.vol_score, tier = EXCLUDED.tier, sample_n = EXCLUDED.sample_n;

  RETURN v_tier;
END;
$$;
REVOKE ALL ON FUNCTION public._recompute_volatility_tier() FROM PUBLIC;

-- Liquidity injection (admin or cron). AAL2 enforced on admin-callable wrapper below.
CREATE OR REPLACE FUNCTION public._do_inject_liquidity(_amount numeric, _reason text, _vol_score numeric, _tier text)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id bigint;
  v_kill boolean;
  v_treasury numeric;
  v_params jsonb;
  v_min_reserve numeric;
  v_max_amount numeric;
  v_amount numeric;
BEGIN
  SELECT enabled INTO v_kill FROM public.platform_kill_switches WHERE key='flywheel_injection';
  v_kill := COALESCE(v_kill, false);
  IF v_kill THEN
    RAISE EXCEPTION 'flywheel_injection_disabled';
  END IF;

  SELECT value INTO v_params FROM public.imperial_flywheel_params WHERE key='injection';
  v_min_reserve := COALESCE((v_params->>'min_reserve')::numeric, 50000);
  v_max_amount  := COALESCE((v_params->>'max_amount')::numeric, 200000);
  v_amount := LEAST(_amount, v_max_amount);

  SELECT COALESCE(SUM(phon_delta), 0) INTO v_treasury
    FROM public.imperial_treasury_ledger WHERE kind='treasury';

  IF v_treasury - v_amount < v_min_reserve THEN
    RAISE EXCEPTION 'treasury_below_min_reserve';
  END IF;

  INSERT INTO public.imperial_injection_events(trigger_vol_score, trigger_tier, amount_in, reason)
  VALUES (_vol_score, _tier, v_amount, _reason)
  RETURNING id INTO v_id;

  -- Atomic ledger pair: treasury -> liquidity
  INSERT INTO public.imperial_treasury_ledger(source, kind, phon_delta, ref_id, meta) VALUES
    ('injection','injection_out', -v_amount, 'inj:'||v_id, jsonb_build_object('tier', _tier)),
    ('injection','injection_in',   v_amount, 'inj:'||v_id, jsonb_build_object('tier', _tier));

  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public._do_inject_liquidity(numeric, text, numeric, text) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.maybe_inject_liquidity()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tier text; v_score numeric; v_params jsonb; v_triggers text[]; v_id bigint;
BEGIN
  SELECT tier, vol_score INTO v_tier, v_score
    FROM public.imperial_volatility_window
   ORDER BY bucket_start DESC LIMIT 1;
  IF v_tier IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason','no_data'); END IF;

  SELECT value INTO v_params FROM public.imperial_flywheel_params WHERE key='injection';
  v_triggers := ARRAY(SELECT jsonb_array_elements_text(v_params->'trigger_tiers'));
  IF NOT (v_tier = ANY(v_triggers)) THEN
    RETURN jsonb_build_object('ok', true, 'skipped', true, 'tier', v_tier);
  END IF;

  BEGIN
    v_id := public._do_inject_liquidity(
      LEAST(50000, COALESCE((v_params->>'max_amount')::numeric, 200000)),
      'auto:'||v_tier, v_score, v_tier
    );
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('ok', false, 'error', SQLERRM);
  END;

  RETURN jsonb_build_object('ok', true, 'injection_id', v_id, 'tier', v_tier);
END;
$$;
REVOKE ALL ON FUNCTION public.maybe_inject_liquidity() FROM PUBLIC;

-- Public read snapshot (safe, redacted)
CREATE OR REPLACE FUNCTION public.get_flywheel_snapshot()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'tier', COALESCE((SELECT tier FROM public.imperial_volatility_window ORDER BY bucket_start DESC LIMIT 1), 'calm'),
    'scale_factor', COALESCE((SELECT scale_factor FROM public.imperial_emission_state WHERE id=1), 1.0),
    'last_injection_at', (SELECT max(ts) FROM public.imperial_injection_events),
    'updated_at', now()
  );
$$;
GRANT EXECUTE ON FUNCTION public.get_flywheel_snapshot() TO anon, authenticated;

-- Admin health (24h aggregates)
CREATE OR REPLACE FUNCTION public.admin_get_flywheel_health(_hours int DEFAULT 24)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_since timestamptz := now() - make_interval(hours => GREATEST(1, _hours));
  v jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT jsonb_build_object(
    'window_hours', _hours,
    'burn_total',      COALESCE((SELECT SUM(phon_delta) FROM public.imperial_treasury_ledger WHERE kind='burn'     AND ts > v_since), 0),
    'treasury_total',  COALESCE((SELECT SUM(phon_delta) FROM public.imperial_treasury_ledger WHERE kind='treasury' AND ts > v_since), 0),
    'reward_total',    COALESCE((SELECT SUM(phon_delta) FROM public.imperial_treasury_ledger WHERE kind='reward'   AND ts > v_since), 0),
    'liquidity_total', COALESCE((SELECT SUM(phon_delta) FROM public.imperial_treasury_ledger WHERE kind='liquidity' AND ts > v_since), 0),
    'treasury_balance',COALESCE((SELECT SUM(phon_delta) FROM public.imperial_treasury_ledger WHERE kind='treasury'),0),
    'liquidity_balance',COALESCE((SELECT SUM(phon_delta) FROM public.imperial_treasury_ledger WHERE kind IN ('liquidity','injection_in','injection_out')),0),
    'emission', (SELECT row_to_json(e) FROM public.imperial_emission_state e WHERE id=1),
    'tiers_24h', COALESCE((
      SELECT jsonb_object_agg(tier, n) FROM (
        SELECT tier, count(*) AS n FROM public.imperial_volatility_window
        WHERE bucket_start > v_since GROUP BY tier
      ) x
    ), '{}'::jsonb),
    'injections', COALESCE((
      SELECT jsonb_agg(row_to_json(i) ORDER BY i.ts DESC)
      FROM (SELECT * FROM public.imperial_injection_events WHERE ts > v_since ORDER BY ts DESC LIMIT 50) i
    ), '[]'::jsonb),
    'params', COALESCE((SELECT jsonb_object_agg(key, value) FROM public.imperial_flywheel_params), '{}'::jsonb),
    'kill_switches', COALESCE((
      SELECT jsonb_object_agg(key, enabled) FROM public.platform_kill_switches
      WHERE key IN ('flywheel_burn','flywheel_injection','flywheel_emission_scale')
    ), '{}'::jsonb)
  ) INTO v;
  RETURN v;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_get_flywheel_health(int) TO authenticated;

-- Param hot-reload (immutable history via audit table)
CREATE OR REPLACE FUNCTION public.admin_set_flywheel_param(_key text, _value jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_old jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT value INTO v_old FROM public.imperial_flywheel_params WHERE key = _key;
  INSERT INTO public.imperial_flywheel_params(key, value, updated_by, updated_at)
  VALUES (_key, _value, auth.uid(), now())
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_by = auth.uid(), updated_at = now();
  INSERT INTO public.imperial_flywheel_params_audit(key, old_value, new_value, updated_by)
  VALUES (_key, v_old, _value, auth.uid());
  RETURN jsonb_build_object('ok', true);
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_set_flywheel_param(text, jsonb) TO authenticated;

-- AAL2 force injection (admin)
CREATE OR REPLACE FUNCTION public.admin_force_injection(_amount numeric, _reason text)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_aal text; v_id bigint;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  v_aal := COALESCE((current_setting('request.jwt.claims', true)::jsonb)->>'aal','');
  IF v_aal <> 'aal2' THEN RAISE EXCEPTION 'aal2_required'; END IF;
  v_id := public._do_inject_liquidity(_amount, COALESCE(_reason,'manual'), NULL, 'manual');
  RETURN v_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_force_injection(numeric, text) TO authenticated;
