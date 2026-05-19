# ApexForge Phase 2 — 최종 완료 문서화

## 목표
`docs/apex/house-edge.md` 한 파일을 추가하여 Phase 2를 100% 마무리하고, 사용자가 지정한 최종 보고 포맷으로 결과를 제출한다. 코드/마이그레이션 변경은 **없음**.

## 작업
1. `docs/apex/house-edge.md` 신규 생성
   - 요약표: Dice / Crash / Plinko / Mines = RTP 99.0% (HE 1%), Slots Lite = RTP 97.0% (HE 3%), Sportsbook = vig 4.5%
   - 게임별 수식
     - Dice: `payout = 0.99 / p_win`, `E[X] = 0.99 · stake`
     - Crash: bust 분포 `P(X ≥ x) = 0.99 / x`
     - Plinko: 위험도별 페이아웃 벡터에 `s = 0.99 / mean(payout)` 정규화
     - Mines: `p_safe(K) = C(25−M, K) / C(25, K)`, `payout = 0.99 / p_safe`
     - Slots Lite: 고정 페이아웃 테이블, Σ(p_i · m_i) = 0.9700
     - Sportsbook: `decimal_odds = (1 − vig) / p_true`, vig = 4.5%
   - Monte-Carlo 결과 (n = 100,000, seed 고정)
   - Stake.com 비교표
   - 운영 가드레일 (머니플로 격리, 일일 캡, 음수 잔액 차단, kill switch, provably-fair, `apex_play_audit`)

2. 검증 후 최종 보고 출력
   - `node scripts/check-money-flow-freeze.mjs` (8/8 PASS 기대)
   - `dist/`가 있으면 `node scripts/bundle-budget.mjs` (없으면 "문서만 추가 → 영향 0" 명시)

## 최종 보고 포맷
```
=== ApexForge Phase 2 최종 완료 보고 ===
- 상태:
- RTP 전체 검증 결과:
- House Edge 문서화 완료 여부:
- 머니플로 git diff 결과:
- 번들 사이즈 QA 결과:
- 전체적인 Stake.com 압도 수준 평가:
```
완료 시 "Phase 2 완벽 완료. Stake.com을 압도하는 수준으로 마무리되었습니다." 선언.
