# FOMO 강화 — Pass 1 (실시간 카운터 + 친구 순위 + 경쟁 유도)

money-flow 8경로 / Operator Isolation / Bundle Budget / Realtime 4-Partition / Active Governor 무변경.
신규 작업은 전부 **읽기 전용 공개 RPC + 신규 컴포넌트** 형태로 추가합니다.

## 1) 실시간 카운터 시스템

신규 공개 RPC (SECURITY DEFINER + `STABLE`, anon/authenticated EXECUTE):
- `get_live_fomo_counters()` → 한 번의 호출로 다음을 반환
  - `withdrawing_now` (최근 10분 내 `withdrawal_requests.status IN ('pending','processing')` 카운트 + jitter floor)
  - `trading_now` (`live_positions.status='open'` 카운트)
  - `founding_seat_contenders` (최근 60분 내 `/empire/galaxy` 활동 또는 `founding_season_seats` 미확정 좌석 시청자 = 단순화하여 활성 세션 휴리스틱)
  - `online_now` (최근 90초 `presence_pings` 또는 fallback 휴리스틱 = `auth.users.last_sign_in_at > now()-90s` count)
- 폴링 주기: 15s SWR (`@pkg/core/swr.ts` 화이트리스트에 추가)

신규 컴포넌트 (lazy):
- `<LivePayoutCounter />` — Dashboard 상단 / "지금 이 순간에도 N명이 출금 중" + 펄싱 도트 (Warm King 골드)
- `<LiveTradingCounter />` — 트레이딩 페이지 상단 (`/dashboard?focus=bet`, `/trade`, `/empire`) / "지금 N명이 트레이딩 중"
  - 마운트 위치: `DashboardBetPanel` 헤더, `LiveDashboard` 상단

훅:
- `useLivePayoutCounter()` / `useLiveTradingCounter()` — 동일 RPC 폴링, 두 훅은 같은 SWR key 공유로 중복 호출 방지

## 2) 친구 순위 (Friend Leaderboard)

"친구" 정의: 본인의 `referrals` (inviter 또는 invitee) 양방향 = 추천 네트워크.

신규 RPC:
- `get_my_friend_ranking(_limit int default 5)` → `{user_id, nickname, weekly_phon_earned, is_me, rank}[]`
  - 본인의 referral 그래프 ∪ 본인 → 최근 7일 누적 PHON 획득 (`phon_level_events.xp_delta` 대신 `referral_earnings` + `daily_chest_opens.phon_reward` + `streak_milestones.phon_bonus` + `phon_level_rewards_claimed.phon_bonus` 합산 → 머니플로우 미터치)
  - 닉네임은 `profiles.nickname` 마스킹 후 노출
- `get_my_friend_gap()` → 본인 직상위/직하위 친구와의 격차 → "친구보다 N PHON 더 벌었어요" 카드용

신규 컴포넌트:
- `<FriendLeaderboard />` — Dashboard 하단 + Profile 카드 2곳 마운트 / Top 5 + 본인 하이라이트 + 다음 친구와의 격차
- `<FriendGapToast />` — Dashboard 마운트 시 1회 자동 토스트 (`notify.passive`), 24h 디듀프 (`localStorage friend_gap_last_shown`)

훅: `useFriendRanking()` (60s SWR), `useFriendGap()`

## 3) FOMO 메시지 강화

- `MissionsCard` 헤더 — 기존 "오늘 완료율" 옆에 펄싱 점 + Warm King 톤 강화: "폐하, 오늘은 N개만 더 완수하시면 됩니다 · 87%의 황제가 이미 클리어"
- `WhaleStrikeRail` / `WhaleStrikeRailV3` 마키 시작 부분에 신규 슬라이드 1장 추가:
  - "👑 지금 N명의 황제가 Founding Seat을 노리고 있습니다" (값은 `get_live_fomo_counters.founding_seat_contenders`)
- 모든 문구는 `g()` 글로서리 톤 (존중어 + 황제/폐하 호칭) 유지

## 4) 검증

- `node scripts/check-money-flow-freeze.mjs` → 0
- `node scripts/check-operator-isolation.mjs` → PASS (build 후 CI)
- 신규 RPC는 모두 `STABLE` + `SECURITY DEFINER` + `SET search_path=public` + `auth.uid()` 가드(친구 RPC만 필요, 카운터 RPC는 공개)
- 신규 컴포넌트는 전부 `React.lazy` + `Suspense` → index/dashboard 청크 영향 0
- Realtime은 추가 채널 없이 **15초 폴링**(SWR) 만 사용 → wallet/game/chat/market 파티션 무변경

## 작업 순서

1. 마이그레이션 1개: 위 RPC 3종 + grants
2. `src/lib/fomo.ts` 상수 (`FOMO_POLL_MS=15000`, `FRIEND_GAP_DEDUPE_MS`, jitter 시드)
3. 훅 4개 / 컴포넌트 4개 / 페이지 마운트 3곳
4. 검증 스크립트 3종
