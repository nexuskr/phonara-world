# Phase 1 Hyperion — Onboarding Flow (LIVE)

신규 유저가 0원으로 들어와 cinematic하게 Empire 시민이 되는 경로.

## Touchpoints

1. **`<ImperialWelcomeDialog />`** (App 루트, 1회) — gold halo + 15,000 PHON Signup Bonus claim → `imperial_claim_signup_bonus(_device_fp, _ip_hash, _ua_hash)`. 디바이스 fp + ip/ua hash 는 `useImperialOnboarding` 훅이 자동 부착.
2. **`<DailyLoginRewardToast />`** (App 루트) — 일일 1회, 450~550 PHON 가변 보상 → `imperial_claim_daily_login_bonus()` (서버 랜덤 `gen_random_bytes`).
3. **`<InviteRailMini />`** (Dashboard 상단) — 친구 초대 CTA + 상대 진척도 미니 카드.
4. **`<FirstDuelInvite />`** (Dashboard) — 첫 PHON 보유 시 Duel Arena 진입 유도. 60fps CSS only.
5. **`<ImperialVoidPreview />`** (Dashboard) — Observer 상태에서도 Duel 한 라운드 미리보기 (no money flow).

## Server Safety

- `imperial_onboarding_caps` (singleton row): 일일 50,000 PHON 글로벌 캡. `imperial_claim_signup_bonus` 가 atomic `FOR UPDATE` 로 차감.
- `imperial_onboarding_fraud_signals`: device fp / ip hash / ua hash 중복·이상 신호 append-only 기록.
- `imperial_audit_trail`: 모든 지급/거부 이벤트 (지급액·사유·트레이스).
- `imperial_observability_events`: `phase1_activated`, `phase1_kpi_snapshot`, 그리고 fraud reject / cap exhausted 이벤트.

## Apocalypse Protocol

- `imperial_get_phase1_kpis()` 14종 KPI 중 `anomaly_score`:
  - `>= 0.08%` → `<ApocalypseProtocolPanel />` yellow warning.
  - `>= 0.1%` × 3 tick 연속 → auto-rollback (`imperial_phase1_emergency_pause` + `imperial_rollout_activate(0, …)`).
- 운영자 1-click pause: Command Center → Apocalypse Panel.

## Activation

- `<ImperialActivationPanel />` (Command Center 최상단) — `imperial_rollout_activate(1, auth.uid())` 호출. AAL2 게이트는 `/admin/ops/*` 라우트가 강제.
- 활성화 이후 15s 폴링으로 14 KPI + Apocalypse 상태가 동일 패널에서 실시간 표시.

## Rollback (≤10 min)

1. Command Center → Apocalypse → `Emergency Pause`.
2. `imperial_rollout_activate(0, …)` 로 Observer Off.
3. 지급된 PHON 은 회수하지 않음 (감사 보존). 필요 시 `imperial_audit_trail` 기반 수동 회수.

## Money-Flow Guarantee

- 8경로 (`imperial_place_phon_bet` / `_settle` / `_apply_house_edge_split` / `request_withdrawal` / `credit_crypto_deposit` / `apply_token_burn` / `subscribe_vip_pass_phon` / `claim_loss_protection`) **git diff = 0** 유지.
- Phase 1 의 모든 신규 RPC 는 `imperial_` prefix + `SECURITY DEFINER` + `search_path=public` + observability 자동 로깅.
