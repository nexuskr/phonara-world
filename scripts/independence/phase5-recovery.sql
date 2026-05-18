-- =====================================================================
-- Phase 5 Recovery — Idempotent single-file safety net
-- Target: INDEPENDENT backend ref `wyhhdyrvqtoejvusnhva` ONLY
-- NEVER apply to managed ref `ketlqzfaplppmupaiwft`.
--
-- How to apply (pick ONE):
--   A) Supabase Dashboard (wyhhdyrvqtoejvusnhva) → SQL Editor → paste → Run
--   B) psql "$DATABASE_URL_WYH" -f scripts/independence/phase5-recovery.sql
--
-- Safe to re-run. All blocks use CREATE OR REPLACE / DROP IF EXISTS /
-- ON CONFLICT DO NOTHING. No data is mutated except auto-provisioning
-- missing rows for existing auth users at the bottom (optional block).
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 0) Prerequisite types/tables sanity (no-op if already present)
-- ---------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin','moderator','user');
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 1) RPC: get_empire_seats_remaining()
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_empire_seats_remaining()
RETURNS int LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT COUNT(*)::int FROM public.empire_founding_seats WHERE claimed_by IS NULL;
$$;
REVOKE ALL ON FUNCTION public.get_empire_seats_remaining() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_empire_seats_remaining() TO anon, authenticated;

-- ---------------------------------------------------------------------
-- 2) RPC: get_active_boost_count()
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_active_boost_count()
RETURNS int LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT COUNT(*)::int FROM public.package_purchases
    WHERE status = 'active' AND boost_until IS NOT NULL AND now() < boost_until;
$$;
REVOKE ALL ON FUNCTION public.get_active_boost_count() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_active_boost_count() TO anon, authenticated;

-- ---------------------------------------------------------------------
-- 3) RPC: record_span(...) + supporting table
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.spans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id uuid NOT NULL,
  parent_span_id uuid,
  op text NOT NULL,
  status text NOT NULL DEFAULT 'ok',
  started_at timestamptz NOT NULL,
  ended_at timestamptz NOT NULL,
  duration_ms integer NOT NULL,
  user_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS spans_trace_idx   ON public.spans (trace_id, started_at);
CREATE INDEX IF NOT EXISTS spans_op_dur_idx  ON public.spans (op, duration_ms DESC);
CREATE INDEX IF NOT EXISTS spans_created_idx ON public.spans (created_at DESC);
ALTER TABLE public.spans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS spans_admin_read ON public.spans;
CREATE POLICY spans_admin_read ON public.spans
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE OR REPLACE FUNCTION public.record_span(
  _trace_id uuid, _parent uuid, _op text, _status text,
  _started_at timestamptz, _ended_at timestamptz, _metadata jsonb DEFAULT '{}'::jsonb
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  new_id uuid;
  uid uuid := auth.uid();
BEGIN
  INSERT INTO public.spans(trace_id, parent_span_id, op, status, started_at, ended_at, duration_ms, user_id, metadata)
  VALUES (_trace_id, _parent, _op, coalesce(_status,'ok'),
          _started_at, _ended_at,
          GREATEST(0, EXTRACT(EPOCH FROM (_ended_at - _started_at))::int * 1000),
          uid, coalesce(_metadata,'{}'::jsonb))
  RETURNING id INTO new_id;
  DELETE FROM public.spans WHERE created_at < now() - interval '7 days';
  RETURN new_id;
END $$;
REVOKE ALL ON FUNCTION public.record_span(uuid,uuid,text,text,timestamptz,timestamptz,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_span(uuid,uuid,text,text,timestamptz,timestamptz,jsonb) TO authenticated, service_role;

-- ---------------------------------------------------------------------
-- 4) RPC: register_device(_fp, _ua)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.register_device(_fp text, _ua text DEFAULT NULL::text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  uid uuid := auth.uid();
  is_new boolean := false;
  device_count integer := 0;
  row_id uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'auth_required' USING ERRCODE='P0001'; END IF;
  IF _fp IS NULL OR length(_fp) < 16 OR length(_fp) > 128 THEN
    RAISE EXCEPTION 'invalid_fingerprint' USING ERRCODE='P0001';
  END IF;

  SELECT count(*) INTO device_count FROM public.user_devices WHERE user_id = uid;

  INSERT INTO public.user_devices (user_id, fp_hash, ua, last_seen)
  VALUES (uid, _fp, NULLIF(left(coalesce(_ua,''),256),''), now())
  ON CONFLICT (user_id, fp_hash) DO UPDATE SET
    last_seen = now(),
    ua = COALESCE(EXCLUDED.ua, public.user_devices.ua)
  RETURNING id, (xmax = 0) INTO row_id, is_new;

  IF is_new AND device_count > 0 THEN
    INSERT INTO public.anomaly_events (user_id, rule, severity, evidence, dedupe_key)
    VALUES (uid, 'new_device', 'info',
      jsonb_build_object(
        'fp_hash_prefix', left(_fp,12),
        'ua', NULLIF(left(coalesce(_ua,''),256),''),
        'prior_device_count', device_count),
      'new_device:' || uid::text || ':' || left(_fp,16) || ':' || to_char(now(),'YYYY-MM-DD'))
    ON CONFLICT (dedupe_key) DO NOTHING;
  END IF;

  RETURN jsonb_build_object('device_id', row_id, 'is_new', is_new, 'prior_count', device_count);
END $$;
REVOKE ALL ON FUNCTION public.register_device(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_device(text, text) TO authenticated;

-- ---------------------------------------------------------------------
-- 5) RPC: assign_persona()
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.assign_persona()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _bd date;
  _age int;
  _persona text;
  _is_freelancer boolean := false;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT birth_date INTO _bd FROM public.profiles WHERE id = _uid;
  IF _bd IS NULL THEN
    _persona := 'gen30';
  ELSE
    _age := DATE_PART('year', age(_bd));
    IF _age < 30 THEN _persona := 'gen20';
    ELSIF _age < 40 THEN _persona := 'gen30';
    ELSIF _age < 50 THEN _persona := 'gen40';
    ELSIF _age < 60 THEN _persona := 'gen5060';
    ELSE _persona := 'gen6070';
    END IF;
  END IF;

  SELECT (COUNT(*) FILTER (WHERE EXTRACT(HOUR FROM created_at) >= 22 OR EXTRACT(HOUR FROM created_at) < 6)::float
          / NULLIF(COUNT(*),0)) > 0.3
    INTO _is_freelancer
  FROM public.mission_history
  WHERE user_id = _uid AND created_at > now() - interval '14 days';

  IF _is_freelancer THEN _persona := 'freelancer'; END IF;
  UPDATE public.profiles SET persona = _persona WHERE id = _uid;
  RETURN _persona;
END $$;
REVOKE ALL ON FUNCTION public.assign_persona() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assign_persona() TO authenticated;

-- ---------------------------------------------------------------------
-- 6) profiles self-RLS (3 policies)
-- ---------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS profile_self_select ON public.profiles;
DROP POLICY IF EXISTS profile_self_insert ON public.profiles;
DROP POLICY IF EXISTS profile_self_update ON public.profiles;
CREATE POLICY profile_self_select ON public.profiles
  FOR SELECT USING (auth.uid() = id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY profile_self_insert ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY profile_self_update ON public.profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
REVOKE ALL ON public.profiles FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;

-- ---------------------------------------------------------------------
-- 7) handle_new_user() + trigger on auth.users
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles(id, nickname)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nickname', split_part(NEW.email,'@',1)))
    ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.wallet_balances(user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------
-- 8) Backfill: auto-provision missing profile/wallet/role for existing
--    auth users (safe; ON CONFLICT DO NOTHING). Comment out if not desired.
-- ---------------------------------------------------------------------
INSERT INTO public.profiles(id, nickname)
SELECT u.id, COALESCE(u.raw_user_meta_data->>'nickname', split_part(u.email,'@',1))
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.wallet_balances(user_id)
SELECT u.id FROM auth.users u
LEFT JOIN public.wallet_balances w ON w.user_id = u.id
WHERE w.user_id IS NULL
ON CONFLICT DO NOTHING;

INSERT INTO public.user_roles(user_id, role)
SELECT u.id, 'user'::public.app_role FROM auth.users u
LEFT JOIN public.user_roles r ON r.user_id = u.id
WHERE r.user_id IS NULL
ON CONFLICT DO NOTHING;

COMMIT;

-- =====================================================================
-- VERIFICATION (run separately after COMMIT)
-- =====================================================================
-- (1) RPC presence + EXECUTE
-- select p.proname,
--        has_function_privilege('authenticated', p.oid, 'EXECUTE') as authed_exec
-- from pg_proc p join pg_namespace n on n.oid=p.pronamespace
-- where n.nspname='public'
--   and p.proname in ('register_device','assign_persona','record_span',
--                     'get_active_boost_count','get_empire_seats_remaining');
--
-- (2) profiles RLS
-- select policyname, cmd from pg_policies
-- where schemaname='public' and tablename='profiles';
--
-- (3) trigger
-- select tgname, tgrelid::regclass, tgenabled
-- from pg_trigger where tgname='on_auth_user_created';
