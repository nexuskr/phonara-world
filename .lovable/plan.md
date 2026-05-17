# 트레이딩 페이지 UX 대폭 개선 — Pass 1

money-flow 8경로(`MegaOrderPanel.tsx` / `use-auto-bet.ts` / `bybit-feed.ts` 포함) / Operator Isolation / Bundle Budget / Realtime 4-Partition / Active Governor 모두 **무변경**.
이번 Pass 는 `TradingArenaBybit.tsx` (FREEZE 미포함) 레이아웃과 **신규 sibling 컴포넌트**만 추가해 체감을 끌어올린다.

## 작업 범위 — 안전 경계

| 범위 | 가능 여부 | 이유 |
|---|---|---|
| `TradingArenaBybit.tsx` 레이아웃·section 추가 | 가능 | FREEZE 미포함 |
| 새로운 sibling 컴포넌트 (Hot Coin, PnL 헤더, 카운터 등) | 가능 | 신규 파일 |
| `MegaOrderPanel` 내부 레버리지 슬라이더 디자인 변경 | **불가** | FREEZE |
| `bybit-feed` / `use-auto-bet` / 주문 RPC 호출 흐름 변경 | **불가** | FREEZE |
| Bottom Sheet로 `MegaOrderPanel` 자체를 감싸기 | 가능 | sibling wrapper만 추가, panel 내부 미변경 |

## 1) 페이지 레이아웃 재설계 (`TradingArenaBybit.tsx`)

```text
┌──────────────────────────────────────────────────────┐
│ HubTabs                                             │
│ <RedDisclaimerBanner /> (그대로)                    │
│ <BigPnLHeader />          ← 신규: 총 미실현 PnL 큰 표시  │
│ <PhonAdvantageRibbon />   ← 신규: PHON 20% 할인 + 레버리지 게이트 │
│ <HotCoinRail />           ← 신규: 지금 핫한 코인 5종       │
│ <ChartWithHeader />       (그대로, 확대)            │
│ <LeveragePresetRail />    ← 신규: 5x/10x/25x/50x/100x 칩 + PHON 게이트 안내 │
│ <LiveSideCounter />       ← 신규: 지금 N명 롱 / M명 숏     │
│ ── 데스크톱: 우측 컬럼                                │
│   <MegaOrderPanel />      (FREEZE — 그대로)         │
│ ── 모바일: <MobileOrderSheet> 하단 고정 핸들 + 풀시트│
│   내부에 <MegaOrderPanel /> 그대로 마운트            │
│ <OpenPositionsLive />                              │
│ <TradingHistoryGold />                             │
└──────────────────────────────────────────────────────┘
```

## 2) 신규 컴포넌트 (전부 lazy)

- `src/components/trading/v3/BigPnLHeader.tsx` — `useRealStore` / `usePaperStore` 의 미실현 PnL을 합산 후 **3xl ~ 5xl tabular-nums** 로 표시 + 양수 `text-money-strong` / 음수 `text-destructive` + 변화 시 펄스
- `src/components/trading/v3/PhonAdvantageRibbon.tsx` — "PHON 베팅 시 하우스 에지 -20%" + 본인 PHON 보유량 기반 최대 레버리지 안내 (`useMyPower()`)
- `src/components/trading/v3/HotCoinRail.tsx` — 신규 공개 RPC `get_hot_symbols_24h(_limit)` 호출, 24h 거래량/오픈 포지션 수 Top 5 → 칩 클릭 시 `setSymbol` 이벤트 (`window.dispatchEvent("phonara:set-symbol")`) — panel은 듣지 않으므로 현재는 차트 심볼만 prop drilling 으로 변경. (MegaOrderPanel 자체의 심볼 변경은 FREEZE 이므로 ChartWithHeader 만 반응)
- `src/components/trading/v3/LeveragePresetRail.tsx` — 정보형 칩 5종, 비활성/활성 표시는 `useMyPower().maxLeverage` 기반, 클릭 시 토스트로 "패널에서 해당 레버리지를 선택하세요" 안내 + 패널까지 스크롤 (`scrollIntoView`)
- `src/components/trading/v3/LiveSideCounter.tsx` — 신규 공개 RPC `get_symbol_side_counts(_symbol)` → "지금 N명이 BTC 롱 · M명 숏" + 다수 측 골드 강조
- `src/components/trading/v3/MobileOrderSheet.tsx` — `vaul` 의존성 없이 framer-motion 으로 자체 구현(handle 드래그 + snap 30vh/85vh), children 으로 `MegaOrderPanel` 받음. desktop(`md`+)에서는 자기 자신을 렌더 안 함 — 기존 우측 컬럼 그대로.

## 3) 신규 공개 RPC (SECURITY DEFINER + STABLE)

- `get_hot_symbols_24h(_limit int default 5)` → `(symbol text, open_positions int, traders_24h int, score numeric)` — `live_positions` + `live_position_open_audit` 기반 score 산정
- `get_symbol_side_counts(_symbol text)` → `(longs int, shorts int)` — `live_positions WHERE status='open' AND symbol=_symbol`
- 둘 다 `GRANT EXECUTE TO anon, authenticated`

## 4) 모바일 최적화

- 모든 터치 타겟 `min-h-12` (48px), 본문 폰트 `text-base` 이상
- `MobileOrderSheet` snap: 핸들탭 30vh / 풀시트 85vh
- `<OpenPositionsLive />` 리스트는 **virtualize 없이도 모바일에서 부드럽도록** padding/divider 만 손봄 (스크롤 가벼움 우선)
- Pull-to-refresh: 현재 데이터는 realtime 으로 자동 갱신되므로 별도 P2R 미도입 — overengineering 위험. (대신 `<LivePulseDot />` 으로 "실시간 갱신 중" 도트만 표시)
- Infinite scroll: `TradingHistoryGold` 가 이미 페이지네이션이면 유지, 아니면 별도 PR 로 미룸 (이번 패스 미포함)

## 5) FOMO + 게임화 연동

- `LiveSideCounter` = 종목별 "N명 롱/숏" 실시간 카운터 → 15s 폴링 + visibility-aware
- `PhonAdvantageRibbon` = "PHON 보유 황제 전용 수수료 -20% · 레버리지 최대 100x" 정적 강조 + `useMyPower()` 로 실제 본인 게이트 표시
- 트레이딩 XP: 이미 `phon_level_events` 트리거가 업적 기반으로 동작 중. 트레이드 직접 XP 부여는 머니플로 RPC 변경이 필요하므로 **별도 PR** 로 미룸 (현재는 후속 업적 ‘g_trade_*’ 들이 unlock 되면 기존 `trg_ua_grant_xp` 트리거가 자동 XP 부여 → 우회 연동)

## 6) 검증

- `node scripts/check-money-flow-freeze.mjs` → 0
- `node scripts/check-operator-isolation.mjs` → PASS (CI 빌드)
- `npm run size:check` → PASS (모든 신규 컴포넌트 lazy, index 청크 영향 0)
- 모바일 (`375x812`) 에서 BigPnL/PhonRibbon/HotCoinRail/MobileOrderSheet 확인

## 7) 의도적으로 미포함 (FREEZE 충돌 회피)

- MegaOrderPanel 내부 슬라이더 → 큰 슬라이더 변경: panel 이 FREEZE 라 불가. **외부 LeveragePresetRail 로 가시성·교육 강화**로 대체.
- 트레이딩 직접 XP 부여: 주문 RPC 수정 필요 → 후속 PR.
- "지금 핫한 코인" 클릭 시 주문 패널 심볼 자동 변경: panel 이 FREEZE → 차트만 반응, 패널은 사용자가 수동 선택. (panel 외부에서 `setSymbol` 이벤트만 발행, 듣는 쪽은 추후 freeze 해제 시 연결.)
