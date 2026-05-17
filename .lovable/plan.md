# Slice 8 Phase 3 — Cosmic Shadow Real Betting + Halo2 Recursive / zk-STARK FRI / R1CS God Mode

## 목표
Phase 2의 시뮬레이션 베팅을 **Real-like Shadow Betting** 으로 끌어올리고, Verification Oracle 을 5-Tab Cosmic 시스템(Classic / Groth16 / **Halo2 Recursive** / **zk-STARK FRI + R1CS** / Betting Audit)으로 확장한다. 실잔액 변동 0, 신규 RPC/edge 0, money-flow 8경로 diff 0 을 절대 유지하면서 "실제 돈이 걸린 것 같은" 강도의 UX/FOMO/시네마틱 시각화를 완성한다.

진짜 wallet 차감/정산은 **Phase 3.5** 로 분리 (별도 플랜·AAL2·kill switch·RLS 감사 필요).

## 절대 불변 철칙
- money-flow 8경로 파일 diff = 0 줄
- 신규 RPC / edge function / DB 테이블 = 0
- Operator Isolation, Bundle Budget(index ≤180KB br) 유지
- Phase D/F Push, FREEZE 파일 미터치
- 모든 애니메이션 transform/opacity only, 60fps, will-change, GPU
- Warm King Imperial Empire 톤 200%
- sonner 직접 import 금지 → `@/lib/notify` 만 사용
- realtime 직접 호출 금지 → `@pkg/realtime` 래퍼만 사용 (이번 Phase는 realtime 신규 추가 없음, 기존 시뮬레이션 유지)

## 스코프 (포함 / 제외)

**포함**
1. Shadow Real Betting Layer — 기존 `useOddsEngine` 위에 "내 가상 잔액(local PHON pot)" 가상 차감/지급 + 라운드별 트랜잭션 로그 (메모리/세션 only).
2. PROOF MODE 칩 + Real-like Confirm Sheet (베팅 확정 BottomSheet) + Imperial 햅틱 사운드 없음 (CSS shake/glow만).
3. ThroneStage v3 — 7-Layer Imperial Glow (outer halo / mid corona / inner sweep / floor parallax / pink near-miss aura / divine ray / crown particle ring), nearMissIntensity / rewardTier 둘 다 반응.
4. Divine Jackpot Effect — Tier=divine 시 화면 풀스크린 Imperial Seal + Gold→HotPink particle storm (canvas-confetti lazy 재사용) + `notify.imperial` 대형 토스트.
5. NearMissBurst 강화 — intensity 0.7+ 에서 화면 가장자리 핑크 비네트 + 진동 카피 "황실의 운이 한 끗 차이로 스쳤습니다".
6. Verification Oracle 5-Tab v2 — Classic / Groth16 / **Halo2 Recursive** / **zk-STARK FRI** / Betting Audit. (Personal Tab 은 Classic 안으로 흡수)
   - Halo2 Tab: Pallas↔Vesta cycle SVG 다이어그램 + Accumulator state hash(HMAC 결정적) + Recursive depth slider(시각만) + Imperial Glow.
   - zk-STARK Tab: FRI Folding 단계 시각화(다항식이 절반씩 접히는 SVG 애니메이션 5단계) + R1CS Modular Addition Gate 회로도(64-bit ripple carry SVG, transform-only) + Constraint count 표.
   - 모든 proof hash = HMAC-SHA512 기반 결정적 placeholder. 같은 seed → 같은 hash. "교육용 시각화" 디스클레이머.
7. BettingPanel 강화 — Pool imbalance(>70%) 시 "황실이 한쪽으로 기울고 있습니다 — 배당 폭발 임박" 토스트(30s 쓰로틀), 직전 라운드 winner 진영 골드 ring 0.5s.
8. SpectatorDeck 강화 — Divine Jackpot 라운드 시 "신성한 대관식을 목격한 ◯◯명의 관전자" 카피 + spectator count +30~50 임시 spike (시뮬레이션).

**제외 (Phase 3.5 이후)**
- 실제 wallet balance 차감 / RPC `place_duel_bet`
- 새 테이블 `duel_bets` / `duel_rounds`
- 실제 Halo2/STARK proof 생성 (WASM 번들 추가)
- Supabase realtime 신규 채널
- AAL2 / kill switch `duel_betting`

## 작업 순서

1. **Shadow Ledger** — `src/packages/duel/engine/shadowLedger.ts` (local PHON pot starting at 100,000, round entries `{round, side, stake, payout, balance_after, hmac_short}`, sessionStorage persist `phonara:duel:shadow:v1`).
2. **useShadowBetting hook** — wraps useOddsEngine, settles each round against current oddsLeft/oddsRight, applies House Edge 6.2% already in odds, updates ledger, exposes `place/cancel/balance/history`.
3. **ConfirmBetSheet** — BottomSheet, 베팅액·진영·예상 payout·HMAC seed preview, "옥좌에 봉납하시겠습니까" CTA.
4. **ThroneStage v3** — extend props `rewardTier` + `divineActive`, add 3 new layers (divine ray, crown particle ring, edge vignette), all transform/opacity.
5. **DivineJackpotOverlay** — fullscreen lazy component, canvas-confetti reuse (이미 lazy chunk 존재), Imperial Seal SVG, auto-dismiss 3.2s.
6. **NearMissEdgeVignette** — `position:fixed` pink radial gradient overlay, opacity = intensity*0.55, pointer-events-none.
7. **Halo2RecursivePanel** — SVG Pallas/Vesta cycle, framer-motion stroke-dash animation, accumulator HMAC hash from current round seed.
8. **StarkFriPanel** — SVG polynomial folding (5 steps, each halves width), R1CS modular addition gate SVG (8x8 grid representing 64-bit ripple carry, transform only).
9. **VerificationOracleModal v2** — Tabs 5개 재구성 (Personal → Classic 내부 sub-section), Betting Audit 그대로 유지, BettingAuditEntry 에 ledger balance_after 추가.
10. **ArenaPage 통합** — `useShadowBetting` 결과를 BettingPanel/SpectatorDeck/ThroneStage v3 에 배선, Divine 발생 시 DivineJackpotOverlay 마운트, Near-miss intensity > 0.7 시 NearMissEdgeVignette.
11. **PROOF MODE 칩** — Arena 헤더에 영구 표시, 클릭 시 Oracle 모달 오픈.
12. **QA** — 1440px / 390px 스크린샷 5종(Idle / Confirm / Near-miss / Divine / Halo2 Tab / STARK Tab), `npm run build` 로 index/duel chunk 측정, money-flow diff 0 grep 확인, console 0 확인.

## 기술 메모

- 신규 파일은 모두 `src/packages/duel/**` 하위 — Layer 경계 위반 없음.
- canvas-confetti 는 이미 `useWinCelebration` 등에서 lazy 로 쓰는 청크 재사용 (Bundle 증가 0).
- HMAC placeholder hash = `sha256Hex(`${serverSeed}|halo2:${nonce}`)` / `sha256Hex(`${serverSeed}|stark:fri:${step}:${nonce}`)` — `engine/rng.ts` 재사용.
- ThroneStage 새 레이어 4개 모두 `pointer-events:none` + `will-change:transform,opacity`.
- DivineJackpotOverlay 는 React.lazy + Suspense(null) → Arena chunk 안에 머무름, index bundle 영향 0.
- SVG 회로도는 정적 viewBox + 결정적 좌표 (랜덤 X), 1회 렌더 후 framer-motion `animate` 만 사용.

## 영향 없음 보증
- `src/packages/wallet/**`, `src/hooks/use-wallet.ts`, `phon_balances`, withdraw RPC, push engine 전체 미터치.
- 신규 supabase 호출 0 — Network 탭에 duel 관련 신규 요청 없음.
- 기존 `src/pages/ImperialDuelArena.tsx` 만 수정, 라우트/메뉴 변경 없음.

## QA 기준 (PASS 조건)
- Console error/warning = 0 (entropy 잔존 허용)
- index bundle ≤ 180KB br (현재 105KB → 변동 ±2KB 이내 목표)
- ImperialDuelArena lazy chunk ≤ 60KB br (현재 7.5KB → +SVG/패널 추가로 ~25KB br 예상, 여전히 여유)
- `git diff` 에 `wallet/` `phon_balances` `withdraw` 단어 0회
- 1440 + 390 스크린샷에서 Near-miss vignette / Divine overlay / Halo2 cycle / STARK folding 시각 확인
- Divine Jackpot 1회 강제 트리거(dev only) 후 60fps 유지 (Performance profile)

