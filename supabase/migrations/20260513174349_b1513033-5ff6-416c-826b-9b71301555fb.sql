-- ========== auto_rule_decisions (PR-16 Shadow Mode) ==========
CREATE TABLE IF NOT EXISTS public.auto_rule_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id uuid REFERENCES public.deposit_auto_rules(id) ON DELETE SET NULL,
  rule_name text NOT NULL,
  deposit_id uuid,
  user_id uuid,
  suggested_action text NOT NULL,
  actual_action text,
  matched boolean,
  payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_ard_created ON public.auto_rule_decisions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ard_rule ON public.auto_rule_decisions(rule_id);

ALTER TABLE public.auto_rule_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ard_admin_select"
  ON public.auto_rule_decisions FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "ard_admin_write"
  ON public.auto_rule_decisions FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Shadow evaluator: scans rules for a given deposit_id, records what they would do
CREATE OR REPLACE FUNCTION public.evaluate_deposit_rules_shadow(_deposit_id uuid)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d record;
  r record;
  prior_count int;
  inserted int := 0;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'admin_only';
  END IF;

  SELECT id, user_id, amount, method, status
    INTO d
    FROM public.deposit_requests
   WHERE id = _deposit_id;
  IF NOT FOUND THEN RETURN 0; END IF;

  SELECT COUNT(*) INTO prior_count
    FROM public.deposit_requests
   WHERE user_id = d.user_id AND status = 'approved';

  FOR r IN
    SELECT * FROM public.deposit_auto_rules
     WHERE enabled = true
     ORDER BY priority ASC
  LOOP
    IF (r.amount_min IS NULL OR d.amount >= r.amount_min)
       AND (r.amount_max IS NULL OR d.amount <= r.amount_max)
       AND (r.method IS NULL OR r.method = d.method)
       AND (prior_count >= COALESCE(r.min_prior_approved, 0))
    THEN
      INSERT INTO public.auto_rule_decisions
        (rule_id, rule_name, deposit_id, user_id, suggested_action, actual_action, payload)
      VALUES
        (r.id, r.name, d.id, d.user_id, r.action, d.status,
         jsonb_build_object('amount', d.amount, 'method', d.method, 'prior_approved', prior_count));
      inserted := inserted + 1;
    END IF;
  END LOOP;

  RETURN inserted;
END;
$$;

-- ========== get_queue_sla_stats (PR-17) ==========
CREATE OR REPLACE FUNCTION public.get_queue_sla_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'admin_only';
  END IF;

  SELECT jsonb_build_object(
    'deposits',     jsonb_build_object(
      'count',      (SELECT COUNT(*) FROM public.deposit_requests WHERE status = 'pending'),
      'avg_minutes',(SELECT COALESCE(ROUND(EXTRACT(EPOCH FROM (now() - MIN(created_at)))/60), 0)::int
                      FROM public.deposit_requests WHERE status = 'pending'),
      'oldest_minutes',(SELECT COALESCE(ROUND(EXTRACT(EPOCH FROM (now() - MIN(created_at)))/60), 0)::int
                      FROM public.deposit_requests WHERE status = 'pending')
    ),
    'withdrawals',  jsonb_build_object(
      'count',      (SELECT COUNT(*) FROM public.withdrawal_requests WHERE status = 'pending'),
      'avg_minutes',(SELECT COALESCE(ROUND(EXTRACT(EPOCH FROM AVG(now() - created_at))/60), 0)::int
                      FROM public.withdrawal_requests WHERE status = 'pending'),
      'oldest_minutes',(SELECT COALESCE(ROUND(EXTRACT(EPOCH FROM (now() - MIN(created_at)))/60), 0)::int
                      FROM public.withdrawal_requests WHERE status = 'pending')
    ),
    'anomalies',    jsonb_build_object(
      'count',      (SELECT COUNT(*) FROM public.anomaly_events WHERE acknowledged = false),
      'avg_minutes',(SELECT COALESCE(ROUND(EXTRACT(EPOCH FROM AVG(now() - created_at))/60), 0)::int
                      FROM public.anomaly_events WHERE acknowledged = false),
      'oldest_minutes',(SELECT COALESCE(ROUND(EXTRACT(EPOCH FROM (now() - MIN(created_at)))/60), 0)::int
                      FROM public.anomaly_events WHERE acknowledged = false)
    ),
    'refunds',      jsonb_build_object(
      'count',      (SELECT COUNT(*) FROM public.refund_requests WHERE status = 'pending'),
      'avg_minutes',(SELECT COALESCE(ROUND(EXTRACT(EPOCH FROM AVG(now() - created_at))/60), 0)::int
                      FROM public.refund_requests WHERE status = 'pending'),
      'oldest_minutes',(SELECT COALESCE(ROUND(EXTRACT(EPOCH FROM (now() - MIN(created_at)))/60), 0)::int
                      FROM public.refund_requests WHERE status = 'pending')
    ),
    'generated_at', now()
  ) INTO result;

  RETURN result;
END;
$$;

-- ========== admin_freeze_user / unfreeze (PR-18 inline ⌘K actions) ==========
CREATE OR REPLACE FUNCTION public.admin_freeze_user(_user_id uuid, _hours int DEFAULT 24, _reason text DEFAULT 'manual_admin_freeze')
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  freeze_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'admin_only';
  END IF;
  IF _hours < 1 OR _hours > 720 THEN
    RAISE EXCEPTION 'invalid_hours';
  END IF;

  INSERT INTO public.account_freezes (user_id, frozen_until, reason, frozen_by)
  VALUES (_user_id, now() + make_interval(hours => _hours), _reason, auth.uid())
  RETURNING id INTO freeze_id;

  INSERT INTO public.anomaly_events (rule, severity, user_id, payload)
  VALUES ('manual_admin_freeze', 'warn', _user_id,
          jsonb_build_object('hours', _hours, 'reason', _reason, 'admin_id', auth.uid()));

  RETURN freeze_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_unfreeze_user(_user_id uuid)
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

  UPDATE public.account_freezes
     SET released_at = now(), released_by = auth.uid()
   WHERE user_id = _user_id AND released_at IS NULL;
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;

REVOKE ALL ON FUNCTION public.evaluate_deposit_rules_shadow(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_queue_sla_stats() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_freeze_user(uuid, int, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_unfreeze_user(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.evaluate_deposit_rules_shadow(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_queue_sla_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_freeze_user(uuid, int, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_unfreeze_user(uuid) TO authenticated;