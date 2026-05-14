-- ============================================================
-- B2B Trading Sim API: api_keys + per-minute usage counters
-- ============================================================

CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  prefix TEXT NOT NULL UNIQUE,            -- e.g. 'pk_live_a1b2c3d4' (12 chars), used as lookup
  key_hash TEXT NOT NULL,                 -- SHA-256 hex of full secret
  scopes TEXT[] NOT NULL DEFAULT ARRAY['sim:read'],
  rate_limit_per_min INT NOT NULL DEFAULT 60,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_api_keys_user ON public.api_keys(user_id, active);
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix_active ON public.api_keys(prefix) WHERE active = true;

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "api_keys_owner_select" ON public.api_keys
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.api_usage_counters (
  id BIGSERIAL PRIMARY KEY,
  key_id UUID NOT NULL REFERENCES public.api_keys(id) ON DELETE CASCADE,
  minute_bucket TIMESTAMPTZ NOT NULL,
  count INT NOT NULL DEFAULT 1,
  UNIQUE (key_id, minute_bucket)
);

CREATE INDEX IF NOT EXISTS idx_api_usage_key_bucket ON public.api_usage_counters(key_id, minute_bucket DESC);

ALTER TABLE public.api_usage_counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "api_usage_owner_select" ON public.api_usage_counters
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.api_keys k WHERE k.id = key_id AND k.user_id = auth.uid()));

-- ============================================================
-- RPC: create_api_key
-- Returns the FULL secret exactly once. Stored as SHA-256 hash.
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_api_key(
  _name TEXT,
  _scopes TEXT[] DEFAULT ARRAY['sim:read'],
  _rate_limit_per_min INT DEFAULT 60
)
RETURNS TABLE(id UUID, prefix TEXT, secret TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_prefix TEXT;
  v_secret_part TEXT;
  v_full_secret TEXT;
  v_hash TEXT;
  v_id UUID;
  v_active_count INT;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;
  IF _name IS NULL OR length(trim(_name)) = 0 THEN RAISE EXCEPTION 'name_required'; END IF;
  IF _rate_limit_per_min < 1 OR _rate_limit_per_min > 600 THEN RAISE EXCEPTION 'invalid_rate_limit'; END IF;

  SELECT count(*) INTO v_active_count FROM public.api_keys WHERE user_id = v_uid AND active = true;
  IF v_active_count >= 10 THEN RAISE EXCEPTION 'max_keys_reached'; END IF;

  v_prefix := 'pk_live_' || substring(encode(gen_random_bytes(6), 'hex'), 1, 12);
  v_secret_part := encode(gen_random_bytes(24), 'hex');
  v_full_secret := v_prefix || '_' || v_secret_part;
  v_hash := encode(digest(v_full_secret, 'sha256'), 'hex');

  INSERT INTO public.api_keys(user_id, name, prefix, key_hash, scopes, rate_limit_per_min)
  VALUES (v_uid, trim(_name), v_prefix, v_hash, _scopes, _rate_limit_per_min)
  RETURNING public.api_keys.id INTO v_id;

  RETURN QUERY SELECT v_id, v_prefix, v_full_secret;
END;
$$;

-- ============================================================
-- RPC: list_my_api_keys
-- ============================================================
CREATE OR REPLACE FUNCTION public.list_my_api_keys()
RETURNS TABLE(id UUID, name TEXT, prefix TEXT, scopes TEXT[], rate_limit_per_min INT,
              active BOOLEAN, created_at TIMESTAMPTZ, last_used_at TIMESTAMPTZ, revoked_at TIMESTAMPTZ)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, name, prefix, scopes, rate_limit_per_min, active, created_at, last_used_at, revoked_at
  FROM public.api_keys
  WHERE user_id = auth.uid()
  ORDER BY created_at DESC;
$$;

-- ============================================================
-- RPC: revoke_api_key
-- ============================================================
CREATE OR REPLACE FUNCTION public.revoke_api_key(_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;
  UPDATE public.api_keys
     SET active = false, revoked_at = now()
   WHERE id = _id AND user_id = auth.uid();
END;
$$;

-- ============================================================
-- RPC: get_my_api_usage_24h
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_my_api_usage_24h(_key_id UUID)
RETURNS TABLE(minute_bucket TIMESTAMPTZ, count INT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.api_keys WHERE id = _key_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
  SELECT u.minute_bucket, u.count
  FROM public.api_usage_counters u
  WHERE u.key_id = _key_id
    AND u.minute_bucket > now() - interval '24 hours'
  ORDER BY u.minute_bucket DESC;
END;
$$;

-- ============================================================
-- RPC: verify_and_meter_api_key
-- Used by edge function (service_role). Validates hash, applies
-- per-minute rate limit, increments counter, updates last_used_at.
-- Returns row with allowed flag + remaining + key info.
-- ============================================================
CREATE OR REPLACE FUNCTION public.verify_and_meter_api_key(
  _prefix TEXT,
  _full_secret TEXT
)
RETURNS TABLE(allowed BOOLEAN, reason TEXT, key_id UUID, user_id UUID, scopes TEXT[],
              rate_limit_per_min INT, current_count INT, remaining INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key RECORD;
  v_hash TEXT;
  v_bucket TIMESTAMPTZ;
  v_count INT;
BEGIN
  v_hash := encode(digest(_full_secret, 'sha256'), 'hex');

  SELECT k.id, k.user_id, k.scopes, k.rate_limit_per_min, k.active, k.key_hash
    INTO v_key
    FROM public.api_keys k
   WHERE k.prefix = _prefix
   LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'key_not_found'::TEXT, NULL::UUID, NULL::UUID, NULL::TEXT[], 0, 0, 0;
    RETURN;
  END IF;

  IF NOT v_key.active THEN
    RETURN QUERY SELECT false, 'key_revoked'::TEXT, v_key.id, v_key.user_id, v_key.scopes, v_key.rate_limit_per_min, 0, 0;
    RETURN;
  END IF;

  IF v_key.key_hash <> v_hash THEN
    RETURN QUERY SELECT false, 'invalid_secret'::TEXT, NULL::UUID, NULL::UUID, NULL::TEXT[], 0, 0, 0;
    RETURN;
  END IF;

  v_bucket := date_trunc('minute', now());

  INSERT INTO public.api_usage_counters(key_id, minute_bucket, count)
  VALUES (v_key.id, v_bucket, 1)
  ON CONFLICT (key_id, minute_bucket)
    DO UPDATE SET count = public.api_usage_counters.count + 1
  RETURNING public.api_usage_counters.count INTO v_count;

  UPDATE public.api_keys SET last_used_at = now() WHERE id = v_key.id;

  IF v_count > v_key.rate_limit_per_min THEN
    RETURN QUERY SELECT false, 'rate_limited'::TEXT, v_key.id, v_key.user_id, v_key.scopes,
                        v_key.rate_limit_per_min, v_count, 0;
    RETURN;
  END IF;

  RETURN QUERY SELECT true, 'ok'::TEXT, v_key.id, v_key.user_id, v_key.scopes,
                      v_key.rate_limit_per_min, v_count,
                      GREATEST(0, v_key.rate_limit_per_min - v_count);
END;
$$;

-- ============================================================
-- Cleanup: prune old usage counters (>7d)
-- ============================================================
CREATE OR REPLACE FUNCTION public.prune_api_usage_counters()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_n INT;
BEGIN
  DELETE FROM public.api_usage_counters WHERE minute_bucket < now() - interval '7 days';
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n;
END;
$$;

-- ============================================================
-- Permission baseline
-- ============================================================
INSERT INTO public.function_permissions_baseline(function_name, function_args, allowed_roles, category, note) VALUES
  ('create_api_key', 'text, text[], integer', ARRAY['authenticated','service_role'], 'developer_api', 'Creates B2B sim API key, plaintext returned once'),
  ('list_my_api_keys', '', ARRAY['authenticated','service_role'], 'developer_api', 'List own API keys'),
  ('revoke_api_key', 'uuid', ARRAY['authenticated','service_role'], 'developer_api', 'Revoke own API key'),
  ('get_my_api_usage_24h', 'uuid', ARRAY['authenticated','service_role'], 'developer_api', 'Per-minute usage 24h'),
  ('verify_and_meter_api_key', 'text, text', ARRAY['service_role'], 'developer_api_internal', 'Edge-only key validation + rate limit'),
  ('prune_api_usage_counters', '', ARRAY['service_role'], 'maintenance', 'Cron prune')
ON CONFLICT (function_name, function_args) DO UPDATE
  SET allowed_roles = EXCLUDED.allowed_roles,
      category = EXCLUDED.category,
      note = EXCLUDED.note;