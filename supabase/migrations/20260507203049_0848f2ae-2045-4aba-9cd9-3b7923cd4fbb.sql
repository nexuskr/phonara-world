-- ============================================================
-- 1. anon 역할에서 SECURITY DEFINER 함수 EXECUTE 권한 일괄 회수
-- ============================================================
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef = true
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM anon, public',
      r.nspname, r.proname, r.args);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %I.%I(%s) TO authenticated',
      r.nspname, r.proname, r.args);
  END LOOP;
END $$;

-- has_role은 RLS 정책에서 호출하므로 authenticated만으로 충분 (이미 위에서 처리됨)

-- ============================================================
-- 2. search_path 미설정 함수 보강
-- ============================================================
ALTER FUNCTION public._period_key(text) SET search_path = public;
ALTER FUNCTION public.xp_for_level(integer) SET search_path = public;

-- ============================================================
-- 3. error_logs 테이블 (클라이언트 런타임 오류 추적)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  level text NOT NULL DEFAULT 'error',
  message text NOT NULL,
  stack text,
  url text,
  user_agent text,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_error_logs_created ON public.error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_user ON public.error_logs(user_id);

ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY el_self_insert ON public.error_logs
  FOR INSERT TO public WITH CHECK (true);  -- anon도 익명 오류 보고 가능

CREATE POLICY el_admin_read ON public.error_logs
  FOR SELECT TO public USING (public.has_role(auth.uid(),'admin'));

-- ============================================================
-- 4. admin_audit_log (관리자 행동 추적)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  action text NOT NULL,
  target_id uuid,
  target_type text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_created ON public.admin_audit_log(created_at DESC);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY aal_admin_read ON public.admin_audit_log
  FOR SELECT TO public USING (public.has_role(auth.uid(),'admin'));

-- ============================================================
-- 5. 에러 기록 RPC (rate-limit 없음, 단순 INSERT)
-- ============================================================
CREATE OR REPLACE FUNCTION public.log_client_error(
  _message text, _stack text DEFAULT NULL, _url text DEFAULT NULL,
  _user_agent text DEFAULT NULL, _context jsonb DEFAULT '{}'::jsonb,
  _level text DEFAULT 'error'
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _id uuid;
BEGIN
  INSERT INTO public.error_logs(user_id, level, message, stack, url, user_agent, context)
  VALUES (auth.uid(), COALESCE(_level,'error'), LEFT(COALESCE(_message,'(empty)'), 2000),
          LEFT(_stack, 8000), LEFT(_url, 1000), LEFT(_user_agent, 500), COALESCE(_context,'{}'::jsonb))
  RETURNING id INTO _id;
  RETURN _id;
END $$;

REVOKE EXECUTE ON FUNCTION public.log_client_error(text,text,text,text,jsonb,text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.log_client_error(text,text,text,text,jsonb,text) TO authenticated, anon;

-- ============================================================
-- 6. 관리자 대시보드 통계 RPC
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_error_stats(_hours integer DEFAULT 24)
RETURNS TABLE(bucket timestamptz, level text, cnt bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _h int := GREATEST(1, LEAST(_hours, 720));
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  SELECT date_trunc('hour', created_at) AS bucket, level, COUNT(*)::bigint AS cnt
  FROM public.error_logs
  WHERE created_at >= now() - (_h || ' hours')::interval
  GROUP BY 1, 2
  ORDER BY 1 DESC;
END $$;

REVOKE EXECUTE ON FUNCTION public.get_error_stats(integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_error_stats(integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_recent_errors(_limit integer DEFAULT 100)
RETURNS SETOF public.error_logs
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _n int := GREATEST(1, LEAST(_limit, 500));
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY SELECT * FROM public.error_logs ORDER BY created_at DESC LIMIT _n;
END $$;

REVOKE EXECUTE ON FUNCTION public.get_recent_errors(integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_recent_errors(integer) TO authenticated;