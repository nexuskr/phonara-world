# Phase E — Slice 3: 게임 로비 + Imperial Card System

목표: `/games` · `/casino` 카드 시스템을 Stake.com 압살 수준의 Imperial Card로 통일. 슬롯 내부(Phase D 동결) / 라우팅 / 비즈니스 로직은 1줄도 건드리지 않는다. money-flow 8경로, Operator Isolation, Bundle Budget, three3d 청크 무손상.

## 범위

1. **공통 Imperial Card 토큰 (`src/index.css` 추가만)**
   - `.imperial-card` — 20px radius, glassmorphism(`backdrop-blur-md` + `hsl(var(--card)/0.55)`), Warm Gold 보더(`hsl(38 92% 55% / 0.45)`), inner gold ring, `contain: layout paint`, `will-change: transform`.
   - `.imperial-card-hover` — 220ms ease-out, `translateY(-4px) scale(1.015)`, Imperial Half-Off glow shadow 강화.
   - `.imperial-pulse-dot` — "지금 잭팟 대기 중" 우상단 빨강↔골드 펄스 닷(1.4s, `prefers-reduced-motion` OFF).
   - `.imperial-corner-shine` — hover 시 좌상단 → 우하단 골드 sheen 라인(2.2s, opacity 0.0↔0.35).

2. **FOMO 카피 토큰 추가 (`src/lib/glossary.ts` `FOMO` 네임스페이스 확장)**
   - `FOMO.jackpotWaiting = "지금 이 슬롯에서 잭팟이 대기 중입니다"`
   - `FOMO.rarePartsCard = "이 슬롯은 극소수의 황제만이 정복했습니다"`
   - `FOMO.legendaryCrownCard = "Legendary Crown 보유자만의 무대"`
   - 기존 5종 그대로 유지, 추가만.

3. **`src/pages/Casino.tsx` 카드 폴리시**
   - 기존 카드 wrapper `div`(border-2 + bg-cover)를 `.imperial-card .imperial-card-hover` 로 교체, aspect-ratio / 로고 / 메타 위치 유지.
   - 카드 우상단에 `<JackpotPulseDot/>` (locally inlined span + `imperial-pulse-dot`) — 비-coming soon 항목 무작위 30% 또는 RTP ≥ 96.0 카드에 표기.
   - hover 시 `imperial-corner-shine` 골드 sheen overlay.
   - 카드 `<Link>` 에 `onMouseEnter` / `onFocus` 로 `void import(...)` **prefetch** — 각 슬롯 페이지의 lazy 청크를 hover 시 워밍업. 매핑 테이블은 카드 데이터에 `prefetch: () => import("@/pages/casino/...")` 추가(기존 코드 패턴 유지, 슬롯 내부 무변경).
   - 타이틀 라인 아래 FOMO 미세 카피(`FOMO.jackpotWaiting` 등) `text-[10px] text-amber-200/80` 한 줄 추가.

4. **`/games` 라우트**
   - 현재 `/games` 도 `CasinoLobby` 렌더 — 별도 페이지 신설 없이 위 카드 변경이 그대로 반영. 라우트 추가/이동 없음.

5. **(옵션, Slice 3 한정) `src/pages/Home.tsx` `/games` 진입 CTA 영역**
   - 기존 카드 컨테이너에만 `.imperial-card .imperial-card-hover` 클래스 부여(구조/문구 유지). 다른 홈 섹션은 손대지 않음.

## 비범위

- 슬롯 페이지 내부(`src/components/slots/**`, `src/pages/casino/<Game>.tsx`) — Phase D 동결.
- 라우팅 / 신규 페이지 / RPC / 마이그레이션 / 엣지 / 인증 / 결제 로직.
- Lobby v3(three3d), Avatar Studio, money-flow 8경로(`PRJ_FREEZE_RAW_CHANNEL`).
- Bottom Nav 본체, FAB 본체(Slice 1/2에서 완료).

## 보호 가드

- money-flow 8경로 git diff = 0
- `node scripts/check-operator-isolation.mjs` PASS
- `npm run size:check` PASS (index ≤ 180KB gz, three3d / lobby / wallet / slots 청크 변동 0)
- raw `supabase.channel(...)` 0건 추가, ESLint no-direct-sonner / no-raw-channel 유지
- HSL 토큰만, 인라인 hex 금지
- `prefers-reduced-motion` 에서 pulse / sheen / hover-lift 자동 OFF

## 기술 메모

- Prefetch 패턴:
  ```ts
  const onPrefetch = (g: GameCard) => () => { g.prefetch?.().catch(() => {}); };
  <Link onMouseEnter={onPrefetch(g)} onFocus={onPrefetch(g)} ...>
  ```
- `imperial-card-hover` glow:
  `box-shadow: 0 18px 44px -16px hsl(38 92% 55% / 0.55), 0 0 0 1px hsl(330 85% 60% / 0.35) inset`.
- Pulse dot: 6px, `background: radial-gradient(circle, hsl(0 84% 60%), hsl(38 92% 55%))`, `animation: imperial-pulse 1.4s ease-in-out infinite`.

## 검증 절차

1. `git diff --name-only` — 변경 파일이 위 항목 범위 내인지
2. money-flow grep freeze 0줄
3. `node scripts/check-operator-isolation.mjs`
4. `npm run size:check`
5. 프리뷰 `/games`, `/casino` 카드 hover/Pulse/prefetch 확인 (모바일 viewport 포함)
6. `mem://features/phase-e-slice-3-game-lobby` 신규 등재 + `mem://index.md` 갱신
