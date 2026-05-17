# Slice 8 — Imperial Duel PVP Phase 1

황제의 1:1 결투 시스템(로비 + 결투장 + 검증 오라클 + FOMO 엔진)을 프론트엔드 전용으로 구축한다. 신규 RPC / edge function / 외부 이미지 / 외부 라이브러리 0. 기존 Imperial 디자인 토큰과 framer-motion만 사용.

## 절대 불변 게이트
- money-flow 8경로 (`MegaOrderPanel`, `useDeposit*`, `useWithdraw`, `bybit-feed`, `useCrashRound`, `use-auto-bet`, `use-kill-switches`) → diff 0
- Operator Isolation, Bundle Budget(180KB index), Phase D/F Push, FREEZE 인벤토리 → diff 0
- 신규 RPC/edge function/외부 이미지 0 — 데모는 결정적(seedrandom-free) 클라 시뮬레이션
- transform/opacity only, reduced-motion 가드, GPU `translateZ(0)`

## 라우트 & 진입
- `/duel` → `ImperialDuelLobby` (lazy chunk `duel`)
- `/duel/arena/:roomId` → `ImperialDuelArena` (lazy chunk `duel`)
- `App.tsx`에 lazy 라우트 2개 추가, PhonaraNav/Home Hero에 "황제의 결투장" 진입 카드 1개

## 파일 구조 (신규)
```text
src/packages/duel/
  index.ts                       # 배럴
  types.ts                       # DuelRoom, DuelRound, OracleProof, FomoSignals
  engine/
    rng.ts                       # HMAC-SHA512 (Web Crypto subtle) 결정적 RNG
    fomo.ts                      # Adaptive Global + Personalized Triggers
    dynamicThreshold.ts          # ±2.2% 동적 임계
    nearMiss.ts                  # near-miss 판정 + slow-down 커브
  hooks/
    useDuelRoom.ts               # 클라 전용 룸 상태 (setInterval governed)
    useFomoOracle.ts             # FOMO 신호 계산 (12s tick + event-driven)
    useDuelTick.ts               # rAF 기반 60fps 틱
  components/
    lobby/
      LobbyShell.tsx             # 3-Wing 레이아웃
      HallOfSovereigns.tsx       # Left: 명예의 전당 (Top 황제 5)
      LiveDuelGates.tsx          # Center: 4 Live Duel cinematic cards
      QuickAscensionRail.tsx     # Right: 빠른 입장 + 8% Jackpot Progress
      FomoFloatingOracle.tsx     # Personalized FOMO Floating Oracle
      HeatLevelBadge.tsx         # Adaptive Heat 1~5
      SpectatorCount.tsx
    arena/
      ThroneStage.tsx            # Cinematic throne reflection bg
      DuelistProfile.tsx         # vs 양측 프로필
      DuelObject.tsx             # Wheel / Card / Dice (variant)
      NearMissBurst.tsx          # slow-down + particle storm
      DuelHud.tsx                # 라운드/상태/CTA
    oracle/
      VerificationOracleModal.tsx # 4-Tab shell (BottomSheet on mobile)
      tabs/ClassicHmacTab.tsx
      tabs/Groth16Tab.tsx        # circuit flow anim + 287B proof badge
      tabs/ZkStarkTab.tsx        # Quantum Shield viz
      tabs/PersonalOracleTab.tsx # FOMO score + tuning graph + trigger history
```

## 디자인 토큰 (기존만 사용)
- bg: `bg-[#0A0503]` 베이스 + `imperial-card`, `imperial-pulse-dot`, `imperial-corner-shine`
- 그라데이션: `from-amber-400 via-amber-300 to-pink-500` (이미 Trade에서 사용 중)
- 폰트: Heading `font-imperial` (= Cinzel/Italiana, 이미 등록), Body 기본 Pretendard
- 글로우: 3 레이어 (inner amber + mid pink + outer rose) — `shadow-[...]` 합성, 신규 토큰 0

## FOMO Engine 사양
- Variable Reward 5단계: Base / Surge / Crown / Empyrean / Divine Jackpot (확률 곡선 클라 시드)
- Dynamic Threshold: 최근 10라운드 결과로 ±2.2% 보정 (seed deterministic)
- Personalized Triggers: near-miss streak, win drought (≥5), royal pass milestone, session resurrection (재방문 ≥30m)
- Public signals 노출 (Groth16 탭): `dynamicOffset`, `personalFomoScore`, `nearMissFlag`, `personalizedTrigger`

## Provably Fair (클라 시뮬, 백엔드 0)
- `engine/rng.ts`: `HMAC-SHA512(serverSeed, clientSeed||nonce)` via `crypto.subtle`
- Groth16/zk-STARK 탭은 시각화 + 287B/Quantum Shield 배지 — 실제 증명은 placeholder string (Phase 2에서 wasm 도입)
- Classic 탭은 실제 HMAC 결과 hex 노출 + reveal 흐름

## 성능
- 모든 신규 화면 `lazy()` + `Suspense` fallback (Warm 로딩)
- framer-motion `LazyMotion` + `domAnimation` features (이미 사용 패턴)
- `EntropyChip` dev 가드를 위해 모든 setInterval은 `runtime.governor` 등록 (categoryKey: `cosmetic`)
- 모바일 BottomSheet (`@/components/ui/bottom-sheet`) spring stiffness 380 / damping 34

## 보안 / 접근
- 모든 라우트 인증 불요 (관전 가능), 결투 입장 CTA만 `useRequireAuth` 가드
- 입력값 sanitize (`@/packages/wallet/lib/sanitize`)
- Rate limit는 백엔드 미터치 — 클라 debounce 600ms + button disabled

## 텍스트 톤 (예시 — 모두 Warm King)
- 로비 헤더: "황제의 대관전 — 폐하의 순간이 기다립니다"
- Near-miss 토스트: "황제의 운이 스치고 지나갔습니다…"
- Heat 5 배지: "황실이 끓어오릅니다"
- 결투 CTA: "옥좌에 오르소서"

## 작업 순서
1. `src/packages/duel/` 골격 + types + engine (rng/fomo/dynamicThreshold/nearMiss) + 단위 시뮬
2. Lobby 5 컴포넌트 + `/duel` 라우트 + 진입 카드 1개
3. Arena (ThroneStage + DuelistProfile + DuelObject + NearMissBurst + Hud) + `/duel/arena/:roomId`
4. VerificationOracleModal 4-Tab (Classic 실제 HMAC, 나머지 시각화)
5. FomoFloatingOracle + HeatLevelBadge 통합, Personal Oracle 탭과 신호 공유
6. QA: 1440 / 390 스크린샷, 60fps 확인, console 0 warning, bundle-budget 확인

## QA 체크리스트
- `npm run build` 후 `index-*.js` size-limit 통과 (180KB)
- `scripts/check-money-flow-freeze.mjs` PASS
- `scripts/check-operator-isolation.mjs` PASS
- Lobby/Arena/Oracle 데스크탑+모바일 스크린샷, near-miss 트리거 캡처
