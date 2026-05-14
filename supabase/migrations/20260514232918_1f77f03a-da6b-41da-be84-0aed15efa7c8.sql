-- Fix: pgcrypto lives in `extensions` schema; qualify references.
CREATE OR REPLACE FUNCTION public.create_api_key(
  _name TEXT,
  _scopes TEXT[] DEFAULT ARRAY['sim:read'],
  _rate_limit_per_min INT DEFAULT 60
)
RETURNS TABLE(id UUID, prefix TEXT, secret TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
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

  v_prefix := 'pk_live_' || substring(encode(extensions.gen_random_bytes(6), 'hex'), 1, 12);
  v_secret_part := encode(extensions.gen_random_bytes(24), 'hex');
  v_full_secret := v_prefix || '_' || v_secret_part;
  v_hash := encode(extensions.digest(v_full_secret::bytea, 'sha256'), 'hex');

  INSERT INTO public.api_keys(user_id, name, prefix, key_hash, scopes, rate_limit_per_min)
  VALUES (v_uid, trim(_name), v_prefix, v_hash, _scopes, _rate_limit_per_min)
  RETURNING public.api_keys.id INTO v_id;

  RETURN QUERY SELECT v_id, v_prefix, v_full_secret;
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_and_meter_api_key(
  _prefix TEXT,
  _full_secret TEXT
)
RETURNS TABLE(allowed BOOLEAN, reason TEXT, key_id UUID, user_id UUID, scopes TEXT[],
              rate_limit_per_min INT, current_count INT, remaining INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_key RECORD;
  v_hash TEXT;
  v_bucket TIMESTAMPTZ;
  v_count INT;
BEGIN
  v_hash := encode(extensions.digest(_full_secret::bytea, 'sha256'), 'hex');

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