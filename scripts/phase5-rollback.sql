-- Phase 5 Migration B — ROLLBACK SCRIPT
-- Restores EXECUTE grants to authenticated, anon for the 31 internal helpers / triggers / monitors
-- revoked by migration 20260518_phase5_B_revoke.
--
-- Usage (psql, service_role):
--   \i scripts/phase5-rollback.sql
--
-- Expected runtime: < 30s. No data migration. No body change.

BEGIN;

GRANT EXECUTE ON FUNCTION public._achv_increment(uuid, text, numeric, jsonb)  TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public._achv_on_attendance()                        TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public._achv_on_crown()                             TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public._achv_on_empire_level()                      TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public._achv_on_position_close()                    TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public._achv_on_stake_insert()                      TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public._achv_on_stake_yield()                       TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public._achv_record(uuid, text, numeric, jsonb)     TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public._apply_house_edge_split(numeric, text)       TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public._crash_compute_multiplier(text)              TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public._crash_vip_limits(uuid)                      TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public._do_inject_liquidity(numeric, text, numeric, text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public._maybe_upgrade_nft(uuid)                     TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public._recompute_emission_scale()                  TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public._recompute_volatility_tier()                 TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.monitor_lpi_stuck_reserved()                 TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.trg_atelier_jackpot_story()                  TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.trg_baron_promotion_story()                  TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.trg_block_trades_when_halted()               TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.trg_block_withdrawals_when_halted()          TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.trg_deposit_shadow_eval()                    TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.trg_enforce_leverage_gate()                  TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.trg_live_trade_is()                          TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.trg_mission_history_is()                     TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.trg_package_confirmed_engine()               TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.trg_recompute_consensus()                    TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.trg_slot_anomaly_promote()                   TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.trg_sm_grant_xp()                            TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.trg_ua_grant_xp()                            TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.trg_user_achievement_is()                    TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.trg_user_quest_claim_is()                    TO authenticated, anon;

COMMIT;
