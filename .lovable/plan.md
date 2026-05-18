# Sprint 4 PR-3 — SovereignCard v2 (Hall of Sovereigns)

## Goal
`HallOfSovereigns.tsx`를 transform/opacity-only 원칙으로 업그레이드하여 Top 1 황제 카드에 미니 aurora 효과 + haptic 연동을 적용한다. 머니플로/매치메이킹/imperial_* RPC 모두 0 bytes.

## Scope (단일 파일 in-place)
**Edit:** `src/packages/duel/components/lobby/HallOfSovereigns.tsx`

신규 파일 없음. CSS 토큰(`imperial-aurora`, `duel-card-glass`, `duel-pulse-ring`)은 PR-1에서 만든 것 재사용.

## Changes
1. **컨테이너**
   - `imperial-card imperial-corner-shine` → `duel-card-glass` (PR-2와 톤 통일)
   - `contain: paint` 추가하여 외부 리페인트 차단

2. **Top 1 (Emperor) 항목**
   - 별도 `<li>` 분기로 추출 (rank 1 행만 강화)
   - 배경 레이어에 `imperial-aurora` (mini variant, scale 축소 적용 — opacity-only로 강도 조절)
   - 항목에 `duel-pulse-ring` (느린 2.4s, 골드 톤)
   - 기존 `boxShadow`는 정적 스냅샷만 유지 (애니메이션 없음)

3. **모든 항목 (Top 1~5)**
   - 클릭/탭 시 `triggerHaptic("light")` (Top 1은 `"medium"`)
   - 키보드 접근성: `role="button"` + `tabIndex={0}` + `onKeyDown` Enter/Space
   - hover/active transform: `scale(1.01)` / `scale(0.985)` 140ms cubic-bezier
   - `transition-colors` → `transition-transform` 로 교체 (compositor-only)

4. **Import 추가**
   - `import { triggerHaptic } from "@/packages/native";`

## Invariants (불변 가드)
- framer-motion 신규 import: **0**
- money-flow 8경로 git diff: **0 bytes**
- operator isolation: **0 bytes**
- `imperial_*` RPC / `supabase/migrations/`: **0 bytes**
- 매치메이킹 / duel hooks: **0 bytes**
- transform + opacity only (box-shadow는 정적 스냅샷만)

## Verification Gate
- DevTools 390×844 idle CPU < 1%
- `prefers-reduced-motion: reduce` 시 aurora/pulse-ring 정지 (기존 CSS 미디어쿼리 재사용)
- `prefers-reduced-transparency: reduce` 시 glass blur 제거 (기존 토큰 재사용)
- low-end (`navigator.hardwareConcurrency <= 4`) — aurora animation-play-state 정지 (기존 토큰 자동 적용)
- 키보드 Tab 순회 + Enter haptic 동작
- bundle gz < 180KB

## Out of Scope
- 실데이터 연동 (현재 mock SOVEREIGNS 그대로)
- 신규 CSS 토큰 추가
- 카드 클릭 시 라우팅/모달 (haptic만, dynamicIsland는 PR-4에서 검토)

## Rollback
단일 파일 git revert로 즉시 복구.
