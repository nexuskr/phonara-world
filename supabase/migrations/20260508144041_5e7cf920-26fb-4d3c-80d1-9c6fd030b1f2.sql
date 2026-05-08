-- 1) Enable RLS on existing partition children
ALTER TABLE viral_settlement_audit_v2_2026_05 ENABLE ROW LEVEL SECURITY;
ALTER TABLE viral_settlement_audit_v2_2026_06 ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS vsav2_2026_05_admin_read ON viral_settlement_audit_v2_2026_05;
CREATE POLICY vsav2_2026_05_admin_read ON viral_settlement_audit_v2_2026_05
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS vsav2_2026_06_admin_read ON viral_settlement_audit_v2_2026_06;
CREATE POLICY vsav2_2026_06_admin_read ON viral_settlement_audit_v2_2026_06
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 2) Auto-RLS for future partitions created via the helper
CREATE OR REPLACE FUNCTION ensure_settlement_audit_partition(_when timestamptz DEFAULT now())
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  start_d date := date_trunc('month', _when)::date;
  end_d   date := (date_trunc('month', _when) + interval '1 month')::date;
  pname   text := format('viral_settlement_audit_v2_%s', to_char(start_d, 'YYYY_MM'));
  policy_name text := format('%s_admin_read', pname);
BEGIN
  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS %I PARTITION OF viral_settlement_audit_v2 FOR VALUES FROM (%L) TO (%L)',
    pname, start_d, end_d
  );
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', pname);
  EXECUTE format(
    'DROP POLICY IF EXISTS %I ON %I',
    policy_name, pname
  );
  EXECUTE format(
    'CREATE POLICY %I ON %I FOR SELECT TO authenticated USING (has_role(auth.uid(), ''admin''::app_role))',
    policy_name, pname
  );
END $$;

-- 3) Pin search_path on the two simple guard functions
CREATE OR REPLACE FUNCTION guard_verification_log_immutable()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'viral_verification_log is write-once immutable';
END $$;

CREATE OR REPLACE FUNCTION guard_circuit_write()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_setting('app.circuit_rpc', true) IS DISTINCT FROM 'on' THEN
    RAISE EXCEPTION 'direct circuit mutation forbidden — use transition_ai_circuit()';
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$;