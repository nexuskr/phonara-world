# Imperial Empire Phase 3.5 — Deflationary Flywheel Bible

> IMPERIAL-SINGULARITY v3.5 — Provably-fair, atomic, idempotent, fully auditable.

## 0. Constraints (sacred)

- Money-flow 8 FREEZE paths are **not modified** (git diff = 0).
- Operator code remains in the `operator` chunk; user bundle never imports it.
- All new kill switches default **OFF**; flywheel is dormant until operator activates.
- Realtime: no new channels; existing `useGameChannel` is reused.

## 1. Formulas

```
slippage         = min(0.42, (bet / liquidity_pool)^1.75 * 1.85)
emission_scale   = clamp(0.4, target / circulating, 1.6)
volatility_mult  = { calm:1.00, warm:1.08, hot:1.18, surge:1.30, extreme:1.45 }
house_edge_split = burn 45% | treasury 35% | reward 15% | liquidity 5%
injection_trigger = vol_tier in {surge, extreme} AND treasury > min_reserve
excess_return    = max(0, post_injection_pool - pre_injection_pool * 1.02)
```

## 2. Money Flow (no FREEZE paths touched)

```text
   imperial_settle_phon_bet  (FROZEN — unchanged)
              |
              | (audit trigger, existing)
              v
   _apply_house_edge_split(_total, _ref_id)   -- single tx, idempotent
              |
   +----------+----------+----------+----------+
   |          |          |          |          |
  burn   treasury     reward    liquidity      (4 ledger inserts)
```

Idempotency: `_apply_house_edge_split` skips when any ledger row already exists for `_ref_id`.

## 3. Tables

- `imperial_treasury_ledger` — append-only ledger (kind ∈ burn/treasury/reward/liquidity/injection_in/injection_out)
- `imperial_emission_state` — singleton (id=1)
- `imperial_volatility_window` — 30-min buckets, 5 tiers exact
- `imperial_injection_events` — every injection logged
- `imperial_flywheel_params` + `imperial_flywheel_params_audit` — immutable history of every param change

All admin-read RLS only; user-callable RPCs are explicitly granted.

## 4. RPCs

- `_apply_house_edge_split(total, ref_id)` — internal, atomic 4-leg ledger insert
- `_recompute_emission_scale()` — cron 5m
- `_recompute_volatility_tier()` — cron 1m
- `_do_inject_liquidity(amount, reason, vol_score, tier)` — internal
- `maybe_inject_liquidity()` — cron 2m
- `get_flywheel_snapshot()` — public read (anon + authenticated)
- `admin_get_flywheel_health(_hours)` — admin
- `admin_set_flywheel_param(_key, _value)` — admin, audit-logged
- `admin_force_injection(_amount, _reason)` — admin **AAL2 enforced**

## 5. Kill Switches (default OFF)

- `flywheel_burn` — ON ⇒ routes burn share to treasury instead
- `flywheel_injection` — ON ⇒ blocks all injections (auto + manual)
- `flywheel_emission_scale` — ON ⇒ holds `scale_factor = 1.0`

Live status visible in `/admin/duel` Flywheel panel.

## 6. Frontend layer (presentational only)

- `src/lib/flywheel.ts` — single source of truth
- `useFlywheelSnapshot()` — 30s SWR
- `VolatilityGauge`, `SlippagePreview`, `TreasurySupportBadge` — Imperial glassmorphism
- `RealBetSlip` — Flywheel widgets mounted; betting logic unchanged

## 7. Rollout

1. Migration ships with all kill switches OFF.
2. Internal alpha: operator enables flywheel_burn first; observe 24h.
3. Enable flywheel_injection in surge/extreme conditions after 48h.
4. Full activation after 72h hyper-monitoring (edge 6.2% ±0.15%, slippage distribution stable, 0 critical errors).

## 8. Rollback

- Flip all three kill switches OFF — flywheel becomes inert.
- `admin_set_flywheel_param` change reverts via audit table (`old_value`).
- Ledger is append-only; rollback never deletes history.

## 9. Tests

- `src/__tests__/flywheel/flywheel.test.ts` — split/slippage/clamp/warm-king/Monte Carlo 5000-spin
- DB linter run after migration; new functions inherit `search_path = public`.

## 10. Tuning parameters

Defaults seeded into `imperial_flywheel_params`:

```json
split:                 {"burn":0.45,"treasury":0.35,"reward":0.15,"liquidity":0.05}
slippage:              {"exponent":1.75,"scale":1.85,"cap":0.42}
emission_scale_bounds: {"min":0.4,"max":1.6}
volatility_tiers:      {"calm":1.0,"warm":1.08,"hot":1.18,"surge":1.30,"extreme":1.45}
injection:             {"min_reserve":50000,"max_amount":200000,"trigger_tiers":["surge","extreme"]}
```

All changes flow through `admin_set_flywheel_param`, recorded in `imperial_flywheel_params_audit` with `old_value` / `new_value` / `updated_by` / `ts`.
