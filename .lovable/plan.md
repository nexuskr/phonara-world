# Phase 4 — Phase 1 Observer Mode Hyperion Ignition

Production-grade activation of the existing Phase 1 Observer onboarding stack, with hardened safety gates, a cinematic first-touch, and god-tier real-time monitoring. **Money-flow 8 paths remain git diff = 0**. All new code stays under `imperial_` prefix and operator namespace.

## Scope at a glance

```text
[ Pre-Activation Gates ] -> [ Core Activation ] -> [ Cinematic Onboarding ] -> [ Live Monitor + Apocalypse ]
        35 checks               RPC + cap + RL          Welcome / Daily / Invite       3s KPI + auto-rollback
```

## 1. Pre-Activation Divine Safety Protocol

New file: `scripts/phase4/phase1-hyperion-activation-check.ts`

- 35-gate verifier extending existing `phase1-go-live-check.ts`.
- Confirms: money-flow 8 paths SHA-512 unchanged vs baseline, Circuit Breaker v2 healthy, Auto-Heal cron alive, Observability ingestion < 5s lag, kill switches OFF, RLS lint clean, onboarding RPCs present, rollout phase row exists, Phase1LiveMonitor mounted, AAL2 guard on Command Center.
- Exit non-zero blocks activation.

Money-flow inventory (frozen, no edits):
`useDeposit.ts`, `useDepositRealtime.ts`, `useDepositCountdown.ts`, `bybit-feed.ts`, `useCrashRound.ts`, `MegaOrderPanel.tsx`, `use-kill-switches.ts`, `use-auto-bet.ts` — verified by `scripts/check-money-flow-freeze.mjs`.

## 2. Core Hyperion Activation (DB only — no money-flow touch)

Single migration `..._phase1_hyperion_ignition.sql`:

- `imperial_onboarding_caps` (singleton): `daily_phon_cap`, `current_day_utc`, `granted_today_phon`, `auto_pause` — default 50,000 PHON/day cap.
- `imperial_onboarding_fraud_signals` (user_id, device_fp, ip_hash, ua_hash, risk_score, created_at) — append-only, admin RLS only.
- `imperial_claim_signup_bonus(_device_fp, _ip_hash, _ua_hash)` hardened:
  - Atomic: lock caps row `FOR UPDATE`, check `granted_today + 15000 <= cap`, else return `{status:'cap_reached'}`.
  - Idempotent on `(user_id, source='signup')` partial unique index (already exists).
  - Fraud: reject if any of `(device_fp | ip_hash | ua_hash)` already bound to another claimed user_id; insert into `imperial_onboarding_fraud_signals` either way.
  - Logs to `imperial_observability_events` (`kind='onboarding.signup'`) + `imperial_audit_trail` (new minimal append-only table).
- `imperial_claim_daily_login_bonus()` adds tiny variable-reward jitter (480..520 PHON, server-side `gen_random_bytes`) for near-miss feel; cap-aware.
- `imperial_get_phase1_kpis()` SECURITY DEFINER, admin-only: returns 12 KPIs (signups 24h, daily 24h, total PHON granted 24h, active 5m/1h/24h, invite clicks, first-duel conversion, fraud_rejects_24h, cap_utilization_pct, retention_d1, anomaly_score).
- `imperial_phase1_emergency_pause(_reason)` AAL2: flips `auto_pause=true` on caps row + sets kill switch `imperial_onboarding=ON` (new key, separate from money-flow kill switches).

Rate limit (3 tiers) via existing `enforce_rate_limit`:
- `onboarding_claim_signup` 2/min, `onboarding_claim_daily` 5/min, `onboarding_state_read` 30/min — applied in RPC bodies, not client.

## 3. Cinematic Onboarding (frontend polish only, no logic rewrite)

Existing components already mounted (`ImperialWelcomeDialog`, `DailyLoginRewardToast`, `InviteRailMini`). Hyperion polish:

- `ImperialWelcomeDialog.tsx`: add framer-motion staged entrance (gold halo pulse, crown shimmer), `prefers-reduced-motion` fallback, low-end device degrade via `useDeviceProfile()` (static gradient).
- `useImperialOnboarding.ts`: pass device fingerprint (`src/lib/deviceFingerprint.ts` already exists) + cached IP/UA hashes to `claimSignup`.
- New `src/components/onboarding/FirstDuelInvite.tsx`: appears after step 3 success, deep-links `/duel?from=onboarding`.
- New `src/components/onboarding/ImperialVoidPreview.tsx`: lightweight CSS-only spatial preview rail (no three.js on Layer 1).
- All toasts via `notify.imperial` (Warm King tone).

## 4. Real-time God-Tier Monitoring + Apocalypse Protocol

`Phase1LiveMonitor.tsx` upgraded in place (operator-only chunk):

- Polls `imperial_get_phase1_kpis()` every 3s (was 10s). Realtime subscribe on `imperial_onboarding_grants` for live count flashes.
- 12 KPI cards + sparkline (inline SVG, no new deps).
- Cap utilization bar; if >80% warn, >100% red.
- New `<ApocalypseProtocolPanel/>`: shows fraud_rejects_24h, anomaly_score; one-click `imperial_phase1_emergency_pause` (AAL2 confirm).
- Auto-rollback hook: when `anomaly_score > 0.1%` for 3 consecutive ticks, surfaces a one-click "Auto-Rollback" that calls `imperial_phase1_emergency_pause` + `imperial_rollout_activate(0)`.

## 5. Activation order (runbook)

1. Run `phase1-hyperion-activation-check.ts` → all 35 PASS.
2. Apply migration (caps + fraud + RPC hardening + KPI + pause).
3. Admin opens `/admin/imperial/command-center` (AAL2) → "Activate Phase 1".
4. Watch monitor for 10m / 30m / 1h / 6h / 24h checkpoints.

## Rollback plan (≤15 min)

- One-click `imperial_phase1_emergency_pause` → blocks new claims, leaves existing grants intact.
- `imperial_rollout_activate(0)` returns rollout to Observer-off.
- Migration is additive only (no drops, no money-flow tables touched) → `git revert` of frontend + leaving DB objects in place is safe; or admin SQL `UPDATE imperial_onboarding_caps SET auto_pause=true`.

## Technical guardrails

- No edits to: `useDeposit*`, `bybit-feed`, `useCrashRound`, `MegaOrderPanel`, `use-kill-switches`, `use-auto-bet`, any `imperial_place_phon_bet*` / `_settle*` / `_apply_house_edge_split` / withdrawal / burn / flywheel RPCs.
- Operator isolation: monitor + apocalypse panel live under `src/components/admin/**` and `src/pages/admin/imperial/**` (already operator manualChunk).
- All new RPCs `SECURITY DEFINER`, `search_path=public`, AAL2 where destructive.
- All new tables RLS-enabled, admin-only SELECT, no anon access.

## Deliverables checklist

- [ ] `scripts/phase4/phase1-hyperion-activation-check.ts`
- [ ] Migration: caps + fraud table + audit trail + 4 RPCs + KPI RPC + pause RPC
- [ ] `useImperialOnboarding.ts` (fingerprint args)
- [ ] `ImperialWelcomeDialog.tsx` (cinematic polish)
- [ ] `FirstDuelInvite.tsx`, `ImperialVoidPreview.tsx`
- [ ] `Phase1LiveMonitor.tsx` (3s, 12 KPI, sparklines)
- [ ] `ApocalypseProtocolPanel.tsx` (AAL2 pause + auto-rollback)
- [ ] mem update: `mem://features/phase-4-p1-hyperion`

## Next (Phase 2 readiness)

Once 24h KPIs are green (cap utilization <70%, fraud_rejects <0.5%, d1 retention >25%): open Tier 1 + first Founding Seat batch. No code shipped this round for Phase 2 — only readiness gates documented.
