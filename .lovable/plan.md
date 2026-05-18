# Sprint 4 PR-4 — FomoDockPill (swipe-up Oracle expansion)

## Goal
기존 `FomoFloatingOracle`을 in-place 업그레이드하여 swipe-up 제스처로 Oracle 모달을 열고, dock pill 자체에 `duel-card-glass` + mini `imperial-aurora` 레이어를 입힌다. 머니플로 / 매치메이킹 / `imperial_*` RPC / `useFomoOracle` 로직 모두 0 bytes.

## Scope (단일 파일 in-place + 호출부 무변경)
**Edit:** `src/packages/duel/components/lobby/FomoFloatingOracle.tsx`

호출부(`ImperialDuelLobby.tsx`)와 props (`{ signals, onOpenOracle }`) 시그니처는 그대로 유지 — 마운트/제거 없음.

## Changes
1. **framer-motion 제거 (신규 import 0개 원칙 유지)**
   - `motion.button` → 일반 `<button>` + CSS `animate-[fade-in_.28s_ease-out]` (Tailwind 기존 keyframe 재사용)
   - `import { motion } from "framer-motion"` 삭제 → 신규 import 0개 (실제로는 -1)

2. **Glass + aurora 미니 레이어**
   - 컨테이너 클래스: `duel-card-glass` (PR-1 토큰) + 외곽 amber 보더 유지
   - 내부 절대배치 `<span aria-hidden className="imperial-aurora pointer-events-none absolute inset-0 rounded-2xl opacity-30" />` (mini variant — opacity 30%로 강도 억제)
   - `contain: paint` 추가 (외부 repaint 격리)
   - 기존 `shadow-[...]` 정적 스냅샷 유지 (애니메이션 없음)

3. **Swipe-up → Oracle 확장**
   - `useSwipeGesture<HTMLDivElement>({ threshold: 40, velocity: 0.25, onSwipe })` 적용
   - 버튼을 `<div ref={swipeRef}>` 래퍼로 감싸기 (DOM 한 단계만 추가)
   - `onSwipe = (dir) => { if (dir === "up") { triggerHaptic("medium"); dynamicIsland.show({ kind: "info", text: "오라클 확장 중…", ttl: 1200 }); onOpenOracle(); } }`
   - 버튼 클릭(탭)은 기존 동작 유지 + `triggerHaptic("light")` 추가
   - swipe 힌트: 상단에 `↑ swipe` 마이크로 칩 (text-[9px] opacity-60, 정적)

4. **Hover/Active transform-only**
   - `active:scale-[0.97]` → `active:scale-[0.985]` (PR-2/3 톤 통일)
   - `hover:scale-[1.01] transition-transform duration-140 ease-[cubic-bezier(.2,.8,.2,1)]`

5. **Import 변화**
   - 추가: `import { triggerHaptic, dynamicIsland, useSwipeGesture } from "@/packages/native";`
   - 제거: `import { motion } from "framer-motion";`

## Invariants (불변 가드)
- framer-motion 신규 import: **0** (실제 -1)
- money-flow 8경로 git diff: **0 bytes**
- operator isolation: **0 bytes**
- `imperial_*` RPC / `supabase/migrations/`: **0 bytes**
- 매치메이킹 / duel hooks (`useFomoOracle`, `useDuelRooms`): **0 bytes**
- `VerificationOracleModal` props/로직: **0 bytes**
- transform + opacity only (shadow/filter는 정적 스냅샷만)

## Verification Gate
- DevTools 390×844 idle CPU < 1%
- swipe-up 동작: touch end velocity ≥ 0.25 px/ms 시 모달 오픈
- 클릭(탭)도 여전히 모달 오픈 (데스크탑 fallback)
- `prefers-reduced-motion: reduce` 시 aurora 정지 (기존 CSS 미디어쿼리 재사용)
- `prefers-reduced-transparency: reduce` 시 glass blur 제거
- low-end (`navigator.hardwareConcurrency <= 4`): aurora animation-play-state 정지 — UX 핵심(swipe + haptic + 모달)은 유지
- Safari/iOS: haptic silent no-op, swipe + 모달은 정상
- bundle gz: index 청크 -2~-3KB 예상 (framer-motion 한 호출 제거 효과는 마이너, 측정만)

## LobbyShell 시각 통일감
- Header(PR-1): `glass-card-imperial-strong` + `imperial-aurora` full
- DuelGateCard(PR-2): `duel-card-glass` + `duel-pulse-ring`
- SovereignCard Top1(PR-3): `duel-card-glass` + mini aurora + pulse-ring
- **FomoDockPill(PR-4): `duel-card-glass` + mini aurora (opacity 30%) + amber border**
→ 4개 컴포넌트가 동일한 glass + aurora 언어로 통일

## Out of Scope
- `useFomoOracle` 시그널 로직
- `VerificationOracleModal` 내부 리디자인 (별도 PR 후보)
- 신규 CSS 토큰 추가 (기존 `imperial-aurora` / `duel-card-glass` 재사용)
- swipe-down으로 dock 숨김 (다음 슬라이스)

## Rollback
단일 파일 git revert로 즉시 복구. 호출부 무변경이므로 회귀 위험 0.
