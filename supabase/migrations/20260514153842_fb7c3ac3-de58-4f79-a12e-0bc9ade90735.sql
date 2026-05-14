-- ═══════════════════════════════════════════════════════════════
-- Migration 3 — Audit log + Stuck-reserved monitor
-- ═══════════════════════════════════════════════════════════════

-- 1. Audit table
CREATE TABLE IF NOT EXISTS public.live_position_open_audit (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid NOT NULL,
  client_request_id  uuid,
  lease_owner        uuid,
  outcome            text NOT NULL CHECK (outcome IN ('success','failed')),
  error_code         text,
  oracle_snapshot    jsonb,
  position_id        uuid,
  entry_price        numeric,
  request_meta       jsonb,
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lpoa_user_created
  ON public.live_position_open_audit(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lpoa_crid
  ON public.live_position_open_audit(client_request_id)
  WHERE client_request_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lpoa_outcome_created
  ON public.live_position_open_audit(outcome, created_at DESC);

-- 2. RLS: self read + admin read
ALTER TABLE public.live_position_open_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lpoa_self_select" ON public.live_position_open_audit;
CREATE POLICY "lpoa_self_select"
  ON public.live_position_open_audit
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "lpoa_admin_select" ON public.live_position_open_audit;
CREATE POLICY "lpoa_admin_select"
  ON public.live_position_open_audit
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- INSERT: only via SECURITY DEFINER paths (trigger / RPC)

-- 3. Trigger: auto-audit successful completion
CREATE OR REPLACE FUNCTION public.audit_lpi_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status = 'reserved' AND NEW.status = 'completed' THEN
    INSERT INTO public.live_position_open_audit
      (user_id, client_request_id, lease_owner, outcome,
       oracle_snapshot, position_id, entry_price, request_meta)
    VALUES (
      NEW.user_id,
      NEW.client_request_id,
      NEW.lease_owner,
      'success',
      jsonb_build_object(
        'price',  NEW.result->>'oracle_price',
        'age_ms', NEW.result->>'oracle_age_ms',
        'source', NEW.result->>'oracle_source'
      ),
      (NEW.result->>'position_id')::uuid,
      (NEW.result->>'entry_price')::numeric,
      jsonb_build_object('params_hash', NEW.params_hash)
    );
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_audit_lpi_completion ON public.live_position_idempotency;
CREATE TRIGGER trg_audit_lpi_completion
  AFTER UPDATE ON public.live_position_idempotency
  FOR EACH ROW EXECUTE FUNCTION public.audit_lpi_completion();

-- 4. Failure logging RPC (called by app when RPC raises)
CREATE OR REPLACE FUNCTION public.log_lpi_audit_failure(
  p_client_request_id uuid,
  p_error_code        text,
  p_meta              jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_id  uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'auth required';
  END IF;
  IF p_error_code IS NULL OR length(p_error_code) = 0 THEN
    RAISE EXCEPTION 'error_code required';
  END IF;

  INSERT INTO public.live_position_open_audit
    (user_id, client_request_id, outcome, error_code, request_meta)
  VALUES (v_uid, p_client_request_id, 'failed',
          left(p_error_code, 500),
          COALESCE(p_meta, '{}'::jsonb))
  RETURNING id INTO v_id;

  RETURN v_id;
END $$;

REVOKE ALL ON FUNCTION public.log_lpi_audit_failure(uuid, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_lpi_audit_failure(uuid, text, jsonb) TO authenticated;

-- 5. Stuck-reserved monitor
CREATE OR REPLACE FUNCTION public.monitor_lpi_stuck_reserved()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int := 0;
  r       record;
BEGIN
  FOR r IN
    SELECT client_request_id, user_id, lease_owner, lease_until, created_at
    FROM public.live_position_idempotency
    WHERE status = 'reserved'
      AND lease_until < now() - interval '60 seconds'
    ORDER BY lease_until ASC
    LIMIT 200
  LOOP
    INSERT INTO public.anomaly_events
      (user_id, rule, severity, evidence, dedupe_key)
    VALUES (
      r.user_id,
      'lpi_stuck_reserved',
      'warning',
      jsonb_build_object(
        'client_request_id', r.client_request_id,
        'lease_owner',       r.lease_owner,
        'lease_expired_at',  r.lease_until,
        'reserved_at',       r.created_at,
        'stuck_seconds',     EXTRACT(EPOCH FROM (now() - r.lease_until))::int
      ),
      'lpi_stuck:' || r.client_request_id::text
    )
    ON CONFLICT DO NOTHING;
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END $$;

REVOKE ALL ON FUNCTION public.monitor_lpi_stuck_reserved() FROM PUBLIC;

-- 6. Cron: every 1 minute
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('monitor-lpi-stuck-reserved')
      WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname='monitor-lpi-stuck-reserved');

    PERFORM cron.schedule(
      'monitor-lpi-stuck-reserved',
      '* * * * *',
      $cron$ SELECT public.monitor_lpi_stuck_reserved(); $cron$
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron schedule skipped: %', SQLERRM;
END $$;

COMMENT ON TABLE public.live_position_open_audit IS
  'v3.2 audit trail. Success rows inserted by audit_lpi_completion trigger; failure rows by log_lpi_audit_failure RPC.';
COMMENT ON FUNCTION public.monitor_lpi_stuck_reserved() IS
  'Detects reserved lpi rows with expired lease + 60s grace. Inserts anomaly_events for admin alerting.';