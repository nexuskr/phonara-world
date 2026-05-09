# Plan — Decision Intelligence Infrastructure 리브랜딩 + Paper Long/Short Trading Arena (FINAL)

## 범위 원칙 (NON-GOAL — 절대 위반 금지)
- DB 스키마 / RLS / RPC / Auth / 결제 / Empire·Sovereign 플로우 **변경 없음**
- `conversion_events`는 **INSERT 로그 전용** (기존 surface 패턴 그대로)
- `wallet_balances` / `telemetry` / `empire_*` **읽기 전용**
- 기존 라우트·컴포넌트 보존, **추가만**
- 마이그레이션 **0건**
- 모든 Paper Trading 화면 시뮬레이션 disclaimer 고정

## 0. 패키지 추가
```bash
npm install lightweight-charts zustand idb-keyval date-fns
```
- `lightweight-charts` — 실시간 캔들 차트
- `zustand` — Paper Trading 상태 관리
- `idb-keyval` — IndexedDB 영속화
- `date-fns` — 시간/필터 포맷팅

## 1. 카피 리브랜딩
**대상:** `src/pages/Index.tsx`, `index.html`, `src/lib/i18n.ts`

- Hero KO: "세계 AI 의사결정 인텔리전스 인프라"
- Hero EN: "Global AI Decision Intelligence Infrastructure"
- 서브카피: "입금한 돈으로 실시간 Paper Long/Short Trading을 통해 직접 돈을 불려보세요. 한 방이 당신의 인생을 바꿀 수 있다."
- CTA 1차: `[지금 Trading Arena 시작하기]` → `/global-intelligence`
- CTA 2차: `[Infrastructure Tier 참여하기]` → `/empire`
- `<title>` / `<meta description>` / OG / Twitter 카드 ko·en 교체
- 기존 Hero 마크업/애니메이션 보존, 텍스트만 교체

## 2. 신규 정적 페이지 3개
```text
src/pages/Infrastructure.tsx     → /infrastructure
src/pages/IntelligenceLoop.tsx   → /intelligence-loop
src/pages/Vision.tsx             → /vision
```
- `App.tsx`: lazy import + Route 3개
- 모든 페이지 하단: `<Disclaimer />` + Paper Trading 강화 경고
- 모든 페이지 Trading Arena 진입 CTA
- **/infrastructure** — 3-Layer 다이어그램 (Personal Memory · Daily Optimization · Global Learning)
- **/intelligence-loop** — 7노드 SVG + Framer Motion 플라이휠 (Long/Short Decision 골드 강조)
- **/vision** — 매니페스토 ko/en 병기

## 3. /global-intelligence — Paper Trading Arena (핵심)

### 신규 파일 (15)
```text
src/pages/GlobalIntelligence.tsx
src/components/intelligence/LiveCounterRow.tsx
src/components/intelligence/DecisionCoreCard.tsx
src/components/intelligence/PersonalMemoryPanel.tsx
src/components/intelligence/LivePriceChart.tsx          // lightweight-charts
src/components/intelligence/LongShortTradingPanel.tsx
src/components/intelligence/PaperPositionList.tsx
src/components/intelligence/TradingHistoryPanel.tsx
src/components/intelligence/GlobalContributionBar.tsx
src/lib/paper-trading/types.ts
src/lib/paper-trading/store.ts                          // zustand + idb persist
src/lib/paper-trading/engine.ts                         // PnL/청산/레버리지
src/lib/paper-trading/bybit-feed.ts                     // WS + REST 폴백
src/hooks/use-paper-positions.ts
src/hooks/use-bybit-ticker.ts
```

### 레이아웃 (≤947 1열 / ≥1024 2열)
```text
┌─ LiveCounterRow (Today Volume · Live Traders · My Total PnL) ─────┐
├─ DecisionCoreCard (AI 추천 3카드 + Long/Short 프리필) ─────────────┤
├─ LongShortTradingPanel ───────────────────────────────────────────┤
│   LivePriceChart (lightweight-charts + Bybit WS, 1m candles)      │
│   20코인 셀렉트 / 금액 입력 / 1×~100× 레버리지 슬라이더            │
│   초대형 Long·Short 버튼 + 실시간 예상 PnL · 청산가 · 필요 마진     │
├─ PaperPositionList (Open, 실시간 PnL pulse) ──────────────────────┤
├─ TradingHistoryPanel ─────────────────────────────────────────────┤
│   Open / Closed / All 탭 + 기간/Win-Loss/코인/Side 필터 + 검색     │
│   컬럼: 시간 · 코인 · Side · Lev · 진입/청산가 · 실현 PnL · ROI%    │
│   요약: Win Rate · Total PnL · Best Trade · Avg ROI                │
│   [Export CSV] (date-fns + src/lib/csv.ts 재사용)                  │
│   큰 승리 행 골드 하이라이트 + 불꽃 이펙트                          │
├─ PersonalMemoryPanel (최근 결정 이력) ─────────────────────────────┤
└─ GlobalContributionBar + Weekly Top Trader Leaderboard ──────────┘
```

### Bybit Public WebSocket
- `wss://stream.bybit.com/v5/public/linear` (인증 불필요)
- 토픽: `tickers.{SYMBOL}`, `kline.1.{SYMBOL}` — 20코인 화이트리스트
- 자동 재연결, 30s ping, 끊김 시 마지막 가격 캐시 + "Reconnecting…" 배지
- 폴백: REST `/v5/market/tickers` 5s 폴링

### Paper Trading Engine
```ts
type Position = {
  id: string; symbol: string;
  side: 'long' | 'short';
  leverage: number;        // 1..100
  margin: number;          // USDT
  entry: number; openedAt: number;
  closed?: { price: number; at: number; pnl: number; roi: number;
             reason: 'manual' | 'liquidation' };
};
```
- `size = (margin * leverage) / entry`
- `pnl = (price - entry) * size * (long ? 1 : -1)`
- `roi = pnl / margin`, `roi <= -1` 자동 청산, 수수료 0

### 영속화
- `zustand` + `idb-keyval` persist
- 키: `phonara_paper_positions`, `phonara_paper_history`
- 새로고침 시 Open 포지션 현재가로 PnL 재계산
- CSV: 기존 `src/lib/csv.ts`

### Empire Balance 분리 (안전장치)
- `useWallet()` 잔액 **읽기만**, 절대 mutate 금지
- Paper Credit = wallet.available_balance **미러 + 클라이언트 ±**
- UI 두 줄: "Empire Balance (실거래)" / "Trading Credit (Paper)"
- 패널 상단 고정 disclaimer: *"Paper Trading은 학습용 시뮬레이션입니다. 실제 잔액에 영향을 주지 않습니다."*
- "Empire Δ" 컬럼 **(Paper)** 라벨

### Decision Core (규칙 기반 v1)
- 3카드: BTC 단기 / 알트 모멘텀 / 헷지
- 단순 EMA·모멘텀, LLM 호출 없음
- `[이 결정으로 진입]` → TradingPanel 자동 프리필

### LiveCounterRow / Leaderboard
- Today Volume / My Total PnL = 본인 세션 (zustand)
- Live Traders = 정적 시드 + 본인 세션
- 주간 ROI Top5 = 시드 + 본인 세션

## 4. Navigation & 도파민
- `SIDE_EXTRA` 최상단 **Trading Arena** 골드 배지
- 추가 항목: Intelligence Loop / Infrastructure / Vision
- 비로그인 헤더 "Trading Arena" 강조 버튼
- `/global-intelligence` 상단 "My Trading History" 탭 강조
- 승리 청산: Framer Motion 파티클 + 카운트업 + `@/lib/notify` 토스트 + 사운드 옵션(디폴트 OFF)
- Near Miss(-90%~-99% ROI) 시각 텐션, Combo Multiplier, Daily Jackpot 배너 (시각 연출 전용, 실제 정산 X)

## 5. UX 프리미티브 준수 (메모리 룰)
- 빈상태: `@/components/ui/empty-state`
- 로딩: `@/components/ui/loading-state`
- 토스트: `@/lib/notify` (sonner 직접 호출 금지)
- 색상: 디자인 토큰(HSL semantic, primary/imperial)만

## 6. i18n
`src/lib/i18n.ts` ko/en 네임스페이스 append:
- `trading`, `infrastructure`, `intelligence`, `vision`, `nav.tradingArena`

## 7. 텔레메트리
신규 surface 키 (`src/lib/telemetry.ts` 기존 `track()` 사용):
- `hero_infra`, `global_intel_view`
- `paper_trade` (cta_click=open / convert=close / dismiss=cancel, meta: symbol/side/lev/margin)
- `trading_history_view`, `trading_csv_export`

## 8. 검증
- `npm install` + 빌드 통과
- 4개 신규 라우트 200
- Bybit WS 연결/재연결, 20코인 전환, REST 폴백
- Open PnL 1초 이내 갱신, 새로고침 후 복원
- History 정렬·필터·검색·CSV export
- 실 wallet 잔액 변동 0 (useWallet mutate 호출 없음)
- 회귀: 로그인 / 미션 클레임 / 출금 / Empire 결제 진입 수동 확인

## 9. 산출물
- 신규 **15** (3 페이지 + 9 컴포넌트 + 4 lib + 2 hook)
- 수정 **6** (`App.tsx`, `Index.tsx`, `Layout.tsx`, `index.html`, `i18n.ts`, `Empire.tsx` 카피만)
- 패키지 **4**, 마이그레이션 **0**

## 10. 리스크 / 비범위
- 실제 Empire Balance 변동 → 결제·AML·정산 충돌, **비포함** (Paper Credit 미러)
- Live Traders 실수치 집계 → 시드+세션
- AI 결정 v1 규칙 기반, LLM 통합 후속
- 법무: 전 Trading 화면 시뮬레이션 disclaimer 고정. "Decision Intelligence Infrastructure"는 카테고리 묘사 표현
- Daily Jackpot/Combo 등 도파민 연출 시각 전용, 실제 보상 없음 (오인 방지 라벨)
