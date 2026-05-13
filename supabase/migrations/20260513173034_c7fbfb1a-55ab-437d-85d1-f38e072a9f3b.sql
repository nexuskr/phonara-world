
-- ========== admin_settings (key/value JSON) ==========
CREATE TABLE IF NOT EXISTS public.admin_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_settings_admin_select"
  ON public.admin_settings FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admin_settings_admin_write"
  ON public.admin_settings FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Seed defaults (idempotent)
INSERT INTO public.admin_settings (key, value) VALUES
  ('cockpit.thresholds', jsonb_build_object(
     'deposits_hot', 5,
     'withdrawals_hot', 3,
     'aml_hot', 1,
     'refund_hot', 2,
     'anomaly_hot', 5
  )),
  ('cockpit.sla', jsonb_build_object(
     'withdrawal_minutes', 30,
     'deposit_minutes', 15,
     'aml_minutes', 60
  ))
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.admin_settings_get(_key text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT value FROM public.admin_settings WHERE key = _key;
$$;

CREATE OR REPLACE FUNCTION public.admin_settings_set(_key text, _value jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'admin_only';
  END IF;
  INSERT INTO public.admin_settings(key, value, updated_by, updated_at)
  VALUES (_key, _value, auth.uid(), now())
  ON CONFLICT (key) DO UPDATE
    SET value = EXCLUDED.value,
        updated_by = EXCLUDED.updated_by,
        updated_at = now();
  RETURN _value;
END;
$$;

-- ========== deposit_auto_rules (DRY-RUN suggest only by default) ==========
CREATE TABLE IF NOT EXISTS public.deposit_auto_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  enabled boolean NOT NULL DEFAULT false,
  -- 'auto_approve' | 'auto_hold' | 'flag_only' (suggest mode emits anomaly_event but does NOT mutate request)
  action text NOT NULL CHECK (action IN ('auto_approve','auto_hold','flag_only')),
  -- Bounds: amount_min/max NULL = unlimited. method NULL = any.
  amount_min numeric,
  amount_max numeric,
  method text CHECK (method IS NULL OR method IN ('bank','coin')),
  -- Risk score band the rule fires within (0..100)
  risk_score_max integer DEFAULT 100,
  -- Number of past approved deposits required (sender trust)
  min_prior_approved int DEFAULT 0,
  priority int NOT NULL DEFAULT 100, -- lower = higher priority
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.deposit_auto_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dar_admin_select"
  ON public.deposit_auto_rules FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "dar_admin_write"
  ON public.deposit_auto_rules FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Seed sample rules — ALL DISABLED by default. Admin must toggle to activate.
INSERT INTO public.deposit_auto_rules
  (name, description, enabled, action, amount_min, amount_max, method, risk_score_max, min_prior_approved, priority)
VALUES
  ('소액 신뢰 자동승인 (DRY-RUN)', '50,000원 이하 + 과거 3건 이상 승인 + 위험점수 20 이하 → 자동승인',
    false, 'auto_approve', 0, 50000, NULL, 20, 3, 10),
  ('대형 코인 입금 보류',          '1,000,000원 초과 + COIN → 자동 보류 후 사람 검토',
    false, 'auto_hold', 1000000, NULL, 'coin', 100, 0, 20),
  ('신규 계정 플래그',              '과거 승인 0건 + 100,000원 초과 → flag (anomaly_events 기록만)',
    false, 'flag_only', 100000, NULL, NULL, 100, 0, 30)
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.admin_set_auto_rule_enabled(_id uuid, _enabled boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'admin_only';
  END IF;
  UPDATE public.deposit_auto_rules
     SET enabled = _enabled, updated_at = now(), updated_by = auth.uid()
   WHERE id = _id;
END;
$$;

-- ========== admin_ack_anomaly (bulk) ==========
CREATE OR REPLACE FUNCTION public.admin_ack_anomaly(_ids uuid[], _note text DEFAULT NULL)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected int;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'admin_only';
  END IF;
  UPDATE public.anomaly_events
     SET acknowledged = true,
         acknowledged_by = auth.uid(),
         acknowledged_at = now(),
         ack_note = COALESCE(_note, ack_note)
   WHERE id = ANY(_ids)
     AND acknowledged = false;
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;

-- ========== admin_search_users (⌘K) ==========
CREATE OR REPLACE FUNCTION public.admin_search_users(_q text, _limit int DEFAULT 8)
RETURNS TABLE (
  user_id uuid,
  username text,
  email text,
  tier text,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'admin_only';
  END IF;
  IF _q IS NULL OR length(trim(_q)) < 2 THEN
    RETURN;
  END IF;
  RETURN QUERY
  SELECT p.id::uuid AS user_id,
         p.username::text,
         u.email::text,
         COALESCE(p.tier, 'free')::text AS tier,
         p.created_at
    FROM public.profiles p
    LEFT JOIN auth.users u ON u.id = p.id
   WHERE p.username ILIKE '%' || _q || '%'
      OR u.email    ILIKE '%' || _q || '%'
      OR p.id::text =  _q
   ORDER BY p.created_at DESC
   LIMIT GREATEST(1, LEAST(_limit, 25));
END;
$$;

-- ========== Permissions (lock down EXECUTE) ==========
REVOKE ALL ON FUNCTION public.admin_settings_get(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_settings_set(text, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_set_auto_rule_enabled(uuid, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_ack_anomaly(uuid[], text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_search_users(text, int) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_settings_get(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_settings_set(text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_auto_rule_enabled(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_ack_anomaly(uuid[], text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_search_users(text, int) TO authenticated;
