# 군대 배틀 → 실전 트레이딩 자동 연결

## 현재 동작
`/arena/army` (TradingArenaWithArmy) 에서 REAL 모드로 토글한 뒤 "📈 오른다" 또는 "📉 내린다"를 누르면:
- toast로 "🔥 실전 모드 — /trade 페이지에서 실거래로 진입하세요" 만 뜨고 끝남
- 사용자가 직접 페이지 이동을 해야 해서 동선이 끊김

## 변경 동작
REAL 모드에서 오른다/내린다를 누르면:
1. 짧은 안내 토스트 (선택한 방향 표시) 1회
2. **즉시 `/arena` (TradingArenaBybit, 바이비트급 실전 차트) 로 자동 이동**
3. URL 쿼리로 의도를 넘겨 실전 화면에서 자동 프리필:
   - `/arena?mode=real&side=long&symbol=BTCUSDT&size=100`
   - `/arena?mode=real&side=short&symbol=ETHUSDT&size=100`

Paper 모드는 기존대로 그 자리에서 군대 배틀 진행 (변경 없음).

## 수정 파일 (2개, 프론트엔드만)

### 1) `src/pages/TradingArenaWithArmy.tsx`
- `useNavigate` 추가
- `placeBet` 콜백 안의 `if (mode === "real")` 분기를:
  ```ts
  if (mode === "real") {
    notify.info(side === "long" ? "🔥 실전 LONG 진입" : "🔥 실전 SHORT 진입", {
      description: "실전 트레이딩 화면으로 이동합니다",
    });
    navigate(`/arena?mode=real&side=${side}&symbol=${symbol}&size=${size}`);
    return;
  }
  ```
- 기존 paper 분기, battleStore, 토너먼트/HUD/DopamineLayer/Recovery 흐름은 그대로

### 2) `src/pages/TradingArenaBybit.tsx`
- 마운트 시 `useSearchParams` 로 `mode/side/symbol/size` 읽기
- 값이 있으면:
  - `setMode('real')` (이미 REAL 동의 절차는 군대 페이지에서 사용자가 토글했으므로 그대로 적용; 단 잔액이 0이면 충전 배너가 자동 노출 — 기존 로직)
  - `setSymbol(symbol)` (지원 페어 화이트리스트 검증)
  - `setSize(size)` (숫자/최소값 검증)
  - `side` 는 MegaOrderPanel 의 초기 선택 탭으로 전달 (props가 없으면 `data-prefill-side` 로 노출 후 패널 내부 useEffect로 반영 — 한 파일 안에서 와이어링)
- 이후 쿼리스트링은 `history.replaceState`로 정리 (새로고침 시 무한 재진입 방지)

## 절대 불변
- 기존 군대 배틀 paper 흐름 / battleStore / Recovery / Imperial Score 트리거 / DB / 디자인 토큰 / MegaOrderPanel/OpenPositionsLive 내부 코드 변경 없음
- AdultGate, Magic Link CTA, 운영자 무손실 구조 그대로

## 검증
1. `/arena/army` → REAL 토글 → 동의 → "📈 오른다" → 즉시 `/arena` 로 이동, 바이비트 화면이 BTCUSDT/REAL/롱 사이드/사이즈 100 으로 프리필
2. `/arena/army` → PAPER → "오른다" → 기존 군대 배틀 정상 진행 (회귀 없음)
3. REAL 잔액 0인 경우 `/arena` 이동 후 충전 배너 노출 (기존 로직 그대로)
