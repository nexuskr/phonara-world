
CREATE TABLE IF NOT EXISTS public.bot_mix_log (
  id BIGSERIAL PRIMARY KEY,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  prev_strength_pct INT NOT NULL,
  new_strength_pct INT NOT NULL,
  reason TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'auto',
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  changed_by UUID NULL
);

CREATE INDEX IF NOT EXISTS idx_bot_mix_log_occurred ON public.bot_mix_log (occurred_at DESC);
ALTER TABLE public.bot_mix_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin can read bot_mix_log" ON public.bot_mix_log;
CREATE POLICY "admin can read bot_mix_log"
  ON public.bot_mix_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "admin can insert bot_mix_log" ON public.bot_mix_log;
CREATE POLICY "admin can insert bot_mix_log"
  ON public.bot_mix_log FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.get_bot_mix_metrics()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_strength INT;
  v_enabled BOOL;
  v_real_24h BIGINT;
  v_bot_24h BIGINT;
  v_real_online BIGINT;
  v_recommended INT;
  v_ratio NUMERIC;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  SELECT enabled, strength_pct INTO v_enabled, v_strength
    FROM public.bot_settings WHERE id = 1;

  SELECT COUNT(DISTINCT user_id) INTO v_real_24h
    FROM public.chat_messages
    WHERE created_at > now() - interval '24 hours' AND user_id IS NOT NULL;

  SELECT COUNT(*) INTO v_bot_24h
    FROM public.bot_feed_events
    WHERE occurred_at > now() - interval '24 hours';

  SELECT COUNT(*) INTO v_real_online
    FROM public.profiles
    WHERE last_seen_at > now() - interval '5 minutes';

  v_ratio := CASE WHEN (v_real_24h + v_bot_24h) > 0
                  THEN v_real_24h::NUMERIC / (v_real_24h + v_bot_24h)
                  ELSE 0 END;

  v_recommended := CASE
    WHEN v_real_online >= 200 THEN 20
    WHEN v_real_online >= 100 THEN 25
    WHEN v_real_online >= 50  THEN 35
    WHEN v_real_online >= 20  THEN 45
    ELSE 50
  END;

  RETURN jsonb_build_object(
    'enabled', v_enabled,
    'current_strength_pct', v_strength,
    'recommended_strength_pct', v_recommended,
    'real_active_users_24h', v_real_24h,
    'bot_events_24h', v_bot_24h,
    'real_share', round(v_ratio, 4),
    'real_online_5m', v_real_online,
    'cap_pct', 50,
    'snapshot_at', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_bot_mix_metrics() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_bot_mix_metrics() TO authenticated;

CREATE OR REPLACE FUNCTION public.auto_adjust_bot_strength()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_cur INT;
  v_rec INT;
  v_new INT;
  v_enabled BOOL;
  v_real_online BIGINT;
BEGIN
  IF auth.role() <> 'service_role' AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin or service_role only';
  END IF;

  SELECT enabled, strength_pct INTO v_enabled, v_cur FROM public.bot_settings WHERE id = 1;
  IF NOT v_enabled THEN
    RETURN jsonb_build_object('skipped', true, 'reason', 'bot engine disabled');
  END IF;

  SELECT COUNT(*) INTO v_real_online FROM public.profiles
    WHERE last_seen_at > now() - interval '5 minutes';

  v_rec := CASE
    WHEN v_real_online >= 200 THEN 20
    WHEN v_real_online >= 100 THEN 25
    WHEN v_real_online >= 50  THEN 35
    WHEN v_real_online >= 20  THEN 45
    ELSE 50
  END;

  IF v_cur < v_rec THEN
    v_new := LEAST(50, v_cur + 5);
  ELSIF v_cur > v_rec THEN
    v_new := GREATEST(20, v_cur - 5);
  ELSE
    v_new := v_cur;
  END IF;

  v_new := LEAST(50, GREATEST(20, v_new));

  IF v_new <> v_cur THEN
    UPDATE public.bot_settings SET strength_pct = v_new, updated_at = now() WHERE id = 1;
    INSERT INTO public.bot_mix_log (prev_strength_pct, new_strength_pct, reason, source, metrics)
    VALUES (v_cur, v_new, 'auto adjust toward recommended ' || v_rec, 'auto',
            jsonb_build_object('recommended', v_rec, 'real_online_5m', v_real_online));
  END IF;

  RETURN jsonb_build_object('prev', v_cur, 'new', v_new, 'recommended', v_rec, 'real_online_5m', v_real_online);
END;
$$;

REVOKE ALL ON FUNCTION public.auto_adjust_bot_strength() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.auto_adjust_bot_strength() TO authenticated, service_role;

INSERT INTO public.function_permissions_baseline (function_name, function_args, allowed_roles, category, note)
VALUES
  ('get_bot_mix_metrics', '', ARRAY['authenticated'], 'admin', 'admin-only check inside; bot mix snapshot'),
  ('auto_adjust_bot_strength', '', ARRAY['authenticated','service_role'], 'admin', 'admin or cron; clamps strength_pct to [20,50]')
ON CONFLICT (function_name, function_args) DO UPDATE
  SET allowed_roles = EXCLUDED.allowed_roles, note = EXCLUDED.note, updated_at = now();
