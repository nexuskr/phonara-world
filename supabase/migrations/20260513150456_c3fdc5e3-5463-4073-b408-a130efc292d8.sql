-- #7. 출석체크 RPC 안정화: jsonb_object_keys_count(jsonb) 누락 함수를 정식 생성.
-- 이전 마이그레이션에서 progress_daily_combo는 인라인 우회했지만,
-- 다른 어떤 RPC/트리거가 동일 이름을 참조해도 절대 깨지지 않도록 영구 함수로 등록.
CREATE OR REPLACE FUNCTION public.jsonb_object_keys_count(_obj jsonb)
RETURNS integer
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT count(*)::int FROM jsonb_object_keys(COALESCE(_obj, '{}'::jsonb))),
    0
  );
$$;

COMMENT ON FUNCTION public.jsonb_object_keys_count(jsonb)
  IS 'Defensive helper — counts top-level keys of a jsonb object. Restores compatibility for legacy callers (e.g. claim_daily_attendance / progress_daily_combo).';

-- 권한: 모든 인증 사용자가 호출 가능 (read-only, side-effect 없음)
GRANT EXECUTE ON FUNCTION public.jsonb_object_keys_count(jsonb) TO authenticated, anon;