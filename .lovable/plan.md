# Phase 1 Observer Mode Ignition

Activate Limited Rollout Phase 1 (Tier 0, Observer Mode) with onboarding free-play money, live Command Center monitoring, and a final go-live verification gate. Money-flow 8 paths remain frozen (git diff = 0). All new objects use `imperial_` prefix.

## 1. Phase 1 Activation (DB)

New migration `phase4_observer_ignition.sql`:

- `imperial_onboarding_grants` table (user_id PK, granted_at, amount_phon, source enum: `signup|daily_login|invite`) — RLS self-select, admin-all.
- RPC `imperial_claim_signup_bonus()` — atomic, idempotent (one row per user, `source='signup'`), credits **15,000 PHON** via existing wallet ledger helper (read-only call into current credit primitive — no edit to money-flow files).
- RPC `imperial_claim_daily_login_bonus()` — idempotent per UTC day (`source='daily_login'`), +500 PHON. Uses unique `(user_id, source, date_trunc('day', granted_at))` partial index.
- RPC `imperial_get_onboarding_state()` — returns `{ signup_claimed, daily_claimed_today, next_reset_at, streak }`.
- Trigger on `auth.users` insert → enqueue signup grant row (claim still requires explicit RPC for auditability).
- Execute `select imperial_rollout_activate(1, auth.uid())` as an admin-run insert (AAL2) — surfaced as a one-click button in Command Center, not auto-fired in migration.

All RPCs: SECURITY DEFINER, `search_path=public`, registered in `function_permissions_baseline`. Logged via `imperial_log_observability(kind='onboarding', ...)`.

## 2. Onboarding Flow (UI)

New files:

- `src/components/onboarding/ImperialWelcomeDialog.tsx` — 3-step (Welcome → Claim 10k PHON → "Place your first Duel"), Warm King gradient, framer-motion 60fps, single CTA → `/arena`. Triggered once via `localStorage phonara:imperial_welcome:v1` + server `signup_claimed=false`.
- `src/components/onboarding/DailyLoginRewardToast.tsx` — first auth event of day calls `imperial_claim_daily_login_bonus`, fires confetti + notify.success.
- `src/components/onboarding/InviteRailMini.tsx` — reuses existing referral code from `beta_invites`/profile, "Share to earn" card on Dashboard.
- Mount `<ImperialWelcomeDialog />` + `<DailyLoginRewardToast />` in `src/App.tsx` (App-root, under AuthBridge).
- Hook `src/hooks/useImperialOnboarding.ts` — wraps the 3 RPCs + Realtime invalidate.

Tutorial routes user to `/arena` with `?focus=duel` → existing `phonara:imperial-focus` event highlights bet slip. No money-flow file edits.

## 3. Realtime Phase 1 Monitoring

Extend Command Center (`src/pages/admin/imperial/CommandCenter.tsx`) with a new top section:

- `<Phase1LiveMonitor />` (new file in `src/components/admin/`) — calls `imperial_get_rollout_state()` every 10s + subscribes to `imperial_observability_events` via `useRealtimeChannel` admin partition.
- KPIs: active Tier-0 users (5m / 1h), signup grants claimed, daily-login claims, first-duel conversion, Observer-mode bet count vs settled=0 invariant, Circuit Breaker state, Auto-Heal last tick, Kill switch matrix.
- "Activate Phase 1" button → calls `imperial_rollout_activate(1)` (AAL2-gated), writes audit row, shows confirm modal with the 18-item checklist summary.

## 4. Go-Live Verification

New script `scripts/phase4/phase1-go-live-check.ts`:

- Re-runs 18-item GO/NO-GO from `docs/duel/phase4-go-nogo-checklist.md` programmatically (money-flow freeze hash, operator isolation marker scan, kernel summary, oracle swap readiness ≥3/5, auto-heal last tick <10m, circuit CLOSED, kill switches OFF baseline, observability events flowing).
- Output `reports/phase1.go-live.<date>.json` + console PASS/FAIL table.

Final report: Command Center screenshot description, all gates re-verified, Phase 2 (24h → Tier 1, cap 50k) prep checklist.

## Technical notes

- Money-flow 8 paths untouched: `imperial_place_phon_bet`, `imperial_settle_*`, `_apply_house_edge_split`, `credit_crypto_deposit`, `request_withdrawal`, `apply_token_burn`, `_grant_phon_for_deposit`, `_grant_nft_for_deposit` — verified via diff hash in go-live script.
- Observer Mode enforcement already lives in `imperial_can_participate` (Tier 0 gate); no money-flow change needed — Phase 1 only flips rollout phase + opens onboarding faucet.
- All new tables/RPCs `imperial_` prefixed. Atomic (single-tx), Idempotent (unique constraints), Observable (`imperial_log_observability`), Auditable (`imperial_rollout_phases`), Rollbackable (`imperial_rollout_activate(0)`).
- Operator Isolation preserved: Phase1LiveMonitor lives under `src/components/admin/` → operator chunk.

## Files

New:
- `supabase/migrations/<ts>_phase4_observer_ignition.sql`
- `src/components/onboarding/ImperialWelcomeDialog.tsx`
- `src/components/onboarding/DailyLoginRewardToast.tsx`
- `src/components/onboarding/InviteRailMini.tsx`
- `src/hooks/useImperialOnboarding.ts`
- `src/components/admin/Phase1LiveMonitor.tsx`
- `scripts/phase4/phase1-go-live-check.ts`

Edited:
- `src/App.tsx` (mount onboarding components)
- `src/pages/admin/imperial/CommandCenter.tsx` (mount Phase1LiveMonitor + Activate button)
- `src/pages/Dashboard.tsx` (mount `<InviteRailMini />`)
- `mem://features/phase-4-limited-rollout` + `mem://index.md` (Phase 1 ignition note)

Money-flow files: **0 edits**.
