# P1-C Hyperion Final v8 — Red/Yellow → Green + Trading Hotfix

Hyperion Dissection 보고서의 모든 🔴/🟡를 🟢로 전환하고, 모바일 하단 탭 중복(첨부 스크린샷)을 포함한 잔여 UI 결함을 마무리한다. 머니플로 8경로 / Crown 백엔드 RPC·테이블·트리거는 절대 무변경.

## 1. Blocker (🔴 → 🟢)

### 1-1. `imperial_get_onboarding_state` 401 (P0)
- migration: `GRANT EXECUTE ON FUNCTION public.imperial_get_onboarding_state() TO anon, authenticated;`
- function 본문은 무변경 (이미 SECURITY DEFINER + 내부 `auth.uid()` 가드).

### 1-2. `withdrawal_status` enum `paid` 누락
- migration: `ALTER TYPE withdrawal_status ADD VALUE IF NOT EXISTS 'paid';`
- 기존 워커가 `paid`로 마킹하려다 22P02로 실패하던 흐름 정상화. completed/paid 별칭 흐름은 워커 코드 무변경(머니플로 8경로 미포함 확인).

### 1-3. `check_achievements` 400
- 시그니처/파라미터 drift 점검 후 클라 호출부(`src/lib/achievements.ts` 등) 인자 정렬. RPC 본문 무변경.

### 1-4. `platform_kill_switches.reason` 의미 반전
- migration: 기존 row의 `reason` 텍스트를 enabled 상태와 일치하도록 정리(`UPDATE ... SET reason = CASE WHEN enabled THEN '활성화' ELSE '비활성화' END WHERE key IN ('phon_betting','phon_staking','phon_swap')`).
- 관리자 토글 UI에 enabled 상태 텍스트를 reason과 분리해서 명시 (혼동 방지).

### 1-5. `uptime_pings.ok NOT NULL` 위반
- chaos-probe/public-status edge에서 INSERT 시 `ok` boolean 기본 false 보강. edge function only, DB 무변경.

### 1-6. Supabase linter 0011 search_path
- 영향 큰 user-callable SECURITY DEFINER 함수에 `SET search_path = public, pg_temp` 누락분 일괄 추가. baseline 테이블 갱신.

### 1-7. `/secure-auth` CLS 0.131 → < 0.05
- 폼 컨테이너 `min-h`, 로고 `width/height` 명시, Pretendard `font-display: swap` + size-adjust, skeleton 고정 높이.

## 2. Layout 통일 (이미 적용분 검증 + Mobile Nav 중복 제거)

- `StakeStyleSidebar.tsx` `useLayoutEffect` + top-level classList — 이미 적용. 회귀 테스트만.
- `App.tsx` 정적 import — 이미 적용. 회귀 테스트만.
- **첨부 스크린샷 이슈**: 모바일 하단에 구버전 4탭(홈/트레이딩/[FAB]/게임/내제국)이 살아있음. 신규 5탭(홈/무료돈벌기/실시간대결/실시간예측/내PHON)으로 단일화.
  - 현재 마운트된 구버전 Nav 컴포넌트(예: `PhonaraNav` + 중앙 FAB) 식별 → 신규 `MobileBottomNav5`로 교체.
  - `Layout`/`App.tsx`에서 중복 Nav 마운트 제거. 단 1개의 Nav만 렌더.
  - safe-area: `env(safe-area-inset-bottom)`, `--kb-inset` CSS var를 `visualViewport.resize`로 갱신, 키보드 올라올 때 hide.

## 3. Bottom Navigation 5탭 최종

| 탭 | 라우트 | 아이콘 |
| --- | --- | --- |
| 홈 | `/dashboard` | Home |
| 무료돈벌기 | `/earn` | Gift |
| 실시간대결 | `/duel` | Swords |
| 실시간예측 | `/trade` | TrendingUp |
| 내PHON | `/phon` | Gem |

active = `imperial` glow variant, haptic on tap.

## 4. Hero & Home 라이브 피드

- Hero 카피 이미 적용. 회귀만.
- 신규 `src/components/dashboard/v3/LiveBetFeed.tsx`:
  - 소스: `get_live_activity_60s` + `get_whale_strikes_24h` 머지
  - 1.8s 간격 `AnimatePresence` slide-in, 최대 12행, win=success/lose=destructive 토큰
  - 30s RPC 재폴 + `useMarketChannel` realtime 보조
  - `DashboardHeroV3` 직하단, Tier S 5장(무료돈벌기/실시간대결/실시간예측/내PHON/Whale Strike) 위에 배치
  - 라벨: "지금 전 세계에서 벌어지고 있는 실시간 베팅"

## 5. Crown UI Strict 0

- `scripts/check-no-crown-ui.mjs` 실행 → 잔존 건 lucide `Crown` → `Sparkles`/`Gem`, "왕관"/"👑" → "PHON 보상"/"✨". 토스트 카피 포함.
- 백엔드 `award_crown` 등 이름/로직은 무변경.

## 6. 트레이딩 화면 긴급 수정 (신규)

### 6-1. 청산/X 버튼 "청산실패" 오류
- 증상: `<LivePositionsTable>` 청산 버튼 → "잠시 후 다시 시도해주세요. 폐하의 자산은 안전합니다" 토스트 후 실패.
- 진단: `close_live_position` RPC 호출부 인자 drift 또는 `imperial_kill_switches.betting` 게이트 오해석으로 추정. RPC 본문/머니플로 무변경 — 호출부만 정렬:
  - 클라이언트에서 RPC 시그니처 실측(`\df+ close_live_position`) → 인자명/타입 일치 확인
  - kill switch가 `withdrawal`/`betting`만 차단하고 close는 항상 허용되는지 확인 (필요 시 클라이언트 가드 분기 조정)
  - 실패 시 error.code/message를 토스트에 함께 노출(디버그용 admin-only)
- 변경 범위: `src/components/trade/LivePositionsTable.tsx`(또는 동등 파일) + 호출 헬퍼 1개. RPC/트리거 무변경.

### 6-2. 모바일 레버리지 슬라이더 미표시
- 증상: 모바일(<768px)에서 RealBetSlip/TradePanel의 Leverage Slider + Isolated/Cross 토글이 보이지 않음.
- 진단: 슬라이더 컨테이너가 `hidden md:flex` 또는 collapse 상태로 묶여 있을 가능성 + `useMyPower().maxLeverage` 로딩 전 null 처리로 unmount.
- 수정:
  - 슬라이더 섹션 모바일 노출 (`flex md:flex`로 변경, BottomSheet 내 sticky)
  - Bybit/Binance식 슬라이더 UI: 1x/5x/10x/25x/50x/100x preset chip + 미세 슬라이더 + Isolated/Cross 라디오
  - `maxLeverage` 로딩 중에는 skeleton, 로딩 후 cap 적용
- 변경 범위: `src/components/trade/RealBetSlip.tsx` 또는 `LeverageSlider.tsx`. 머니플로 무관(`live_positions` INSERT 트리거가 서버에서 cap 강제).

## 7. 27 버그 회귀 표

체크리스트 폼으로 27개 항목 일괄 확인 후 보고 본문에 OK/FAIL 매트릭스 첨부 (코드 무수정, 검증만).

## 8. 성능

- Pretendard `font-display: swap` + preconnect
- 비-critical 라우트 `React.lazy` 점검
- `touch-action: manipulation` 모바일 인터랙티브 요소
- LCP < 1.8s / CLS < 0.05 목표, Lighthouse 모바일 5뷰포트 측정 준비

## 9. 검증 게이트

- `check-no-crown-ui.mjs` = 0
- `check-money-flow-freeze.mjs` 8경로 PASS
- `check-operator-isolation.mjs` PASS
- Supabase linter 0011 잔존 0 (user-callable 한정)
- PC 1440 / Mobile 375·390 sidebar 점프 0, Bottom Nav 단일 5탭
- 모바일 트레이딩 슬라이더 가시성 + 청산 정상 작동
- Build error 0


## 7. 성능

- Pretendard `font-display: swap` + preconnect
- 비-critical 라우트 `React.lazy` 점검
- `touch-action: manipulation` 모바일 인터랙티브 요소
- LCP < 1.8s / CLS < 0.05 목표, Lighthouse 모바일 5뷰포트 측정 준비

## 8. 검증 게이트

- `check-no-crown-ui.mjs` = 0
- `check-money-flow-freeze.mjs` 8경로 PASS
- `check-operator-isolation.mjs` PASS
- Supabase linter 0011 잔존 0 (user-callable 한정)
- PC 1440 / Mobile 375·390 sidebar 점프 0, Bottom Nav 단일 5탭
- Build error 0

## 기술 세부

신규 migration 1개 (GRANT + enum + reason cleanup + search_path patch). 신규 컴포넌트: `LiveBetFeed.tsx`, `MobileBottomNav5.tsx`(없을 경우). 수정: `App.tsx`/`Layout` Nav 단일화, `Casino.tsx`/`Referral.tsx` 잔여 UI, 잔존 Crown 사용처. 머니플로 8경로(`award_crown`, `_apply_house_edge_split`, `imperial_place_phon_bet`, `_settle`, Treasury, Founding, withdrawal, deposit) 본문 git diff = 0 유지.
