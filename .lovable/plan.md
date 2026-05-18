# Phase 4 — All Lights To Green Recovery Plan

해부 보고서의 🔴 5건과 🟡 위험을 모두 해소해 Phase 1 Observer Mode가 실제로 점화 가능한 상태로 만든다. Money-flow 8경로와 Operator Isolation은 0바이트 무변경을 유지한다.

---

## Phase 0 — Pre-Operation Safety (read-only)

- Money-flow 8경로 파일 SHA-512 스냅샷 캡처(작업 전/후 비교).
- Operator Isolation 5중 가드(`manualChunks` / `modulePreload` 필터 / `check-operator-isolation.mjs` / dependency-cruiser / `DegradeModeBinder`) 현행 유지 확인.
- `imperial_*` 32개 테이블의 현재 컬럼/RLS 스냅샷을 read_query로 확보.
- 10분 rollback SOP 재확인: `imperial_phase1_emergency_pause()` + `imperial_rollout_activate(0, ...)`.

## Phase 1 — DB 스키마 표준화 (migration #1)

신규 컬럼은 모두 nullable + default 로 추가해 기존 데이터 보존.

- `imperial_observability_events`
  - `ADD COLUMN created_at timestamptz DEFAULT now()` (없으면), `UPDATE` 로 `ts` 값 백필.
  - `ADD COLUMN event text` 가 없으면 generated/alias 컬럼으로 `kind` 미러.
- `imperial_rollout_phases`
  - `ADD COLUMN tier int DEFAULT 0`
  - `ADD COLUMN cap bigint DEFAULT 0`
  - `ADD COLUMN activated_at timestamptz`
- `imperial_onboarding_grants`
  - `ADD COLUMN created_at timestamptz DEFAULT now()` + 백필 from `granted_at`.
- 32개 `imperial_*` 테이블 중 `created_at`/`updated_at` 누락분만 보강(존재 확인 후 ADD IF NOT EXISTS).

## Phase 2 — 누락 RPC 4종 생성 (migration #2)

모두 `SECURITY DEFINER`, `SET search_path = public`, AAL2 또는 admin 가드.

1. `imperial_rollout_activate(_phase int, _activated_by uuid, _notes text default null)`
   - admin + AAL2 체크, `imperial_rollout_phases` upsert(tier/cap 매핑 0/1/2/3 → 0/50k/250k/unlimited), `activated_at = now()`.
   - `imperial_observability_events` 에 `kind='rollout_activated'` 기록. Atomic.
2. `imperial_log_observability(_event text, _payload jsonb default '{}')`
   - `auth.uid()` 또는 NULL 허용, append-only INSERT.
3. `imperial_claim_daily_login_bonus()`
   - 일자별 `imperial_onboarding_grants` unique(user_id, kind='daily_login', date) 가드.
   - 450~550 PHON variable reward (`floor(450 + random()*101)`), near-miss 메타.
   - PHON 지급은 기존 `_grant_phon_internal` 류 헬퍼만 호출 — money-flow 함수 본문 무수정.
4. `imperial_get_onboarding_state()` STABLE
   - 오늘 클레임 여부 / streak / 다음 보상 / cap 잔량 반환.

## Phase 3 — Kill Switch 정리 (insert 도구)

- `platform_kill_switches` 에서 `phon_betting`, `phon_staking`, `phon_swap` 행을 `enabled=false` 로 UPDATE.
- 중복 키(`phon_betting` vs `phon_betting_enabled`) 가 존재하면 `_enabled` 접미사 행을 비활성화로 정리(삭제 아님, 감사 추적 보존).
- 변경마다 `admin_audit_log` 에 사유 기록.

## Phase 4 — Frontend 오타/누수 수정

- `src/components/admin/TodayKpiCards.tsx`: `withdraw_requests` → `withdrawal_requests`.
- `src/packages/duel/hooks/useFomoOracle.ts`:
  - `setInterval` 을 `@pkg/performance` 의 `useTrackedInterval` 로 교체(카테고리 `'fomo'`).
  - 동일 훅 다중 마운트 방지를 위해 모듈 스코프 `refCount` + 단일 interval 공유.
- Money-flow 파일은 일절 수정하지 않음.

## Phase 5 — RLS / 노란불 해소

- `profiles_sensitive_guard` 트리거 회귀 원인을 read_query 로 식별 후 트리거 정의만 보강(컬럼 셋 동기화). profiles 본문/RLS 정책은 무변경.
- supabase linter 재실행 후 신규 경고만 핀포인트 수정. 기존 accepted-risk 항목은 그대로 유지하고 사유를 보안 메모에 갱신.

## Phase 6 — Verification Gates (50+)

스크립트 `scripts/phase4/all-green-verification.ts` 가 다음을 자동 점검 후 콘솔 + `/admin/ops/imperial-command` 에 결과 출력:

- Money-flow 8경로 SHA-512 = baseline (8 게이트)
- Operator Isolation: `check-operator-isolation.mjs` exit 0 (1)
- imperial_* 32 테이블 created_at/updated_at 존재 (32)
- 신규 RPC 4종 존재 + 권한 정상 (4)
- Kill switch 3종 OFF (3)
- `imperial_get_phase1_kpis()` 반환 14 키 모두 NOT NULL (14)
- `ImperialActivationPanel` 렌더 시 에러 0 (1)
- console error count = 0 동안 60s (1)

## Phase 7 — Documentation & Memory

- `mem://features/phase-4-p1-hyperion` 에 "ALL-GREEN 달성" 섹션 + 변경 목록 추가.
- `mem://index.md` Core 의 Phase 1 LIVE 라인에 "schema synced / kill switches off" 추가.
- `docs/phase4/all-green-runbook.md` 신규: rollback 8분 SOP + 점검 명령어.

---

## Out of Scope (절대 변경 금지)

- `src/packages/wallet/**`, `src/packages/duel/**` 의 betting/settle/burn/treasury 함수 본문
- DB 함수: `imperial_place_phon_bet`, `imperial_settle_*`, `_apply_house_edge_split`, `apply_token_burn`, `request_withdrawal`, `credit_crypto_deposit`, `subscribe_vip_pass_phon`, `claim_daily_attendance_v2`
- Operator chunk 경계, vite manualChunks, dependency-cruiser 룰

## Rollback (≤ 8분)

1. `imperial_rollout_activate(0, auth.uid(), 'rollback')`
2. `imperial_phase1_emergency_pause()`
3. Phase 1 migration 의 ADD COLUMN 은 nullable+default 라 즉시 무해 → 필요 시 `DROP COLUMN IF EXISTS` 핫픽스 migration 준비.
4. Kill switch 행 `enabled=true` 로 즉시 복원.

## Technical Notes

- 모든 신규 함수는 `SECURITY DEFINER` + 명시적 `SET search_path = public` + AAL2/admin 가드.
- `created_at` 추가 컬럼은 모두 `DEFAULT now()` 로 코드 동기화 부담 최소화.
- variable reward 분포는 균등(450..550); near-miss 표시는 payload 메타 `near_miss=true`(보상 ≥545) 용으로만 사용, 실수익 동일.
- ESLint `no-direct-sonner` / `no-raw-channel` 룰 유지 — 신규 코드는 `@/lib/notify`, `@pkg/realtime` 만 사용.
