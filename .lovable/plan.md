## 진단

스크린샷 3장이 모두 같은 뿌리에서 나온 증상이다.

### 1) `permission denied for function detect_anomalies`, `admin_resolve_package`
해당 함수들의 ACL을 직접 조회해 보니 `authenticated` 역할에 **EXECUTE 권한이 없다**:

```
acknowledge_anomaly        → authed_can_exec: false
admin_adjust_balance       → false
admin_get_user_email       → false
admin_release_freeze       → false
admin_resolve_deposit      → false
admin_resolve_package      → false   ← 스크린샷 #3 원인
admin_resolve_withdrawal   → false
admin_set_tier             → false
bulk_acknowledge_anomalies → false
detect_anomalies           → false   ← 스크린샷 #1 원인
```

→ 관리자가 로그인해도 `supabase.rpc()` 호출이 SQL 단계에서 차단된다. 이는 메모리에 적힌 원래 설계("49개 user-callable 함수는 internal `auth.uid()`/`has_role()` 가드로 보호 — authenticated EXECUTE는 정상")와 어긋난다.

### 2) `드리프트 16` 오탐 (스크린샷 #2)
`function_permissions_baseline` 테이블에서 위 함수들의 `allowed_roles`가 **모두 빈 배열 `[]`** 로 등록됨 → 드리프트 검출기가 "기대=없음, 관측=authenticated"로 보고 DRIFT 플래그.

`get_admin_metrics` 류는 이미 `authenticated`에 EXECUTE가 있는데 베이스라인이 비어 있어 "DRIFT 표시"만 되고 있음. 권한 자체는 정상.

---

## 수정안

### Step 1 — Admin-only 함수 EXECUTE 그랜트 복원

내부 `has_role(auth.uid(),'admin')` 가드를 가진 함수들에 `authenticated` EXECUTE 복원. 내부 가드가 비-admin을 차단하므로 보안 동등성 유지.

```sql
GRANT EXECUTE ON FUNCTION public.acknowledge_anomaly(uuid, text)        TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_adjust_balance(uuid, bigint, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_user_email(uuid)             TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_release_freeze(uuid, text)       TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_resolve_deposit(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_resolve_package(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_resolve_withdrawal(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_tier(uuid, user_tier)        TO authenticated;
GRANT EXECUTE ON FUNCTION public.bulk_acknowledge_anomalies(uuid[], text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.detect_anomalies()                     TO authenticated;
```

`detect_anomalies`는 베이스라인 분류상 `system_only`지만 UI(즉시 스캔 버튼)에서 admin이 직접 호출하도록 만들어진 흔적이 있음 → category를 `admin_only`로 재분류하고 내부에 `has_role` 가드 존재 여부 검증 후 grant.

### Step 2 — 베이스라인 갱신

```sql
UPDATE public.function_permissions_baseline
SET allowed_roles = ARRAY['authenticated'],
    updated_at = now()
WHERE function_name IN (
  'acknowledge_anomaly','admin_adjust_balance','admin_get_user_email','admin_release_freeze',
  'admin_resolve_deposit','admin_resolve_package','admin_resolve_withdrawal','admin_set_tier',
  'bulk_acknowledge_anomalies','detect_anomalies',
  'get_admin_metrics','get_error_stats','get_recent_errors','get_top_users','redetect_anomaly'
);
```

→ 드리프트 16 → 0 으로 떨어진다.

### Step 3 — `run_uptime_canary` 점검

이 함수만 `system_only` 분류 + `authenticated` 그랜트 존재 → 실제 드리프트일 수 있음. 두 갈래:
- **(A) admin이 UI에서 호출해야 한다면** → `admin_only`로 재분류 + 그랜트 유지
- **(B) cron 전용이면** → `REVOKE EXECUTE FROM authenticated` 로 정리

확인 필요 (질문 1번).

### Step 4 — 검증

1. `/admin > 권한 감사` 새로고침 → 드리프트 0
2. `/admin > 보안 감사` 즉시 스캔 클릭 → 성공 토스트
3. 패키지 결제 신청 → 승인 → 성공
4. `permission_change_log` 신규 row 없음 (= grant 변경이 detect_anomalies 트리거를 발동시켜도 베이스라인과 일치)

---

## 확인할 점

1. `run_uptime_canary` 는 admin 수동 실행 vs cron 전용 중 어느 쪽?
2. 메모리에 "49개 user-callable 함수" 라고 적혀 있는데 위 11개를 추가해 60개 가까이 늘리는 것이 맞는지 (= 원래 의도된 상태로 복원하는 것임)

답변 안 줘도 진행 가능 — 1번은 default `admin_only`로 두고, 2번은 메모리 카운트만 갱신.
