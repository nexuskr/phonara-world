# Sprint 1 Week 5 — Crash Game (World #1 Level)

A provably-fair PHON Crash game with cinematic canvas rendering, deep VIP / Avatar / Earn integration, and extreme FOMO surfaces. Designed to feel warmer and more premium than Stake.com while remaining buttery-smooth on low-end mobile.

## 1. Backend (single migration)

Tables (RLS on, owner-only SELECT, INSERT via RPC only):

- `crash_rounds` — `id, seed_hash, seed_revealed, crash_multiplier numeric(8,2), started_at, crashed_at, status (pending|running|crashed)`
- `crash_bets` — `id, round_id, user_id, bet_phon, auto_cashout numeric(6,2) null, cashed_out_at_multiplier numeric(8,2) null, payout_phon, won bool, created_at`
- `crash_hot_streaks` — `user_id pk, streak int, updated_at` (3연승 시 multiplier bonus +5%)

RPCs (all `SECURITY DEFINER`, `set search_path = public`):

- `crash_place_bet(_bet_phon, _auto_cashout)` — PHON 차감, VIP 티어별 max bet 검증, idempotent per active round
- `crash_cashout(_round_id, _multiplier)` — multiplier 검증(현재 round + 서버 clock 기준), payout 적립, hot streak 갱신
- `crash_get_current_round()` — 진행 중 round + remaining bets summary
- `crash_get_recent_wins(_limit)` — 최근 대박 캐시아웃 (마스킹 닉 + avatar_id + multiplier + payout)
- `crash_get_live_bets(_round_id)` — 현재 round 베팅자 리스트 (avatar + bet + status)
- `crash_get_my_stats()` — 총 베팅/승률/최고 멀티/누적 PHON

VIP integration:
- Silver: max bet 50k PHON, multiplier ×1.00
- Gold: 200k, ×1.02
- Platinum: 500k, ×1.05 + fee waiver
- Diamond: 2M, ×1.10 + fee waiver + 자동 hot streak +1

Earn mission: `mission_crash_3` (+150 PHON, daily) — `crash_cashout`에서 자동 카운트.

Provably-fair: server seed hash 공개 → 라운드 종료 시 reveal. Crash multiplier = `floor(100 * 99 / (1 - r)) / 100` (r = sha256(seed).toFloat).

Realtime: `ALTER PUBLICATION supabase_realtime ADD TABLE crash_rounds, crash_bets;`

Edge function `crash-tick` (cron 1s): 라운드 자동 진행 (대기 5s → 진행 → crash → 다음 라운드).

## 2. Frontend

### `/crash` page (`src/pages/Crash.tsx`)

레이아웃 (mobile-first → desktop split):

```text
+---------------------------------------------------+
| Header: 시즌·내 통계·VIP 티어 칩                  |
+---------------------------------------------------+
| Canvas (full-bleed, 16:10)                        |
|   - 로켓 + 파티클 트레일 (warm gold → orange → pink)|
|   - 별/구름 패럴랙스                              |
|   - 중앙 거대 멀티플라이어 (neon glow, pulse)     |
|   - Crash 시 폭발 + 화면 진동 + 슬로모            |
+---------------------------------------------------+
| BetPanel: amount + quick (10k/50k/100k/Max)       |
|   auto cashout 입력, 추천 cashout 칩, 큰 CTA      |
+---------------------------------------------------+
| LivePlayers (좌) | RecentBigWins 피드 (우)        |
+---------------------------------------------------+
| HotStreakBar + NearMissTicker                     |
+---------------------------------------------------+
```

### Components (`src/components/crash/`)

- `CrashCanvas.tsx` — `requestAnimationFrame` 60fps, DPR aware, `OffscreenCanvas` fallback. 멀티플라이어 → 색상 보간(`--gold` → `--orange` → `--pink`). 로켓 SVG path + 파티클 풀(최대 80, 재사용). Crash 이벤트 시 shake (CSS transform on parent) + 골드 파편 burst.
- `MultiplierDisplay.tsx` — 6xl→9xl 반응형, neon glow drop-shadow, beat pulse (0.25s scale 1→1.04).
- `BetPanel.tsx` — VIP 티어별 max bet, auto cashout, "스마트 추천" (최근 10라운드 median × 0.8). 진행중에는 cashout 버튼으로 변경. 44px+ 터치.
- `LivePlayersPanel.tsx` — realtime `crash_bets` subscription, avatar chip + bet + status. 가상화(최대 20개 노출).
- `BigWinsFeed.tsx` — `crash_get_recent_wins` 30s polling + realtime, "XX님이 87.4x에서 2,847,000 PHON 캐시아웃!" 마키.
- `NearMissTicker.tsx` — crash_multiplier ≥ 98 라운드 강조 토스트 + 마키 라인.
- `HotStreakBar.tsx` — useMyCrashStats, 🔥 1/2/3 시각화, 3연승 시 골드 글로우 + +5% 칩.
- `CrashCashoutCelebration.tsx` — high cashout(≥10x or ≥1M PHON payout) 시 `BigWinShareDialog` 자동 오픈 (equipped avatar overlay 재사용).
- `useCrashRound.ts` — round 상태머신 훅 (server time sync, drift correction).
- `useCrashHaptic.ts` — `navigator.vibrate` 단계별 (5x/10x/20x/crash).

### Sound (옵션, lazy)
`src/lib/crashAudio.ts` — WebAudio API, build-up sine sweep + crash noise burst. localStorage `crash:mute` 토글.

### Integration
- `App.tsx`: `const Crash = lazy(() => import("./pages/Crash.tsx"));` + route `/crash`
- Main nav (Layout / PowerHeader / HubTabs): "Crash" 항목 추가 (🚀 아이콘, NEW 뱃지)
- `MissionsCard`: `mission_crash_3` 행 추가 (+150 PHON, "지금 플레이" CTA → /crash)
- `BigWinShareDialog`: 기존 equipped avatar overlay 재사용 (변경 없음)
- VIP 티어 표시: `VipTierBadge` 헤더에 사용

## 3. Performance & UX 규칙

- Canvas: 단일 RAF 루프, 객체 풀, 파티클 80 cap, low-end(DPR<2 && innerWidth<480) 시 파티클 40으로 강등
- 모든 framer-motion 0.2~0.3s, `prefers-reduced-motion` 존중 (shake/슬로모 비활성)
- 디자인 토큰만: `--gold`, `--pink`, `--card`, `--text`, `--muted`, plus 새 `--orange` 토큰 (warm 보간용)
- 50-70대 친화: 큰 글자 베팅 결과 토스트, 한글 우선, 명확한 색대비 (gold on dark)
- Realtime 구독은 `useRealtimeChannel` 단일 진입점 사용 (mem://realtime/unified-channel)
- Notify는 `@/lib/notify`, EmptyState/LoadingState 프리미티브 사용

## 4. Files

Created:
- `supabase/migrations/<ts>_crash_game.sql`
- `supabase/functions/crash-tick/index.ts` + cron schedule
- `src/pages/Crash.tsx`
- `src/components/crash/{CrashCanvas,MultiplierDisplay,BetPanel,LivePlayersPanel,BigWinsFeed,NearMissTicker,HotStreakBar,CrashCashoutCelebration}.tsx`
- `src/components/crash/hooks/{useCrashRound,useCrashHaptic,useMyCrashStats}.ts`
- `src/lib/crash.ts` (RPC 래퍼), `src/lib/crashAudio.ts`

Edited:
- `src/App.tsx` (lazy route)
- `src/components/Layout.tsx` / nav (Crash 진입점)
- `src/components/earn/MissionsCard.tsx` (+mission_crash_3)
- `src/index.css` / `tailwind.config.ts` (--orange 토큰)

## 5. Acceptance

- 60fps on mid-tier Android (Pixel 4a급) — DevTools perf trace로 검증
- 라운드 진행/크래시/캐시아웃 e2e: 베팅 → auto cashout 트리거 → 잔액 반영
- Hot streak 3연승 시 다음 라운드 multiplier ×1.05 적용
- 10x↑ 캐시아웃 시 BigWinShareDialog 자동 (equipped avatar 노출)
- VIP Diamond 계정에서 max bet 2M, multiplier ×1.10 적용
- `/crash` 메인 네비 진입, mission_crash_3 카운트 + 클레임
- 모바일 44px+ 터치, 디자인 토큰만 사용, zero regression
