
-- Phase 5 Migration B-Fix: revoke PUBLIC grant on the 26 helpers that still had it.
-- Money-flow 8 paths / imperial_* function bodies: 0-byte change.

REVOKE EXECUTE ON FUNCTION public._achv_increment(uuid, text, numeric, jsonb)  FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public._achv_on_attendance()                        FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public._achv_on_crown()                             FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public._achv_on_empire_level()                      FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public._achv_on_position_close()                    FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public._achv_on_stake_insert()                      FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public._achv_on_stake_yield()                       FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public._achv_record(uuid, text, numeric, jsonb)     FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public._crash_compute_multiplier(text)              FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public._crash_vip_limits(uuid)                      FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public._maybe_upgrade_nft(uuid)                     FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public._recompute_emission_scale()                  FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public._recompute_volatility_tier()                 FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.monitor_lpi_stuck_reserved()                 FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_atelier_jackpot_story()                  FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_baron_promotion_story()                  FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_block_trades_when_halted()               FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_block_withdrawals_when_halted()          FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_deposit_shadow_eval()                    FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_enforce_leverage_gate()                  FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_live_trade_is()                          FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_mission_history_is()                     FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_package_confirmed_engine()               FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_recompute_consensus()                    FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_slot_anomaly_promote()                   FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_sm_grant_xp()                            FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_ua_grant_xp()                            FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_user_achievement_is()                    FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_user_quest_claim_is()                    FROM PUBLIC;
