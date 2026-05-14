CREATE TABLE IF NOT EXISTS public.vip_passes (
  user_id uuid PRIMARY KEY,
  active boolean NOT NULL DEFAULT true,
  started_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  renewals integer NOT NULL DEFAULT 0,
  last_paid_phon numeric,
  last_paid_at timestamptz,
  source text NOT NULL DEFAULT 'phon',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.vip_passes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vip_passes_self_select" ON public.vip_passes
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "vip_passes_admin_all" ON public.vip_passes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE INDEX IF NOT EXISTS idx_vip_passes_active ON public.vip_passes(active, expires_at);

CREATE OR REPLACE FUNCTION public.is_vip_active(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.vip_passes
    WHERE user_id = _uid AND active = true AND expires_at > now()
  );
$$;

CREATE OR REPLACE FUNCTION public.get_my_vip_pass()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_row public.vip_passes%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;
  SELECT * INTO v_row FROM public.vip_passes WHERE user_id = v_uid;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('active', false, 'expires_at', null, 'days_remaining', 0, 'renewals', 0);
  END IF;
  RETURN jsonb_build_object(
    'active', v_row.active AND v_row.expires_at > now(),
    'started_at', v_row.started_at,
    'expires_at', v_row.expires_at,
    'days_remaining', GREATEST(0, EXTRACT(EPOCH FROM (v_row.expires_at - now()))/86400)::int,
    'renewals', v_row.renewals,
    'last_paid_phon', v_row.last_paid_phon
  );
END; $$;

CREATE OR REPLACE FUNCTION public.subscribe_vip_pass_phon()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_cost numeric := 30000;
  v_bal numeric;
  v_now timestamptz := now();
  v_new_expires timestamptz;
  v_existing public.vip_passes%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;
  SELECT balance INTO v_bal FROM public.phon_balances WHERE user_id = v_uid FOR UPDATE;
  IF COALESCE(v_bal,0) < v_cost THEN RAISE EXCEPTION 'insufficient_phon'; END IF;
  SELECT * INTO v_existing FROM public.vip_passes WHERE user_id = v_uid FOR UPDATE;
  IF v_existing.user_id IS NOT NULL AND v_existing.active AND v_existing.expires_at > v_now THEN
    v_new_expires := v_existing.expires_at + interval '30 days';
  ELSE
    v_new_expires := v_now + interval '30 days';
  END IF;
  UPDATE public.phon_balances SET balance = balance - v_cost, updated_at = v_now WHERE user_id = v_uid;
  INSERT INTO public.phon_transactions(user_id, amount, kind, ref, meta)
    VALUES (v_uid, -v_cost, 'vip_pass_subscribe', 'monthly', jsonb_build_object('new_expires', v_new_expires));
  INSERT INTO public.vip_passes(user_id, active, started_at, expires_at, renewals, last_paid_phon, last_paid_at, source)
    VALUES (v_uid, true, v_now, v_new_expires, 1, v_cost, v_now, 'phon')
  ON CONFLICT (user_id) DO UPDATE
    SET active=true, expires_at=v_new_expires,
        renewals=public.vip_passes.renewals+1,
        last_paid_phon=v_cost, last_paid_at=v_now, source='phon', updated_at=v_now;
  RETURN jsonb_build_object('ok', true, 'expires_at', v_new_expires, 'paid_phon', v_cost);
END; $$;

CREATE OR REPLACE FUNCTION public.admin_grant_vip_pass(_uid uuid, _days integer DEFAULT 30)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_now timestamptz := now(); v_existing public.vip_passes%ROWTYPE; v_new_expires timestamptz;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'admin_only'; END IF;
  IF _days IS NULL OR _days <= 0 THEN RAISE EXCEPTION 'invalid_days'; END IF;
  SELECT * INTO v_existing FROM public.vip_passes WHERE user_id = _uid FOR UPDATE;
  IF v_existing.user_id IS NOT NULL AND v_existing.active AND v_existing.expires_at > v_now THEN
    v_new_expires := v_existing.expires_at + (_days || ' days')::interval;
  ELSE
    v_new_expires := v_now + (_days || ' days')::interval;
  END IF;
  INSERT INTO public.vip_passes(user_id, active, started_at, expires_at, source)
    VALUES (_uid, true, v_now, v_new_expires, 'admin_grant')
  ON CONFLICT (user_id) DO UPDATE
    SET active=true, expires_at=v_new_expires, source='admin_grant', updated_at=v_now;
  RETURN jsonb_build_object('ok', true, 'expires_at', v_new_expires);
END; $$;

CREATE OR REPLACE FUNCTION public.admin_list_active_vip(_limit int DEFAULT 100, _offset int DEFAULT 0)
RETURNS TABLE(user_id uuid, started_at timestamptz, expires_at timestamptz, renewals int, source text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'admin_only'; END IF;
  RETURN QUERY
    SELECT v.user_id, v.started_at, v.expires_at, v.renewals, v.source
    FROM public.vip_passes v
    WHERE v.active = true AND v.expires_at > now()
    ORDER BY v.expires_at DESC
    LIMIT _limit OFFSET _offset;
END; $$;

INSERT INTO public.function_permissions_baseline(function_name, function_args, allowed_roles, category, note) VALUES
  ('is_vip_active','_uid uuid', ARRAY['authenticated','service_role']::text[], 'vip', 'VIP active check helper'),
  ('get_my_vip_pass','', ARRAY['authenticated']::text[], 'vip', 'Self VIP pass status'),
  ('subscribe_vip_pass_phon','', ARRAY['authenticated']::text[], 'vip', 'PHON subscribe to VIP Empire Pass (30k PHON / 30d)'),
  ('admin_grant_vip_pass','_uid uuid, _days integer', ARRAY['authenticated']::text[], 'vip', 'Admin: grant/extend VIP pass (admin_only guard)'),
  ('admin_list_active_vip','_limit integer, _offset integer', ARRAY['authenticated']::text[], 'vip', 'Admin: list active VIP holders (admin_only guard)')
ON CONFLICT (function_name, function_args) DO UPDATE
  SET allowed_roles = EXCLUDED.allowed_roles, note = EXCLUDED.note, updated_at = now();