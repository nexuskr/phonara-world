# Phase 1 Hyperion Ignition — Final Completion & Live Activation

Phase 1 Hyperion의 모든 기반(Caps, Fraud Signals, Hardened RPC, Apocalypse Protocol, Live Monitor)이 적재 완료된 상태에서, 이번 라운드는 **실제 점화(Activate Tier 1 Observer)** 와 마무리 검증만 수행한다.

## Mission

신규 유저가 0원으로 들어와 Welcome → Signup Bonus → Daily Login → First Duel Invite 전 과정을 cinematic하게 경험하도록 Observer Mode를 **공식 점화**하고, Command Center에서 14 KPI + Apocalypse Protocol이 실시간 작동함을 확인한다.

## Invariants

- Money-flow 8경로 (`imperial_place_phon_bet` / `_settle` / `_apply_house_edge_split` / `request_withdrawal` / `credit_crypto_deposit` / `apply_token_burn` / `subscribe_vip_pass_phon` / `claim_loss_protection`) **git diff = 0**. Pre/Post SHA-512 비교 보고.
- Operator Isolation 유지: 신규 코드는 `src/components/admin/**` 또는 `src/pages/admin/**` 만 수정.
- 모든 신규 객체 `imperial_` prefix. RPC는 SECURITY DEFINER + `search_path=public` + AAL2(파괴적 작업).
- Atomic / Idempotent / Observable / Auditable / Rollbackable / 60fps.

## Scope (this round)

### 1. Pre-Flight Safety Verification

- `bun run scripts/phase4/phase1-hyperion-activation-check.ts` 실행 — 35 게이트 + 8-path SHA-512.
- 보조: `bun run scripts/phase4/phase1-go-live-check.ts` 18-item 게이트 PASS 확인.
- DB 메타 점검 (read-only):
  - `imperial_onboarding_caps` / `imperial_onboarding_fraud_signals` / `imperial_audit_trail` / `imperial_rollout_phases` / `imperial_observability_events` 의 RLS 활성 + `created_at`/`updated_at` 존재 검사.
  - 누락 시 **별도 보완 마이그레이션 1건** (ADD COLUMN IF NOT EXISTS + trigger). 머니플로 무관.

### 2. Tier 1 Activation (AAL2)

활성화는 **운영자가 Command Center UI 버튼에서 직접 트리거**한다 (감사 추적 + AAL2 강제). 본 작업에서는 안내 + 보조 헬퍼만 제공.

- `<ImperialActivationPanel />` 추가 (`src/components/admin/ImperialActivationPanel.tsx`, AAL2 게이트):
  - 현재 `imperial_rollout_phases` 행 상태 표시 (phase / tier / cap / activated_at).
  - "Activate Phase 1 (Tier 1, Observer)" 버튼 → `imperial_rollout_activate(1, auth.uid())` 호출 → `imperial_log_observability('phase1_activated', …)`.
  - 활성화 후 60s 안에 `imperial_get_phase1_kpis()` 첫 스냅샷 자동 fetch + 표시.
- `CommandCenter.tsx` 상단 탭에 신규 패널 마운트.

### 3. Onboarding Flow Final Check (frontend only, no behavior change)

- `ImperialWelcomeDialog` / `DailyLoginRewardToast` / `InviteRailMini` / `FirstDuelInvite` / `ImperialVoidPreview` 마운트 경로(`App.tsx` + `Dashboard.tsx`) 재확인 — 변경 없음 시 그대로 둠.
- `useImperialOnboarding` 가 device fp + ip/ua hash 를 전송하는지 코드 리뷰 (수정 없으면 noop).
- 회귀 방지용 짧은 README: `docs/phase4/phase1-onboarding-flow.md` (텍스트만, 코드 영향 0).

### 4. Live Monitoring Sign-Off

- `<Phase1LiveMonitor />` 3s 폴링 + 14 KPI 카드 + sparkline 정상 렌더 확인 (스크린샷 QA 기록).
- `<ApocalypseProtocolPanel />` 의 임계값 표시 (yellow ≥0.08%, auto-rollback ≥0.1% × 3 tick) 가 실제 RPC 응답과 일치하는지 시각 검증.
- `imperial_observability_events` 에 `phase1_activated` / `phase1_kpi_snapshot` 이벤트가 들어오는지 read-only 쿼리로 확인.

### 5. Documentation & Memory

- `mem://features/phase-4-p1-hyperion` 에 "LIVE (Tier 1 Activated YYYY-MM-DD)" 라인 + 14 KPI 베이스라인 추가.
- `mem://index.md` Core 마지막 줄에 "Phase 1 Observer LIVE: imperial_rollout_phases.phase=1 (Tier 1, cap=50k PHON/d), Apocalypse Protocol armed." 한 줄 갱신 (기존 Phase 4 Limited Rollout 줄 바로 아래).

## Rollback (≤10 min)

1. Command Center → Apocalypse Panel → "Emergency Pause" (`imperial_phase1_emergency_pause`, AAL2).
2. `imperial_rollout_activate(0, auth.uid())` 로 Observer Off.
3. 신규 보너스 발급은 즉시 차단되나, 이미 지급된 PHON 은 회수하지 않음 (감사 보존). 필요 시 admin이 `imperial_audit_trail` 기반 수동 회수.

## Out of Scope

- Money-flow 코드 / 베팅 / 출금 / Burn / Treasury split — **0 byte 변경**.
- Tier 2/3 활성화, Founding Seat Phase 2 오픈 — 다음 라운드.
- 신규 RPC/테이블 — 1번의 보완 마이그레이션이 필요한 경우(컬럼 누락)에만 한정.

## Deliverables

- 1× admin component: `ImperialActivationPanel.tsx` (+ CommandCenter 탭 마운트).
- 0~1× 보완 마이그레이션 (감사/타임스탬프 컬럼 보강, 필요 시).
- 1× docs/phase4/phase1-onboarding-flow.md.
- mem 2건 갱신 (`index.md` Core, `features/phase-4-p1-hyperion`).
- QA Report: SHA-512 pre/post diff, 35-gate + 18-gate 결과, 14 KPI 첫 스냅샷, Apocalypse 임계값 표시 검증.

## Phase 2 Readiness Gates (deferred)

24h 후 다음 조건 충족 시 Tier 2 + Founding Seat 오픈 후보:

- `cap_utilization_24h < 70%`
- `fraud_reject_rate < 0.5%`
- `d1_retention > 25%`
- `warm_king_engagement_score > 0.35`
- `anomaly_score` 24h 평균 `< 0.05%`, max `< 0.1%`
- `apocalypse_triggered_count = 0`
