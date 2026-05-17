-- push_send_log: per-user push throttle ledger
CREATE TABLE IF NOT EXISTS public.push_send_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL,
  kind        text NOT NULL,
  sent_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_push_send_log_user_day
  ON public.push_send_log (user_id, sent_at DESC);

ALTER TABLE public.push_send_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS psl_self_select ON public.push_send_log;
CREATE POLICY psl_self_select ON public.push_send_log
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

-- Kill switch row (idempotent)
INSERT INTO public.platform_kill_switches (key, enabled, reason)
VALUES ('push_engine', false, 'Phase F Smart Re-engagement engine master switch')
ON CONFLICT (key) DO NOTHING;

-- Atomic check-and-log helper. Returns true if allowed (and logged).
CREATE OR REPLACE FUNCTION public.try_log_push_send(
  _user_id uuid,
  _kind    text,
  _daily_cap int DEFAULT 3
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_killed  boolean;
  v_count   int;
BEGIN
  -- kill switch
  SELECT enabled INTO v_killed FROM public.platform_kill_switches WHERE key = 'push_engine';
  IF COALESCE(v_killed, false) THEN
    RETURN false;
  END IF;
  -- per-user daily cap (UTC day is fine — operational, not money)
  SELECT count(*) INTO v_count
  FROM public.push_send_log
  WHERE user_id = _user_id
    AND sent_at >= (now() - interval '24 hours');
  IF v_count >= _daily_cap THEN
    RETURN false;
  END IF;
  INSERT INTO public.push_send_log(user_id, kind) VALUES (_user_id, _kind);
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.try_log_push_send(uuid, text, int) FROM PUBLIC, anon, authenticated;

-- Streak-at-risk: streak >= 6 and didn't check in today (KST)
CREATE OR REPLACE FUNCTION public.list_streak_at_risk_users()
RETURNS TABLE(user_id uuid, attendance_streak int)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT p.id AS user_id, p.attendance_streak
  FROM public.profiles p
  WHERE p.attendance_streak >= 6
    AND (p.last_attendance IS NULL
         OR p.last_attendance < ((now() AT TIME ZONE 'Asia/Seoul')::date))
    AND EXISTS (SELECT 1 FROM public.push_subscriptions s WHERE s.user_id = p.id)
  LIMIT 5000;
$$;
REVOKE ALL ON FUNCTION public.list_streak_at_risk_users() FROM PUBLIC, anon, authenticated;

-- Dormant users for comeback campaign
CREATE OR REPLACE FUNCTION public.list_dormant_users(_days int[])
RETURNS TABLE(user_id uuid, dormant_days int)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT p.id AS user_id,
         (CURRENT_DATE - p.last_attendance)::int AS dormant_days
  FROM public.profiles p
  WHERE p.last_attendance IS NOT NULL
    AND (CURRENT_DATE - p.last_attendance)::int = ANY(_days)
    AND EXISTS (SELECT 1 FROM public.push_subscriptions s WHERE s.user_id = p.id)
  LIMIT 5000;
$$;
REVOKE ALL ON FUNCTION public.list_dormant_users(int[]) FROM PUBLIC, anon, authenticated;