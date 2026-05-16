# Sim / Verification Log

- 2026-05-16: RPC drift 패치 검증 — `get_my_dashboard_state()` 비로그인 `{}` / 로그인 시 imperial_score, level, today_deposit, lifetime_deposit, trading_cap_today, whale_rank_today, booster, next_milestone 8키. `get_slot_leaderboard('24h',NULL,'total_payout',20)` 200. `get_recent_roulette_spins(20)` 200. `fomo_notifications` GET (level 컬럼 제거) 200. `/sounds/**` 404는 procedural fallback로 silent.
