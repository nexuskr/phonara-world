# Slice 7 — Final Visual & Experience Polish (Pre-PVP)

PVP(Imperial Duel)는 Slice 8에서 도입. 그 전에 v19.0의 첫인상·일관성·중독성을 세계 1위 수준으로 끌어올린다.

## 목표

1. Landing — Stake.com을 시각적으로 압도하는 첫 5초.
2. Dashboard — Imperial Live Pulse + Wins Rail을 중심으로 산만함 정리.
3. Navigation + FAB + Color/Depth/Glow 시스템 최종 통일.
4. "와 이거 미쳤다" 강도의 중독성 시그널 강화 (움직임 · 톤 · 깊이).

## 작업 범위 (UI/프리젠테이션만, money-flow 0줄)

### A. Landing (`src/pages/Landing.tsx`, `src/components/empire/ImperialLiveWinsRail.tsx`)
- Hero 깊이 강화: 배경에 미세 gold particle SVG overlay + radial vignette + 상단 hairline gold.
- H1 / 서브카피 spacing & line-height 미세 조정, drop-shadow 토큰화 (`text-shadow-imperial`).
- CTA 강화: pulse-halo 강도 1단계 ↑, 호버 시 gold→pink shift, focus ring 명확화.
- ImperialLiveWinsRail full variant
  - jackpot 행 crown + 회전 코로나 + scale 1.02 미세 호흡.
  - payout 금액에 `text-gradient-imperial` + `drop-shadow-[0_2px_12px_hsl(var(--gold)/0.6)]`.
  - 행 hover lift + corner-shine 적용.
- 하단 trust 라인: imperial-card-thin 으로 격상, 아이콘 통일.

### B. Dashboard (`src/pages/Dashboard.tsx`)
- 상단 정리: `ImperialLivePulseRail` + `ImperialLiveWinsRail` 두 컴포넌트만 hero 위치 유지.
- 그 외 상단 산만 요소(중복 배너, 잔여 마키)는 More 섹션으로 이동 또는 lazy 유지.
- `DashboardHeroV3` 와 두 라이브 레일 사이 spacing 통일 (`space-y-4`).
- KpiGridV3 카드에 `imperial-card-hover` + `imperial-corner-shine` 일괄 적용.
- Casino 진입 카드: glow + pulse-dot 추가, 라벨 톤 통일.

### C. Navigation / FAB (`src/components/PhonaraNav.tsx`, `src/components/empire/HalfOffFab.tsx` 또는 동등 파일)
- 활성 탭 indicator를 gold→pink gradient hairline + 미세 glow로 통일.
- FAB: pulse-halo 강도 통일, idle 시 breathing, hover 시 gold ring 확장.
- 모바일 bottom nav 높이/터치 영역 점검 (48px 이상 보장).

### D. Color / Depth / Glow 시스템 (`src/index.css`, `tailwind.config.ts`)
- 신규 유틸리티 (디자인 토큰만):
  - `.imperial-vignette` — radial gradient overlay.
  - `.text-shadow-imperial` — gold drop-shadow 표준.
  - `.imperial-card-thin` — trust 라인용 얇은 카드.
- 기존 `glow-imperial` / `pulse-halo` / `imperial-card*` 토큰은 그대로, 강도만 변수로 통일.
- Warm Deep Black 배경 (`--background`) 미세 채도 보정 — 차가운 느낌 제거.

## 절대 불변

- money-flow 8경로 git diff = 0줄.
- Operator Isolation, Bundle Budget, Phase D (Avatar+Lobby), Phase F Push 인프라 변경 없음.
- raw `supabase.channel` 직접 호출 금지 — 기존 wrapper 유지.
- 디자인 토큰만 사용. 하드코딩 색상 금지.
- `src/integrations/supabase/*`, `.env`, `supabase/config.toml` 미변경.

## 검증

- `bunx tsc --noEmit` 통과.
- Landing / Dashboard / Home 시각 점검 (preview).
- Bundle Budget 초과 없음 (size-limit).

## 완료 보고

`✅ Slice 7 Final Visual & Experience Polish 완료` + Slice 8 (Imperial Duel PVP) 준비 상태 안내.
