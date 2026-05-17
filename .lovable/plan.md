# Landing Page Ultimate First Impression Overhaul

랜딩(`/` = `src/pages/Landing.tsx`)의 첫인상을 Warm King Imperial 톤으로 끌어올린다. money-flow, RPC, Operator Isolation, Bundle Budget, Phase D, Phase F Push 인프라는 0줄 변경.

## 변경 파일

1. **`src/components/empire/ImperialLiveWinsRail.tsx`** — `variant?: "compact" | "full"` prop 추가. `full`이면 행 수(시각 8 → 10), 행 높이, 글자 크기, payout 골드 드롭섀도우, jackpot 강한 펄스/크라운, 진입 slide-in 부드럽게 확장. 기본 동작은 기존(`compact`)과 동일하게 호환.

2. **`src/pages/Landing.tsx`**
   - `ImperialLiveWinsRail` import 추가.
   - `<Hero />` 직후에 `<section className="container py-4 md:py-6"><ImperialLiveWinsRail variant="full" /></section>` 마운트.
   - Hero 리빌드:
     - 배경: Warm Deep Black `#110d1a` 톤 + 미세 골드 입자 오버레이(radial-gradient + noise SVG, 정적, JS 비용 0).
     - 메인 카피: "0원으로 시작해서 매일 돈을 버는 제국" — `font-imperial`(=Cinzel 계열 토큰), 5xl→7xl, 그라디언트 골드→핑크.
     - 서브 카피: "지금 가입하면 첫 입금 10,000 PHON 즉시 지급 + 실시간으로 전 세계 황제들의 승전보를 확인하세요" — Warm Gold(`hsl(var(--gold))`) SemiBold.
     - CTA: "지금 무료로 황제가 되기" — gold→pink 그라디언트 + `glow-imperial` + `pulse-halo` + `+10,000 PHON` 칩.
   - 나머지 섹션(TabPreview / LiveBand / Why / FinalCTA / Footer)은 카피·문구만 Imperial 톤 정리, 구조 유지.

## 원칙

- 디자인 토큰만(`hsl(var(--gold))`, `hsl(var(--pink))`, `font-imperial`, `glow-imperial`, `pulse-halo`).
- 추가 의존성 0, 새 JS 인터벌 0(파티클은 정적 SVG/CSS).
- 모바일 thumb zone: CTA 최소 56px 높이, 화면 하단 안전영역 패딩 유지.
- LCP: Hero 텍스트는 SSR 가능한 정적 마크업으로 유지(이미지/3D 추가 없음).

## 작업 순서

1. `ImperialLiveWinsRail`에 `variant` prop 추가(하위 호환).
2. `Landing.tsx` Hero 리빌드 + Wins Rail 마운트.
3. 빌드 통과 확인.
