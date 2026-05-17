# Slice 8 Phase 2 — Imperial Duel: Spectator + Live Betting + Cinematic Arena

인프라 트랙(Consul/Envoy/Prometheus/cert-manager/자체 WS)은 `phonara-unicorn/` 으로 분리 합의 완료. 본 플랜은 **프론트엔드 단독 끝판왕** 구현에 집중합니다.

## 절대 게이트 (diff 0)
- money-flow 8경로 (`MegaOrderPanel`, `useDeposit*`, `useWithdraw`, `bybit-feed`, `useCrashRound`, `use-auto-bet`, `use-kill-switches`)
- Operator Isolation chunk / Bundle Budget 180KB index
- Phase D/F push, FREEZE 인벤토리
- 신규 RPC / edge function = 0
- 잔액 변동 0 (베팅은 전부 시뮬레이션)

---

## 1. Odds Engine + Variable Reward

`src/packages/duel/engine/odds.ts` (NEW)
- 양측 풀: `{ leftPool, rightPool, totalBets }` 시뮬레이션 ledger.
- 배당: `odds(side) = (total / sidePool) * (1 - HOUSE_EDGE)`, `HOUSE_EDGE = 0.062`.
- Variable Reward Tier (확률 + 멀티, House Edge 6.2% 보존):
  ```text
  Base       64.0%   ×1.00 .. ×1.85
  Surge      23.0%   ×2.10 .. ×4.80
  Crown       8.5%   ×5.50 .. ×12.5
  Empyrean    3.2%   ×15   .. ×38
  Divine      1.3%   ×45   .. ×120   -- 황실 잭팟
  ```
  - Tier 멀티는 tier 내부 균등 분포 + house edge 보정 후 expected payout = 0.938.
  - `rewardTierFromRoll(roll)` 시그니처 유지, 내부 분포만 재튜닝.
- Strong Near-Miss zone: `roll ∈ [0.46, 0.54]` AND winner=opponent → `nearMiss=true`, `intensity = 1 - |roll-0.5|/0.04` (0..1).
  - Near-Miss 효과는 intensity 에 비례 — slow-down 길이, glow 강도, particle 양, 진동 폭이 모두 동적 스케일.

`src/packages/duel/hooks/useOddsEngine.ts` (NEW)
- `useGameChannel({ key: "duel:room:" + roomId })` broadcast 로 풀 ledger 동기화 (presence + broadcast 이벤트만, DB 무영향).
- 0.5s 시뮬레이션 tick 으로 가짜 베터 입장 → 풀 변동.
- API: `{ left, right, odds: {left, right}, place(side, amount), myStake, settleRound(winner) → payout }`.

## 2. Spectator Mode

`src/pages/ImperialDuelArena.tsx` (EDIT)
- URL: `?as=spectator` → 결투 시작 버튼 숨김, BettingPanel 만 활성.
- 모드와 무관하게 양측 응원 사이드바, 라이브 입장 토스트 노출.

`SpectatorDeck.tsx` (NEW)
- 좌/우 군중 비율 게이지 (gold→pink gradient bar).
- 가짜 마스킹 닉네임 ("황제#3094 ▸ 적군 합류") 6초 폴링 토스트.
- "지금 N명이 폐하의 결투를 지켜보고 있습니다" 라이브 헤더.

`useSpectatorSync.ts` (NEW) — `useGameChannel` wrapper, presence count.

## 3. Betting Panel

`BettingPanel.tsx` (NEW)
- Desktop: arena 우측 dock. Mobile: `BottomSheet` (이미 존재).
- Left/Right 진영 카드 (실시간 odds 펄스), 슬라이더(시뮬레이션 PHON 100~50,000), `placeBet` CTA.
- 라운드 종료 시 가상 정산 토스트 (`notify.success`) — 실잔액 변동 없음, 명시 표기 "데모 베팅".
- Thumb-zone: 슬라이더 하단 56px, CTA 56px 높이.

## 4. Cinematic Arena v2

`ThroneStage.tsx` (EDIT)
- 다층 글로우: outer radial + inner highlight + sweep (`background-position` keyframe).
- Crown particle: `canvas-confetti` lazy (이미 의존성), Empyrean/Divine 만 트리거.

`RewardTierBanner.tsx` (NEW)
- 라운드 결과 헤더에 5단계 tier별 카피 + 색상 토큰:
  - Base "황실의 영광" / Surge "황금이 끓습니다" / Crown "왕관이 빛납니다" / Empyrean "천계가 열립니다" / Divine "신성한 대관식입니다 — JACKPOT".

`NearMissBurst.tsx` (EDIT — 강화)
- Near-miss 시 `useDuelTick` 의 `easeStrong=true` → 마지막 0.4s 슬로우 + 화면 scale 1.012 펄스 + 진동 시뮬레이션 (`translateY ±2px` 8Hz).
- "아슬아슬하게 빗나갔습니다 — 폐하의 운이 스치고 지나갔습니다." 토스트.

## 5. Verification Oracle 5th Tab

`VerificationOracleModal.tsx` (EDIT)
- 신규 "Betting Audit" tab — 라운드별 leftPool/rightPool/winnerSide/payout 을 `proof.hmacHex.slice(0,16)` 와 묶어 표 형태로 노출.
- 시뮬레이션이지만 동일 HMAC seed 로 누구나 재계산 가능함을 명시.

## 6. FOMO Layering

`useFomoOracle.ts` (EDIT)
- `spectatorPressure`: `(spectators / 100) + (|leftPool-rightPool| / total) * 25` → `personalScore` 가산 (cap 100).
- 새 트리거 `pool_imbalance` (한쪽 풀 65%+ 시).
- `FomoFloatingOracle` 카피 확장.

## 7. 신규/수정 파일

```text
src/packages/duel/engine/odds.ts                           NEW
src/packages/duel/hooks/useOddsEngine.ts                   NEW
src/packages/duel/hooks/useSpectatorSync.ts                NEW
src/packages/duel/components/arena/BettingPanel.tsx        NEW
src/packages/duel/components/arena/SpectatorDeck.tsx       NEW
src/packages/duel/components/arena/RewardTierBanner.tsx    NEW
src/packages/duel/components/arena/ThroneStage.tsx         EDIT
src/packages/duel/components/arena/NearMissBurst.tsx       EDIT
src/packages/duel/components/oracle/VerificationOracleModal.tsx  EDIT
src/packages/duel/hooks/useFomoOracle.ts                   EDIT
src/packages/duel/engine/fomo.ts                           EDIT  (tier 분포 재튜닝)
src/pages/ImperialDuelArena.tsx                            EDIT
src/packages/duel/index.ts                                 EDIT  (re-export)
```

## 8. QA 체크리스트
- Desktop 1440 + Mobile 390 스크린샷 (Spectator / Better / Near-miss / Divine 잭팟).
- 60fps: framer-motion transform/opacity only, will-change 적용.
- `npm run build` PASS + bundle-budget index ≤180KB.
- `scripts/check-money-flow-freeze.mjs` PASS.
- Console error/warning 0 (기존 entropy/sandbox 잔존만 허용).

## 9. 톤 (Warm King)
- "옥좌에 베팅을 올리소서"
- "폐하의 진영에 N명이 합류했습니다"
- "황실이 뜨겁게 끓고 있습니다 — 배당이 폭발합니다"
- "신성한 대관식입니다 — JACKPOT"
- "아슬아슬하게 빗나갔습니다 — 폐하의 운이 스치고 지나갔습니다"
