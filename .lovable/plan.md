# Phonara God-Tier Game Design System + AETHER 7-Game Import

원본: `AETHER: Golden Glow` (https://aetherbet.lovable.app)
대상: Phonara (Imperial Empire)
미션: AAA 네이티브 카지노급 비주얼 — Stake/Rollbit/BC.Game/Pragmatic/Evolution 합친 것보다 위.

---

## Part 0 — 절대 규약 (전 게임 공통)

| 규약 | 강제 방식 |
|---|---|
| Imperial 토큰만 사용 (`imperial-card`, `gradient-gold`, `text-gradient-gold`, `pulse-halo`, `glow-gold`, `imperial-glow`) | ESLint `no-restricted-syntax` 룰 추가 — raw hex/`bg-yellow-*`/`text-white` 차단 |
| 머니플로 격리 | 베팅·정산은 **RPC 전용** + `_apply_house_edge_split(45/35/15/5)` 재사용 + `imperial_kill_switches` BEFORE INSERT 트리거 |
| 패키지 경계 | 신규 코드 = `@pkg/games/*` 전용. `@pkg/games/core/ui/` 에 공용 럭셔리 프리미티브 |
| Realtime | `useGameChannel(...)` 만 (raw `supabase.channel` 금지) |
| 사운드/햅틱 | `useSlotSound`, `useImperialThunderWithReverb`, `@/lib/haptics` 재사용 |
| Toast | `@/lib/notify` 만 (sonner 직접 금지) |
| 60fps 보장 | `prefersReducedMotion` + `low:/mid:/high:` Tailwind variants + `IntersectionObserver` pause + object pooling (CrashCanvas 패턴) |
| 청크 격리 | 각 게임 ≤ 60KB gz, `manualChunks: games-<game>` |
| Provably Fair | 서버 `pf_commit/pf_reveal/pf_verify` RPC + 클라 검증 모달 |

---

## Part 1 — `@pkg/games/core/ui/` God-Tier Primitive Library

신규 게임 7종이 전부 공유할 **럭셔리 컴포넌트 12종**. 한 번 만들고 영원히 재사용.

```text
src/packages/games/core/ui/
├── ImperialStage.tsx          ← 게임 화면 컨테이너 (god rays + vignette + parallax bg layer)
├── GoldChip.tsx                ← 3D 금속 칩 (베벨/하이라이트/스택 물리)
├── ChipStack.tsx               ← 칩 쌓기 spring physics (framer-motion)
├── BetSlipLux.tsx              ← 통합 베팅 슬립 (frozen/kill-switch/leverage 가드)
├── MultiplierGlow.tsx          ← 멀티플라이어 숫자 + burning gold + 색상 전이
├── WinExplosion.tsx            ← 다층 파티클 + screen shake + golden rain + sound sync
├── LossPulse.tsx               ← 엘레강트 다크 레드 펄스 (싸구려 플래시 X)
├── CardFlipLux.tsx             ← 카드 플립 + 금박 텍스처 (블잭/바카라 공용)
├── FeltSurface.tsx             ← 테이블 펠트 (포커 그린 → 다크 골드 차분 톤)
├── HistoryStripLux.tsx         ← 결과 히스토리 카드 (gradient border + hover lift)
├── GoldSpinner.tsx             ← 로딩 (shimmer + ring)
├── FairnessVerifier.tsx        ← PF 시드 검증 모달
└── hooks/
    ├── useStageParticles.ts    ← 캔버스 파티클 풀 (pool size = device tier)
    ├── useScreenShake.ts       ← 강도/지속시간 입력 → CSS transform
    └── useGameSounds.ts        ← chip/win/loss/reveal/tick 라우팅
```

**핵심 기술**:
- `ImperialStage`: WebGL 없이 CSS conic-gradient + radial god rays + 3-layer parallax (background → midground → foreground), `will-change: transform` GPU 합성만.
- `GoldChip`: SVG + CSS `box-shadow` 다중 레이어로 금속 베벨, `transform: rotateY` hover로 1g 칩처럼 회전.
- `WinExplosion`: 캔버스 파티클 풀 (low=20 / mid=60 / high=140), 5-색 골드 그라디언트, `requestAnimationFrame` 1패스.
- 모든 컴포넌트 = device tier 자동 적응 (`low:hidden mid:opacity-80 high:visible`).

---

## Part 2 — 가져올 자산 vs 만들 자산

| 게임 | AETHER 원본 재사용 | Phonara 재작성 | 신규 RPC |
|---|---|---|---|
| Crash | `CrashCanvas` 코어 알고리즘, `lib/crash/engine` | UI 토큰화, 베팅 슬립 → `BetSlipLux`, 사운드 → `useGameSounds` | `crash_place_bet`, `crash_settle` |
| Plinko | `PlinkoCanvas` 물리, `lib/originals/plinko` | 보드 텍스처 = 다크 골드 우드 + 핀 골드 리플렉션 | `plinko_place_bet`, `plinko_drop` |
| Roulette | `tables/RouletteWheel` 회전 로직 | 휠 = 3D-like CSS perspective + motion blur, 공 sparkle 트레일 | `roulette_place_bet`, `roulette_spin` |
| Blackjack | `lib/tables/deck` 셔플 | `CardFlipLux` 금박 플립, `FeltSurface` 테이블 | `bj_place_bet`, `bj_action(hit/stand/double)`, `bj_settle` |
| Baccarat | `lib/tables/{deck,baccaratRoads}` | 로드맵(빅로드/빅아이) Imperial 톤 재작성 | `bac_place_bet`, `bac_settle` |
| Powerball | `powerball/PowerballStage` | 볼 추첨 = 메탈 글로브 + 드라마틱 조명, 당첨 = 크라운 컨페티 | `pb_place_ticket`, `pb_draw` (cron) |
| Live Wheel | `liveshow/{Dealer,WheelCanvas,BonusGames}` | 휠 = 대형 스케일 + 보너스 라운드 컷씬, 딜러 = SVG 아바타 (이미지 X) | `wheel_place_bet`, `wheel_spin` |

---

## Part 3 — Phase 순서 (머지 단위)

각 Phase 끝 = 머지 가능 + house-edge 시뮬 PASS + money-flow git diff=0 + size-limit PASS.

```text
Phase 0  스캐폴드 + Kill switch 7종 + function_permissions    0.5d
Phase 1  @pkg/games/core/ui/ 12개 프리미티브 (이것이 80%)     2d
Phase 2  Provably Fair v2 (pf_commit/reveal/verify)            1d
Phase 3  Crash                                                  1.5d
Phase 4  Plinko                                                 1d
Phase 5  Roulette                                               1.5d
Phase 6  Blackjack                                              1.5d
Phase 7  Baccarat                                               1d
Phase 8  Powerball                                              1d
Phase 9  Live Wheel                                             1.5d
Phase 10 통합 허브 /games + /admin/originals (AAL2)             0.5d
```

총 ≈ 13일. **Phase 1 (프리미티브)이 전체 비주얼 품질을 결정** — 여기서 압도해두면 게임 7종은 조립 작업이 됨.

---

## Part 4 — 네이밍 규칙 (Top 0.000…% 기준)

| 항목 | 규칙 | 예 |
|---|---|---|
| 페이지 | `src/pages/games/<Pascal>.tsx` | `Crash.tsx`, `Roulette.tsx` |
| 게임 패키지 | `@pkg/games/<kebab>/` | `@pkg/games/crash/` |
| 공용 프리미티브 | `@pkg/games/core/ui/<Pascal>.tsx` | `GoldChip.tsx` |
| 훅 | `use<Pascal>` (camel, `use-` 파일명) | `use-crash-round.ts` |
| RPC | `<game>_<action>` snake_case | `crash_place_bet` |
| Kill switch key | 게임 단일 단어 | `crash`, `plinko`, `wheel` |
| 마이그레이션 | `YYYYMMDD_aether_<game>_v1.sql` | `20260520_aether_crash_v1.sql` |
| 테이블 | `<game>_rounds`, `<game>_bets` | `crash_rounds` |
| 청크 | `games-<game>` | `games-crash` |
| 메모 | `mem://features/aether-<game>-import` | — |

---

## Part 5 — 머지 게이트 (모든 PR 강제)

- [ ] money-flow-freeze 8경로 git diff = 0
- [ ] `check_permission_drift()` 0건
- [ ] size-limit PASS (≤60KB gz/게임)
- [ ] ESLint PASS (sonner/raw channel/raw color 0)
- [ ] house edge 시뮬 1000-spin (±0.5%)
- [ ] kill switch ON → 베팅 RPC 즉시 실패 e2e
- [ ] Lighthouse Perf ≥ 92 (mobile 미드티어)
- [ ] `prefersReducedMotion` 시 모든 파티클/쉐이크 OFF

---

## Part 6 — 즉시 생성될 첫 파일 (Phase 0 미리보기)

```text
src/packages/games/core/ui/{ImperialStage,GoldChip,...12개}.tsx
src/packages/games/core/ui/hooks/{useStageParticles,useScreenShake,useGameSounds}.ts
src/packages/games/{crash,plinko,roulette,blackjack,baccarat,powerball,wheel}/index.ts
supabase/migrations/20260520_aether_phase0_killswitches.sql   (7 row INSERT)
supabase/migrations/20260520_aether_phase2_pf_v2.sql
vite.config.ts (manualChunks: games-* 7종 추가)
size-limit.config.json (+7 entries)
.dependency-cruiser.cjs (games 레이어 추가)
eslint.config.js (no-raw-color 룰 추가)
mem://features/aether-godtier-design-system
```

---

## Part 7 — 비기술 팀장 1문단 요약

다른 프로젝트에 만들어둔 7개 게임(크래시·플링코·룰렛·블랙잭·바카라·파워볼·라이브휠)을 Phonara 황실 톤으로 다시 만들어 들여옵니다. 핵심은 게임마다 처음부터 디자인하지 않고, **모든 게임이 공유할 럭셔리 부품 12종**을 먼저 한 번 제대로 만든 뒤(Phase 1, 2일) 게임을 조립하는 방식. 이렇게 하면 7개 화면 전부 톤이 100% 일치하고, 신규 8번째 게임도 1일이면 추가 가능. 매 PR마다 자동 검사 8종을 통과해야 머지되며, 총 13일에 걸쳐 1게임씩 점진 배포합니다.
