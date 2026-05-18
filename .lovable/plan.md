# Phase 5 — SECURITY DEFINER Permission Hardening

Phase 5 잠금 작업. Money-flow 8경로 / Operator Isolation / `imperial_*` 함수 본문 **0바이트 변경**을 유지하면서, 클라이언트(`authenticated`/`anon`)가 직접 호출할 수 없어야 할 내부 헬퍼/트리거 함수에서 PostgREST 호출 경로를 제거한다.

3개 마이그레이션을 **순서대로** 분리한다. 각각 독립 PR 형태로 승인·롤백할 수 있다.

---

## Migration A — Baseline 확장 (read-only effect)

**목적:** `function_permissions_baseline`을 현실에 맞게 동기화하여, Migration C(strict drift) 가 거짓 양성으로 PR을 막지 않도록 한다.

**범위:** drift 리포트에서 분류된 242개 함수를 baseline에 등록.
- 181 user-callable (money-flow 8경로 포함: `credit_crypto_deposit`, `imperial_place_phon_bet`, `imperial_settle_duel`, `apply_token_burn`, `claim_first_deposit_godmode` 등)
- 61 admin (`has_role()` 내부 가드 보유)

**SQL 형태:**
```sql
INSERT INTO function_permissions_baseline (function_name, expected_grantees, notes, inserted_at)
VALUES
  ('credit_crypto_deposit', ARRAY['authenticated'], 'money-flow path 1', now()),
  -- ... 241 more rows
ON CONFLICT (function_name) DO NOTHING;
```

**Security Impact:**
- 권한 변경: **0**
- 함수 본문 변경: **0**
- 효과: drift 탐지 정확도만 상승. 런타임 동작 무변경.

**Rollback Plan:**
```sql
DELETE FROM function_permissions_baseline
 WHERE inserted_at >= '<deploy-timestamp>';
```
소요 시간: <5s. 데이터 손실 없음.

**Verification Gate:**
- 🟢 `SELECT count(*) FROM function_permissions_baseline` = 기존 + 242
- 🟢 `check_permission_drift()` 결과에서 위 242개가 사라짐
- 🟢 머니플로 8경로 함수 oid SHA-512 동일

---

## Migration B — 28개 internal helper REVOKE

**목적:** 클라이언트가 PostgREST `rpc()` 로 직접 호출하면 안 되는 내부 헬퍼 28개에서 `EXECUTE` 권한을 제거.

**대상 (28):**
```
_achv_increment, _achv_on_attendance, _achv_on_crown,
_achv_on_empire_level, _achv_on_position_close, _achv_on_stake_insert,
_achv_on_stake_yield, _achv_record, _apply_house_edge_split,
_crash_compute_multiplier, _crash_vip_limits, _do_inject_liquidity,
_maybe_upgrade_nft, _recompute_emission_scale, _recompute_volatility_tier,
+ 12 trigger helpers (trg_* / *_trigger)
+ 1 monitor_* cron helper
```

**SQL 형태:**
```sql
REVOKE EXECUTE ON FUNCTION public._apply_house_edge_split(numeric, uuid)
  FROM authenticated, anon;
-- × 28
```

**핵심 안전성 분석:**
- 이 함수들은 모두 `SECURITY DEFINER` → owner 권한으로 실행됨
- 상위 RPC(`imperial_settle_duel` 등)가 내부에서 호출할 때는 **caller grant 와 무관** (owner-rights)
- 즉, money-flow 8경로 본문은 그대로, 내부 호출도 그대로, 외부 PostgREST 호출만 차단됨

**Pre-deploy 강제 체크:**
1. `rg "rpc\('_(achv|apply|crash|do_inject|maybe_upgrade|recompute)" src/` → 결과 0이어야 함
2. `rg "rpc\('(trg_|monitor_)" src/` → 결과 0이어야 함
3. 스테이징에서 1건 settle 실행 → 성공 확인

**Security Impact:**
- Before: 28개 financially-sensitive helper가 모든 인증 클라이언트에 노출
- After: `service_role` + SECURITY DEFINER 호출 경로만 사용 가능
- 클라이언트 도달 가능 표면 **10.5% 감축**
- 가장 중요한 차단: `_apply_house_edge_split`, `_do_inject_liquidity` (treasury split 우회 시도 봉쇄)

**Rollback Plan:**
`scripts/phase5-rollback.sql` 자동 생성 (28 GRANT lines):
```sql
GRANT EXECUTE ON FUNCTION public._apply_house_edge_split(numeric, uuid)
  TO authenticated, anon;
-- × 28
```
소요 시간: <30s. 무중단.

**Verification Gate:**
- 🟢 28개 함수 모두 `has_function_privilege('authenticated', oid, 'EXECUTE')` = false
- 🟢 머니플로 8경로 함수 oid SHA-512 동일
- 🟢 30분 모니터링: `imperial_settle_duel` 에러율 ≤ baseline
- 🟢 Production smoke: 1건 duel settle 정상 완료

---

## Migration C — `check_permission_drift()` strict mode

**목적:** A+B 안정 머지 후, drift 탐지를 **warn → fail** 로 승격하여 향후 PR 에서 미등록 SECURITY DEFINER 함수 추가를 CI 단계에서 차단.

**범위:**
- `check_permission_drift()` 함수 본문 수정: drift 발견 시 `RAISE EXCEPTION` 대신 status='fail' 반환 (CI가 fail 처리)
- `.github/workflows/db-permissions.yml` 이미 호출 중 → 변경 불필요

**Security Impact:**
- 새 SECURITY DEFINER 함수 추가 시 baseline 등록 강제
- 권한 누수 회귀 방지

**Rollback Plan:**
```sql
-- 이전 버전 본문으로 복구 (마이그레이션에 ROLLBACK 블록 동봉)
```

**Verification Gate:**
- 🟢 의도적으로 unregistered 함수 1개 만든 PR 이 CI 에서 red 처리됨
- 🟢 현재 main 의 모든 PR 은 green 유지

---

## 불변 원칙 준수 체크리스트 (전체 Phase 5)

- [x] Money-flow 8경로 함수 **본문** git diff = 0
- [x] `imperial_*` 함수 **본문** git diff = 0
- [x] Operator Isolation 5-layer 영향 없음 (DB-layer 작업)
- [x] Edge function 코드 변경 없음
- [x] 프론트엔드 변경 없음 (모든 user-callable RPC 는 baseline 등록만 됨)

## 진행 순서

1. **이 PR (Migration A)**: baseline 242 INSERT — 승인 즉시 안전
2. **다음 PR (Migration B)**: 28 REVOKE — A 머지 + 24h 모니터링 후
3. **마지막 PR (Migration C)**: strict drift — B 머지 + 48h 모니터링 후

Phase 2 (Realtime owner-scoped) 와 Phase 1 잔여 15개 Edge Function 하드닝은 Phase 5 C 까지 안정 완료된 뒤 별도 plan 으로 재진입.
