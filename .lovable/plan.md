# Slice 8 Phase 3 — 마무리 통합 (Cosmic Shadow + Oracle God Mode)

## 목표

이전 단계에서 개별 컴포넌트(Shadow Ledger, useShadowBetting, ConfirmBetSheet, ThroneStage v3, DivineJackpotOverlay, NearMissEdgeVignette, Halo2RecursivePanel, StarkFriPanel, Verification Oracle 5-Tab v2)는 모두 생성/리팩터 완료. 남은 작업은 **`ImperialDuelArena.tsx`에 이 조각들을 최종 와이어링**하는 것 뿐. 머니플로 FREEZE는 그대로 유지(Shadow Ledger = sessionStorage only).

## 와이어링 작업

1. **NearMissEdgeVignette 마운트**
   - `<NearMissEdgeVignette intensity={nearMissIntensity} side={nearMissSide} />` 페이지 최상단 fixed 레이어에 추가.

2. **DivineJackpotOverlay 마운트 + 트리거**
   - 정산 시 `tier === "divine"` 이면 `setDivineOpen(true)` + `setDivineWinnerName(...)`.
   - `<Suspense><DivineJackpotOverlay open={divineOpen} winnerName={divineWinnerName} onClose={() => setDivineOpen(false)} /></Suspense>` 추가.

3. **Shadow Ledger reserve/settle 연결**
   - `onPlace` 래퍼: `odds.place(side, amount)` 호출 직전 `shadow.reserve(amount)` 호출, 잔고 부족 시 `notify.warning` 후 거부.
   - 정산 블록(`settled.bet` 분기)에서 `shadow.settle({round, side, stake, winnerSide, payout, hmacShort})` 호출.
   - `BettingPanel`에 `shadowBalance={shadow.balance}` prop 전달.

4. **serverSeedHashPreview 전달**
   - `lastSeedHash` 상태에 직전 라운드 `serverSeedHash` 저장 → `BettingPanel`에 `serverSeedHashPreview={lastSeedHash}` 전달 → ConfirmBetSheet 봉인 해시 미리보기.

5. **Audit log 확장**
   - `auditLog` 엔트리에 `balanceAfter: shadow.balance` 추가 (VerificationOracleModal History Tab 표시용).

## 검증 (수정 후)

- `npm run build` 통과 + bundle index ≤180KB br (DivineJackpotOverlay lazy 청크 분리 확인).
- 콘솔 0 error / 0 warning.
- money-flow diff = 0 (Shadow Ledger는 sessionStorage 만 터치, Supabase 호출 없음).
- 1440 + 390 viewport 스크린샷 5종 + Halo2/STARK Tab 확인.

## 범위 외 (Phase 3.5로 이관)

- `place_duel_bet` / `settle_duel_round` RPC, `duel_bets` / `duel_rounds` 테이블, AAL2/kill switch.
- 실제 Halo2/arkworks WASM 증명 생성.
