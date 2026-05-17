# Clean Rebuild Phase + Slice 7.5 Final Touch (+ Slice 8 Imperial Duel PVP next)

3단계 진행. **Phase 0 Clean Rebuild → Phase A Slice 7.5 Visual Touch → Phase B Slice 8 Imperial Duel PVP**. 각 Phase 종료 시 보고.

핵심 원칙: **money-flow 8경로 / Operator Isolation / Bundle Budget / Phase D(Avatar+Lobby) / Phase F Push 0줄 변경**. 트레이딩/베팅/출금 RPC와 그 호출 hook은 절대 미터치. 정리는 "마운트 해제 + 카피 교체 + 라우트 노출 차단" 수준으로 진행하고 파일 자체는 보존(다른 페이지에서 import 가능성).

---

## Phase 0 — Clean Rebuild (군대·전쟁 정리 + Imperial 리셋)

### 0.1 정리 대상 (마운트 해제·라우트 비공개, 파일 보존)

Dashboard:
- `CrownWarHUD`, `LiveRankingMarquee`, `HubTabs hub="command"`, `CommandHero`, `BoostHeroCard`, `EmpireP2EDashboard`, `MachineFomoTicker`, `LiveRanking`, `JackpotBanner`(중복), `EmpireDayCountdown`, `SevenDayChallengeCard`, `FirstMissionCard`, `RoutingMigrationBanner`(만료) 마운트 해제.
- 남기는 hero 라인: `<ImperialLivePulseRail/>` → `<ImperialLiveWinsRail variant="full"/>` → `<DashboardHeroV3/>` → `<DailyBriefingCard/>` → `<VipWhalePreview/>` → `<ImperialJourneyMap/>` → `<JourneyClaimPanel/>` → `<TradingEntryCard/>` → Olympus 슬롯 진입 카드 → `<KpiGridV3/>` → `<MoreSection/>` (베팅 패널 + 출금 nudge + 환원 위주, 카피만 Imperial로).

Layout / Nav:
- `src/components/Layout.tsx`에 잔존하는 BattleResultOverlay / Arena 관련 위젯 마운트 제거.
- `src/components/nav/PhonaraNav.tsx` 5탭 + 중앙 Half-Off Imperial FAB 외 모두 정리. Arena/War 링크 제거, 대신 `/trading`(또는 `/dashboard?focus=bet`)으로 흡수.

Landing(`src/pages/Landing.tsx` + `src/pages/Index.tsx`):
- Hero + `<ImperialLiveWinsRail variant="full"/>` + Trust 3-line + CTA만 남기고, 군사/배틀 마키·중복 ticker 제거.

Routes (`src/App.tsx`):
- `/empire/arena`, `/arena`, `/trading/army`, `/trading/war` 경로 — **사용자 진입 라우트에서 제외**(컴포넌트 import는 유지하되, Route 등록만 주석/제거). 사용자 메뉴/내비/링크에서 노출 전면 제거.
- 기존 깊은 링크 호환을 위해 `<Navigate to="/trading" replace/>` 리다이렉트로 대체.

### 0.2 카피 일괄 sweep (사용자 노출 텍스트만)

대상 파일 화이트리스트(머니플로 코드 제외): Landing, Index, Dashboard, Layout, PhonaraNav, PhonaraTopBar, WorldHero, DashboardHeroV3, KpiGridV3, MoreSection, ImperialLivePulseRail, ImperialLiveWinsRail, Onboarding60s, AuthFeatureGrid, Guide(s), JackpotEmpireBanner, CrownThroneOverlay, Empire/EmpireHall/EmpireCollection.

치환 사전 (정확히 사용자 노출 문자열만):
- "전투" → "대결", "전쟁" → "왕좌전", "배틀" → "듀얼", "army"/"Army" → "Imperial Guard"
- "Crown War"/"크라운 워" → "Crown Throne", "Empire Arena"/"엠파이어 아레나" → "Imperial Hall"
- "battle" UI 문구 → "duel" / "Imperial Duel"
- 일관 톤: "황제", "제국", "폐하", "Imperial", "왕좌"

내부 변수/함수/파일명은 **변경 금지**(머니플로/타입 안정성). 화면에 보이는 string literal만 치환.

### 0.3 디자인 토큰 sweep
- 모든 잔존 하드코딩 색상 → semantic token으로 일괄 정리(0.1에서 살아남는 파일 한정).
- 카드 표준화: 사용자 페이지의 1차 카드는 `imperial-card-hover imperial-corner-shine`, 2차 카드는 `imperial-card-thin`.

### 0.4 검증
- `bunx tsc --noEmit`
- `rg "battle|군대|전투|전쟁|crown war|empire arena" src/pages/{Landing,Index,Dashboard}.tsx src/components/{Layout,nav/*,empire/ImperialLive*}.tsx` ⇒ 0건.
- money-flow 파일 (`request_withdrawal`/`credit_crypto_deposit`/`bet_*` 호출 hook/엣지 등) git diff = 0줄.

---

## Phase A — Slice 7.5 Final Visual Touch (Stake Crusher)

### A1. 글로벌 토큰 강화 (`src/index.css`)
- `imperial-vignette` — radial vignette + gold 0.06 tint.
- `text-shadow-imperial-xl` — gold/pink 다층 + hot-pink 0.45 1px hairline.
- `glow-pink-xl` — inner gold hairline + outer 56px pink bloom 2-layer.
- `imperial-card-hover` — `translateY(-3px)` + 220ms cubic-bezier + dual shadow.
- `imperial-corner-shine` 12% 사이즈 gold sweep 4s infinite.
- `imperial-card-thin` — 1px gold 0.18 + backdrop-blur.
- `imperial-breathe-soft` — scale 1.000→1.006, 3.6s, prefers-reduced-motion guard.
- 토큰 `--shadow-imperial-deep` 추가, 카드 표준 그림자로 채택.

### A2. Landing 폴리시
- Hero `imperial-vignette` + SVG gold particle 20dot drift.
- H1 letter-spacing -0.02em + `text-shadow-imperial-xl` + `imperial-breathe-soft`.
- CTA: `glow-pink-xl`, hover scale 1.025, gradient 회전 4s, `+10,000 PHON` chip ping 유지.
- `<ImperialLiveWinsRail/>` jackpot 행: gold border 0.7→0.82, outer pink bloom 44→60px, crown 회전.

### A3. Dashboard 폴리시
- KpiGridV3 카드 `imperial-card-hover imperial-corner-shine`, 숫자 `text-gradient-imperial` + `text-shadow-imperial`.
- 슬롯/카지노 진입 카드: `imperial-card-hover` + `imperial-pulse-dot`.
- MoreSection 토글: 골드 hairline + 호흡.

### A4. Navigation 폴리시
- Bottom Nav 5탭 active indicator = gold→pink 그라디언트 hairline + 상단 6px glow.
- 중앙 FAB: `glow-pink-xl` + `imperial-breathe-soft`, hover scale 1.06 + 2px gold ring, active ring 펄스.
- 모바일 ≥48px 터치 타깃.

### A5. 검증
- `bunx tsc --noEmit`, `/`, `/dashboard` 시각 확인 스크린샷.
- 머니플로 / Operator / Bundle / Phase D·F 0줄.

**Phase 0 + A 완료 보고**: "✅ Clean Rebuild Phase + Slice 7.5 Final Touch 완료" + Dashboard / Navigation / Landing 스크린샷.

---

## Phase B — Slice 8 Imperial Duel PVP (요약, 상세는 승인 후 즉시 실행)

- 신규 테이블: `pvp_duels`, `pvp_duel_participants`, `pvp_ledger`, `pvp_season`, `pvp_season_stats` + kill switch `pvp_engine`.
- RPC (SECURITY DEFINER, idempotent): `pvp_create_duel/join/leave/cancel/settle`, `pvp_get_open_lobby/my_active/leaderboard`, 관리자 `admin_pvp_force_settle/get_metrics_24h`.
- 내부: `_pvp_lock_funds`, `_pvp_credit`, `_pvp_compute_result`. `phon_balances` 변경은 신규 SECURITY DEFINER 함수에서만, 모든 변동 `pvp_ledger` 미러.
- Realtime: `pvp_duels`/`pvp_duel_participants` publication, `useGameChannel`만.
- UI: `/pvp` Lobby, `<DuelCreatePanel/>`, `/pvp/:id` Room, `<DuelResultOverlay/>`, `/pvp/hall` Leaderboard, `<DuelEntryFAB/>` (전역).
- 모드: Trade / Slot / Crash. 포맷: 1v1 / Royal(4~6) / Throne(2~8). House edge 12~15%. 연패 보호 적용.
- 디자인: Phase A 토큰 적극 활용(gold=승리, hot-pink=도전).
- 체크리스트: money-flow freeze 0, ledger 본인-only, settle idempotent, kill switch ON 시 차단, 닉 마스킹, Bundle Budget 통과.

**Phase B 완료 보고**: "✅ Slice 8 Imperial Duel PVP System 완료" + 주요 스크린샷(Lobby/Room/Result/Hall).
