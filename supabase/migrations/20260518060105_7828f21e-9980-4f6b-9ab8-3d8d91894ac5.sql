
-- Phase 5 Migration B: Targeted REVOKE on 31 internal helpers / triggers / monitors.
-- Money-flow 8 paths / imperial_* function bodies: 0-byte change.
-- Pre-deploy verification: rg "rpc\(['\"](_achv|_apply_house_edge|_crash_|_do_inject|_maybe_upgrade|_recompute_|monitor_lpi|trg_)" -> 0 matches.

-- Internal helpers (15)
REVOKE EXECUTE ON FUNCTION public._achv_increment(uuid, text, numeric, jsonb)        FROM authenticated, anon;
REVOKE EXECUTE ON FUNCTION public._achv_on_attendance()                              FROM authenticated, anon;
REVOKE EXECUTE ON FUNCTION public._achv_on_crown()                                   FROM authenticated, anon;
REVOKE EXECUTE ON FUNCTION public._achv_on_empire_level()                            FROM authenticated, anon;
REVOKE EXECUTE ON FUNCTION public._achv_on_position_close()                          FROM authenticated, anon;
REVOKE EXECUTE ON FUNCTION public._achv_on_stake_insert()                            FROM authenticated, anon;
REVOKE EXECUTE ON FUNCTION public._achv_on_stake_yield()                             FROM authenticated, anon;
REVOKE EXECUTE ON FUNCTION public._achv_record(uuid, text, numeric, jsonb)           FROM authenticated, anon;
REVOKE EXECUTE ON FUNCTION public._apply_house_edge_split(numeric, text)             FROM authenticated, anon;
REVOKE EXECUTE ON FUNCTION public._crash_compute_multiplier(text)                    FROM authenticated, anon;
REVOKE EXECUTE ON FUNCTION public._crash_vip_limits(uuid)                            FROM authenticated, anon;
REVOKE EXECUTE ON FUNCTION public._do_inject_liquidity(numeric, text, numeric, text) FROM authenticated, anon;
REVOKE EXECUTE ON FUNCTION public._maybe_upgrade_nft(uuid)                           FROM authenticated, anon;
REVOKE EXECUTE ON FUNCTION public._recompute_emission_scale()                        FROM authenticated, anon;
REVOKE EXECUTE ON FUNCTION public._recompute_volatility_tier()                       FROM authenticated, anon;

-- Monitor (1)
REVOKE EXECUTE ON FUNCTION public.monitor_lpi_stuck_reserved()                       FROM authenticated, anon;

-- Trigger functions (15) — only fired by table triggers, never callable from API
REVOKE EXECUTE ON FUNCTION public.trg_atelier_jackpot_story()                        FROM authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.trg_baron_promotion_story()                        FROM authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.trg_block_trades_when_halted()                     FROM authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.trg_block_withdrawals_when_halted()                FROM authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.trg_deposit_shadow_eval()                          FROM authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.trg_enforce_leverage_gate()                        FROM authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.trg_live_trade_is()                                FROM authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.trg_mission_history_is()                           FROM authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.trg_package_confirmed_engine()                     FROM authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.trg_recompute_consensus()                          FROM authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.trg_slot_anomaly_promote()                         FROM authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.trg_sm_grant_xp()                                  FROM authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.trg_ua_grant_xp()                                  FROM authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.trg_user_achievement_is()                          FROM authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.trg_user_quest_claim_is()                          FROM authenticated, anon;
