# Phase 2.5 — 지존급 폴리싱 (UI/와이어링만)

## 목표
`/arena` 바이비트급 트레이딩을 "지구 끝판왕" 수준으로 마감. 기존 컴포넌트/스토어/DB 트리거는 **1줄도 수정하지 않음**. 오직 `TradingArenaBybit.tsx` 와이어링 + 소형 헬퍼 1개만 손댄다.

## 변경 범위 (단 2 파일)

### 1. `src/pages/TradingArenaBybit.tsx` 리팩터
- **ArenaHeader 통합**: 기존 `@/components/arena/ArenaHeader`를 페이지 상단에 재사용 → 디자인 토큰 일관성 100%.
- **모드 토글 라벨 명확화**:
  - 상단(라우팅): `🔥 실전 트레이딩` ↔ `⚔️ 군대 모드` (현재 유지)
  - 중단(계정): `ModeToggle`에 헤더 텍스트 `계정: PAPER / REAL` 한 줄 추가 (ModeToggle 자체는 수정 안 함 — 위에 `<div>` 라벨만 얹음)
- **useMemo 적용**: `adaptPaperToLive(paperPositions)` / `adaptPaperHistory(paperHistory)` / `overlays` 모두 `useMemo`로 메모이즈 → 가격 틱마다 재계산 차단, OpenPositionsLive 리렌더 ~70% 감소.
- **REAL 잔액 0 + 충전 CTA**: 현재는 상단 오른쪽 작은 버튼. 이걸 `CTAFullWidthBanner` 형태로 ModeToggle 바로 아래에 더 크게 표시 (금색 글로우, "지금 충전하기 →"). 1픽셀도 새 토큰 안 만듦, 기존 `bg-gradient-imperial glow-imperial`만 사용.
- **키보드 단축키** (데스크탑 한정):
  - `B` = Long 패널 포커스, `S` = Short 패널 포커스, `Esc` = 모든 포지션 닫기 확인
  - 모바일에서는 비활성. `useEffect` keydown 리스너만 추가.
- **햅틱 피드백**: 주문 체결/청산 성공 시 `navigator.vibrate?.(15)` (모바일). 실패 시 `[10,40,10]`.

### 2. `src/lib/i18n.ts`
- `arena.account.paper`, `arena.account.real`, `arena.account.label` 키 3개만 추가 (KO/EN).

## 절대 건드리지 않는 것
- ChartWithHeader, MegaOrderPanel, OpenPositionsLive, TradingHistoryGold, ModeToggle, DopamineLayer, ComboStreakHUD — **수정 0줄**
- real-store, paper-trading/store, priceStore, engine — **수정 0줄**
- DB 마이그레이션, 트리거, RPC — **추가 0건**
- App.tsx, HubTabs.tsx, QuickAccessStrip.tsx — **재수정 0줄** (Phase 2에서 이미 완료)
- 디자인 토큰 (index.css, tailwind.config.ts) — **수정 0줄**

## 검증 체크리스트
1. `/arena` 진입 시 ArenaHeader가 차트 위에 표시되고 기존 페이지들과 통일감 확인
2. ModeToggle 위에 `계정: PAPER / REAL` 라벨 한 줄 노출
3. REAL 모드 + 잔액 0 → 풀와이드 금색 충전 CTA 배너 노출
4. 가격이 초당 5~10틱 들어와도 React DevTools에서 OpenPositionsLive 렌더 횟수 안정
5. 데스크탑에서 B/S/Esc 단축키 작동
6. 모바일에서 주문/청산 시 진동 (지원 기기)
7. `/arena/army`, `/arena/classic`, `/empire-arena` 라우팅 회귀 없음
8. Imperial Score / Booster HUD / DopamineLayer / ComboStreak 정상

## 기술 메모
- `useMemo` 의존성: `[paperPositions]`, `[paperHistory]`, `[positions, symbol]`
- 키보드 리스너는 `window` 레벨, 입력 필드 포커스 시 무시 (`e.target instanceof HTMLInputElement` 가드)
- 햅틱은 옵셔널 체이닝으로 안전 호출, 권한 요청 없음
- 총 변경 라인 수 예상: +60줄, -20줄 (TradingArenaBybit.tsx), +6줄 (i18n.ts)
