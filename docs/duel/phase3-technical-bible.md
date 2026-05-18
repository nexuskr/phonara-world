# Imperial Duel — PHON Real Betting Phase 3 Technical Bible

IMPERIAL-SINGULARITY edition.

## 1. System Overview

PHON Real Betting (Mode B) is a 1-vs-1 duel pool where users stake internal PHON, settled via verifiable fair RNG (SHA-256 commit-reveal). Target House Edge = **6.20% (620 bps)**.

```text
[User]
  ↓ bet (idem_key)
[edge: imperial-bet-place] —trace_id—→ [RPC: imperial_place_phon_bet]
                                          ├── phon_balances (user → house)
                                          ├── imperial_duel_bets
                                          ├── imperial_house_ledger (pot_in)
                                          └── imperial_duel_audit
  ↓ realtime broadcast on game:imperial_duel:<room_id>
[Spectators] ← CinematicSequence (near_miss_intensity, display-only)
  ↓ settle_at reached
[cron: imperial-duel-cron] → [RPC: imperial_settle_duel]
                                ├── verify SHA-256(server_seed) == commit_hash
                                ├── compute winner side from reveal
                                ├── distribute payoutPool = totalPot × (1 − 0.062)
                                └── imperial_house_ledger (payout_out)
```

## 2. Fairness Proof

- Each room stores `server_seed_hash` (commit) at creation.
- `imperial_settle_duel` requires the original `server_seed`; the RPC re-hashes and rejects mismatches.
- Display signals (`near_miss_intensity`, `cinematic_level`, `perceived_win_rate`) are **read-only** UI hints. They DO NOT influence RNG. Verified by:
  - `admin_get_duel_metrics_24h` `perceived_avg_win_rate` vs `actual_avg_win_rate` (must converge over time).
  - `fairness_proof.display_signals_isolated = true` in admin response.
- Users can independently SHA-256 the revealed `server_seed` and compare to the committed hash visible on the room before lock.

## 3. Money Flow (FREEZE — DO NOT MODIFY)

The 8 protected paths in `imperial_place_phon_bet` and `imperial_settle_duel`:

1. `UPDATE phon_balances SET balance=balance-p_amount WHERE user_id=v_uid` (user debit)
2. `UPDATE phon_balances SET balance=balance+p_amount WHERE user_id=v_house` (house credit)
3. `INSERT INTO imperial_duel_bets ...` (bet record)
4. `INSERT INTO imperial_house_ledger ('pot_in', ...)` (entry ledger)
5. `INSERT INTO imperial_duel_audit ('bet_placed', ...)` (audit trail)
6. `UPDATE phon_balances` (house → winner) inside settle
7. `INSERT INTO imperial_house_ledger ('payout_out', ...)` inside settle
8. `INSERT INTO imperial_duel_audit ('settled', ...)` inside settle

Any guard added (e.g. emergency_freeze, kill switch, telemetry) MUST sit OUTSIDE these blocks. Phase 3 Final added one such guard: `IF v_room.emergency_freeze_flag THEN RAISE 'room_frozen'` immediately after `SELECT … FOR UPDATE`, before any balance mutation.

## 4. Kill Switches & Emergency Freeze

| Layer | Mechanism | Scope | Default |
|------|----------|-------|---------|
| Global | `platform_kill_switches('phon_betting_enabled')` | All rooms | **OFF (disabled)** |
| Per-room | `imperial_duel_rooms.emergency_freeze_flag` | Single room | **false** |
| Access | Beta invite `note LIKE 'duel_internal%'` or admin role | Per user | — |

Toggling order during incident:
1. `admin_set_kill_switch('phon_betting_enabled', false)` — stop all new bets.
2. Optional: per-room `admin_set_duel_emergency_freeze(room_id, true)` if only one room is affected.
3. Investigate via `imperial_duel_telemetry` filtered by `trace_id` or `severity='error'`.
4. Re-enable in reverse order. New devices automatically pick up state via realtime UPDATE on `imperial_duel_rooms`.

## 5. Observability

- All three edges (`imperial-bet-place`, `imperial-bet-settle`, `imperial-duel-cron`) emit a `trace_id` (UUID v4) per request, returned in the `x-trace-id` response header and `body.trace_id`.
- Structured JSON logs go to function stdout; persistent rows go to `imperial_duel_telemetry` via `log_duel_telemetry` RPC.
- `admin_get_duel_health_24h()` returns: bet volume, pot in/out, house edge actual vs target + drift, error rate (bps), active rooms, p95 settle latency, near-miss bucket distribution, thresholds.
- Alert thresholds: `imperial_duel_alert_thresholds` (singleton). Default: drift 10 bps, error rate 5 bps. Configurable from `/admin/duel`.

## 6. Rollback Plan

- **Kill switch flip** is the primary rollback (zero downtime).
- DB migration is purely additive (new table, new column with default, new RPCs). Drop order if a full revert is needed:
  1. `DROP FUNCTION admin_get_duel_health_24h, admin_set_duel_emergency_freeze, log_duel_telemetry;`
  2. `DROP TABLE imperial_duel_telemetry, imperial_duel_alert_thresholds;`
  3. `ALTER TABLE imperial_duel_rooms DROP COLUMN emergency_freeze_flag;`
- Restore the previous body of `imperial_place_phon_bet` from migration history (single line guard is the only diff).

## 7. Test Matrix

| Layer | File | What it proves |
|------|------|----------------|
| Pure math | `src/__tests__/duel/houseEdge.simulation.test.ts` | 5000-spin convergence 6.2% ±0.2%, payout invariant |
| Edge contract | `supabase/functions/imperial-bet-*/index.test.ts` | CORS, AAL2, kill-switch state |
| DB integrity | `imperial_house_ledger.operator_isolation_flag=true` enforced at write site |
| UI safety | `RealBetSlip` returns frozen panel when `frozen=true` (no money-flow surface) |

## 8. Limited Rollout Policy

Internal beta only until 24h of green health:
- House Edge drift ≤ 10 bps for 24h consecutive.
- Error rate ≤ 5 bps for 24h consecutive.
- No `severity='error'` telemetry from `imperial-bet-place` for last 6h.
- p95 settle latency < 1500ms.

Promotion to public toggles `platform_kill_switches('phon_betting_enabled')=true` and removes the `useDuelAccess` gate from the betting page.
