# FOMO v2 강화 — Final Mount & Tuning

FOMO v2의 백엔드(RPC 5종)와 클라이언트 자산(컴포넌트 5종 / 훅 3종)은 이미 빌드되어 동작 중입니다. 이번 작업은 **마운트 보강 + 폴링 주기 정렬 + 톤 검증**만 수행해 본 단계를 공식 종료합니다. 신규 파일 0~1개, 머니플로 0줄 변경.

## 현재 상태 (이미 완료)

**RPC (DB)**
- `get_live_fomo_counters` → `{withdrawing_now, trading_now, founding_seat_contenders, online_now}`
- `get_my_friend_ranking(_limit)` → 추천 그래프 기반 주간 Top N + 본인 행
- `get_my_friend_gap` → `{direction: ahead|behind|alone, gap_phon, other_nickname}`
- `get_my_fomo_notifications` / `mark_fomo_notification_read` / `enqueue_fomo_notification`

**훅** (`src/hooks/`)
- `use-live-fomo-counters.ts` — 모듈 전역 단일 타이머 + 가시성 일시정지, 폴링 주기 = `FOMO_POLL_MS`
- `use-friend-ranking.ts` — `useFriendRanking(limit)` + `useFriendGap()`
- `use-fomo-notifications.ts`

**컴포넌트** (`src/components/fomo/`)
- `LivePayoutCounter` — 출금 인원 (Dashboard·Home 마운트됨)
- `LiveTradingCounter` — 트레이딩 인원 (Home·DashboardBetPanel 마운트됨)
- `FoundingContendersBadge` — Founding Seat 경쟁자 (Dashboard·Home 마운트됨)
- `FriendLeaderboard` — Top 5 + 본인 하이라이트 (Dashboard 마운트됨)
- `FriendGapToast` — 24h 디듀프 격차 토스트 (Dashboard 마운트됨)

**상수** (`src/lib/fomo.ts`)
- `FOMO_POLL_MS = 15_000` ← 사용자 스펙 12초와 불일치
- `FOMO_FRIEND_POLL_MS = 60_000`
- `FRIEND_GAP_DEDUPE_MS = 24h`

## 이번 작업 항목

### 1. 폴링 주기 12초로 정렬
`src/lib/fomo.ts`의 `FOMO_POLL_MS`를 **15_000 → 12_000** 으로 변경. 모든 라이브 카운터(출금/트레이딩/Founding)가 자동 반영됨.

### 2. `/arena` 트레이딩 페이지 헤더에 `LiveTradingCounter` 마운트
현재 트레이딩 페이지(`src/pages/TradingArenaBybit.tsx`)에는 카운터가 없음. 헤더 영역에 lazy + Suspense 로 `LiveTradingCounter` 마운트.

### 3. Warm King 톤 검증
모든 메시지가 이미 톤 가이드 부합 — 변경 없음:
- "지금 이 순간에도 N명의 황제가 출금 중입니다" ✓
- "N명이 트레이딩 중" ✓
- "지금 N명의 황제가 Founding Seat을 노리는 중" ✓
- "폐하께서는 {친구} 황제보다 N PHON 앞서 계십니다" ✓
- "{친구} 황제가 N PHON 앞서 있습니다. 추월의 기회입니다" ✓

### 4. 메모 등재
`mem://features/fomo-v2`에 RPC/훅/컴포넌트/마운트 지점/상수 인덱스 + 향후 확장 포인트 기록. `mem://index.md`에 한 줄 추가.

## 무손상 보장

- **money-flow 8경로**: 0줄 변경 (FOMO는 read-only RPC만 호출)
- **Operator Isolation**: 영향 없음 (admin 코드 미접근)
- **Bundle Budget**: 신규 import 0 — 트레이딩 페이지에는 이미 lazy 컴포넌트 1개 추가 (≈1KB gz)
- **Realtime Partition**: 4-파티션 래퍼 미사용 (의도적). 카운터는 순수 폴링이므로 raw `supabase.channel` 호출 0건. `useWalletChannel` 강제 규칙은 read realtime 에만 적용되며, 본 기능은 RPC 폴링이라 해당 없음
- **Active Governor**: kill switch 무관 read RPC

## 검증

- `node scripts/check-money-flow-freeze.mjs` → PASS 예상 (FOMO 파일은 화이트리스트 외)
- `node scripts/check-operator-isolation.mjs` → CI build 가드
- `npm run size:check` → CI build 가드
- 수동: Dashboard / Home / /arena 진입 → 카운터 12초 갱신, 친구 격차 토스트 24h 디듀프

## 변경 파일 (총 3개)

1. `src/lib/fomo.ts` — `FOMO_POLL_MS` 15_000 → 12_000
2. `src/pages/TradingArenaBybit.tsx` — 헤더에 `<LiveTradingCounter />` lazy 마운트
3. `mem://features/fomo-v2` (신규) + `mem://index.md` (한 줄 추가)
