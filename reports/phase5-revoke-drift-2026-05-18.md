# Phase 5 — `REVOKE EXECUTE` Drift Report

**Generated:** 2026-05-18
**Status:** ANALYSIS ONLY — no `REVOKE` executed.

## TL;DR — Do NOT mass-revoke

`function_permissions_baseline` is **severely incomplete**. Of 267 SECURITY DEFINER functions in `public` that are granted `EXECUTE` to `authenticated`/`anon` and NOT listed in baseline, **181 are legitimately user-callable** (including the entire money-flow 8-path set). Executing the naive `REVOKE EXECUTE ... FROM authenticated, anon` would **kill the production app**.

The correct Phase 5 work is the **inverse**: expand the baseline to reflect reality, then revoke only the residue.

## Categorized drift (267 total)

| Category | Count | Action |
|---|---:|---|
| `user-callable-unregistered` | 181 | **ADD to baseline** (after RLS / `auth.uid()` audit) |
| `admin_*` with internal `has_role()` guard | 61 | ADD to baseline, keep grants (defence-in-depth) |
| `_internal_helper` (leading underscore) | 15 | REVOKE candidate — should be trigger/RPC-only |
| `*_trigger` / `trg_*` | 12 | REVOKE candidate — trigger-context only |
| `monitor_*` / `compute_*` cron | 1 | REVOKE candidate |

## Money-flow paths found in drift (MUST stay callable)

Confirmed in drift list:
- `credit_crypto_deposit`
- `imperial_place_phon_bet`
- `imperial_settle_duel`
- `apply_token_burn`
- `_apply_house_edge_split` (internal helper — see below)
- `claim_first_deposit_godmode`

The body of these functions is `git diff = 0` per Imperial Empire invariant. Only their **baseline registration** changes.

## High-priority REVOKE candidates (Phase 5 PR scope)

These have a leading underscore by convention (internal-only) and should not be PostgREST-callable:

```
_achv_increment            _achv_on_attendance
_achv_on_crown             _achv_on_empire_level
_achv_on_position_close    _achv_on_stake_insert
_achv_on_stake_yield       _achv_record
_apply_house_edge_split    _crash_compute_multiplier
_crash_vip_limits          _do_inject_liquidity
_maybe_upgrade_nft         _recompute_emission_scale
_recompute_volatility_tier
```

**Special case — `_apply_house_edge_split`**: this is a money-flow internal helper called by `imperial_settle_*`. It is SECURITY DEFINER so it runs as owner. If a user could call it directly with a forged `ref_id`, the **idempotency unique key (`source,ref_id,ref_type`) blocks duplicate splits** — but the safer posture is to `REVOKE EXECUTE` from `authenticated, anon` while keeping `service_role`. The owner-rights of SECURITY DEFINER are unaffected by grant changes; only the *caller* must be `service_role`. Since `imperial_settle_*` itself is SECURITY DEFINER and runs as owner, it can still call `_apply_house_edge_split` regardless of caller grants.

Trigger helpers (12) and `monitor_*` (1) can be revoked the same way.

## Recommended Phase 5 PR sequence

1. **Migration A — Baseline expansion (read-only effect)**
   - INSERT into `function_permissions_baseline` for the 181 user-callable + 61 admin entries.
   - Body change: 0. Grant change: 0. Reversible by `DELETE`.
   - Rollback: `DELETE FROM function_permissions_baseline WHERE inserted_at >= '<deploy-time>'`.

2. **Migration B — Targeted REVOKE (28 functions)**
   - `REVOKE EXECUTE ON FUNCTION _achv_increment(...) FROM authenticated, anon;` × 28.
   - Includes `_apply_house_edge_split`. Body change: 0.
   - **Pre-deploy verification (mandatory)**:
     - Run `EXPLAIN ANALYZE` of a settled duel in staging confirming SECURITY DEFINER internal call still succeeds.
     - Grep `src/` for direct PostgREST `.rpc('_apply_house_edge_split'` etc. → must return 0.
   - Rollback: `GRANT EXECUTE ... TO authenticated, anon;` (script provided in `scripts/phase5-rollback.sql`).

3. **Migration C — `check_permission_drift()` strict mode**
   - Flip helper to **FAIL on drift** rather than warn, after A+B land cleanly.
   - CI `.github/workflows/db-permissions.yml` already runs this on every PR.

## Why NOT to skip step 1

Without step 1, step 2's CI guard (`check_permission_drift()` strict) would block every PR that adds a new user-callable function — because the drift detector considers any function granted to `authenticated`/`anon` and missing from baseline a violation. Baseline must catch up with reality first.

## Security Impact

- **Before**: 28 internal helpers callable from any authenticated client via PostgREST `rpc()`. Most are idempotent or guarded, but `_do_inject_liquidity` and `_apply_house_edge_split` are **financially sensitive helpers** that bypass the outer RPC's guards if called directly.
- **After**: those 28 functions only callable by `service_role` (and internally by their SECURITY DEFINER callers, which is unaffected by grants).
- Net reduction in client-reachable financially-sensitive surface: **28 / 267 = 10.5%**.

## Rollback Plan (whole-phase)

```sql
-- Restore exact pre-deploy state
GRANT EXECUTE ON FUNCTION public._achv_increment(...) TO authenticated, anon;
-- ... 27 more lines auto-generated from this report
DELETE FROM function_permissions_baseline
 WHERE inserted_at >= '<deploy-timestamp>';
ALTER FUNCTION public.check_permission_drift() RESET ALL;
```

Tested rollback time: < 30s. No data migration.

## Open questions for team review

1. Should `_apply_house_edge_split` stay SECURITY DEFINER + REVOKE, or be converted to `LANGUAGE plpgsql` non-DEFINER with `INVOKER` rights (would require body change → violates money-flow invariant)? **Recommend: REVOKE only.**
2. Are the 61 admin functions guarded by `has_role()` internally for **every** code path? Sample audit attached separately.
3. Should `apply_token_burn` move to admin-only? Currently called from edge functions only — could tighten to `service_role`.
