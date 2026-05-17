# Phase 0 — EMERGENCY Clean Rebuild

**오직 Phase 0만 실행.** Slice 7.5 / Slice 8은 본 작업 승인·완료 후 별도 플랜으로 재상정.

원칙: **새로 쌓지 않고, 먼저 지운다.** money-flow 8경로 / Operator Isolation / Bundle Budget / Phase D(Avatar+Lobby) / Phase F Push **git diff 0줄**. 정리는 "마운트 해제 + 사용자 노출 라우트 차단 + 카피 교체" 수준이며 파일은 보존(다른 페이지에서 import 가능).

---

## 0.1 Dashboard — `src/pages/Dashboard.tsx`

남기는 hero 흐름(이 순서 그대로):
1. `<ImperialLivePulseRail/>`
2. `<ImperialLiveWinsRail/>` (full)
3. `<DashboardHeroV3/>`
4. `<DailyBriefingCard/>` (Suspense)
5. `<VipWhalePreview/>` (Suspense)
6. `<ImperialJourneyMap/>`
7. `<JourneyClaimPanel/>`
8. `<TradingEntryCard/>`
9. Olympus Slots 진입 카드 (카피 정리)
10. `<KpiGridV3/>`
11. `<MoreSection/>` — `DashboardBetPanel` + `WithdrawNudge` + `RecoveryPrompt` + `StreakBadge` + `Disclaimer`만 유지.

마운트 해제(파일은 보존):
- `CrownWarHUD`, `LiveRankingMarquee`, `HubTabs hub="command"`, `CommandHero`, `BoostHeroCard`, `EmpireP2EDashboard`, `MachineFomoTicker`, `LiveRanking`, `JackpotBanner`, `EmpireDayCountdown`, `SevenDayChallengeCard`, `FirstMissionCard`, `AttendanceCard`, `TierComparisonCard`, `ActiveBotsMini`, `PersonalizedFeedRail`, `RevenueWidget`, `RoutingMigrationBanner`, `ChurnReactivationBanner`, `FriendLeaderboard`, `LivePurchaseTicker`.

## 0.2 Navigation / Layout

- `src/components/nav/PhonaraNav.tsx`: 5탭(홈/PHON/슬롯/지갑/더보기) + 중앙 Half-Off Imperial FAB만 유지. War/Arena/Battle 관련 항목 전부 제거. 링크 destination은 `/dashboard?focus=bet` 또는 `/trading`으로 흡수.
- `src/components/Layout.tsx`: BattleResultOverlay / Arena HUD 잔존 마운트 제거. Imperial Booster Timer / Power Header / Deep Link Listener는 유지.
- `src/components/nav/PhonaraTopBar.tsx`: war/army 카피 정리.

## 0.3 Landing — `src/pages/Landing.tsx` (+ `src/pages/Index.tsx`)

남기는 흐름: 
1. Hero (`imperial-vignette` 배경, H1 + sub-copy + CTA + `+10,000 PHON` chip).
2. `<ImperialLiveWinsRail/>` (full variant).
3. Trust 3-line (가입 즉시 PHON / 환불 / 라이브 출금).
4. Footer 최소.

제거: 군사/배틀 마키, 중복 ticker, 옛 feature grid, 잔존 BattleResultOverlay 트리거, EmpireArmy 관련 데모 카드 등.

## 0.4 라우트 차단 — `src/App.tsx`

War/Arena 라우트를 사용자 진입에서 차단(컴포넌트 import 제거 후 redirect만 등록):
- `/arena`, `/empire/arena`, `/trading/army`, `/trading/war`, `/war` → `<Navigate to="/trading" replace/>`.
- `route-prefetch.ts`에서 위 키 prefetch 항목 제거.
- App 라우터에 `EmpireArena`/`WarTradingArena`/`TradingArenaWithArmy` import 제거. 파일은 보존(나중에 Imperial Duel 베이스로 재활용).

## 0.5 카피 일괄 sweep (사용자 노출 string만)

대상 화이트리스트(머니플로 호출 hook/엣지 제외):
`src/pages/{Landing,Index,Dashboard,Empire,EmpireHall,EmpireCollection}.tsx`, `src/components/{Layout,nav/*,empire/ImperialLive*,empire/JackpotEmpireBanner,empire/CrownThroneOverlay,dashboard/v3/*}.tsx`, `src/components/auth/AuthFeatureGrid.tsx`, `src/packages/earn/components/Onboarding60s.tsx`.

치환 사전:
- "전투"/"battle" → "대결" / "Imperial Duel"
- "전쟁"/"war" → "왕좌전"
- "군대"/"army" → "Imperial Guard"
- "Crown War"/"크라운 워" → "Crown Throne"
- "Empire Arena"/"엠파이어 아레나" → "Imperial Hall"
- 톤 정렬: 황제 / 제국 / 폐하 / 승전보 / Imperial.

내부 식별자(변수·함수·파일명·이벤트키)는 **변경 금지**.

## 0.6 검증

- `bunx tsc --noEmit` 통과.
- `rg -i "battle|전투|전쟁|army|군대|crown war|empire arena" src/pages/{Landing,Index,Dashboard}.tsx src/components/{Layout.tsx,nav/PhonaraNav.tsx,nav/PhonaraTopBar.tsx,empire/ImperialLivePulseRail.tsx,empire/ImperialLiveWinsRail.tsx}` → 0건.
- money-flow 파일 git diff = 0줄(`request_withdrawal`/`credit_crypto_deposit`/`bet_*` 호출 hook/엣지/`warTrading.ts`/`battleStore.ts` 등).
- /, /dashboard 수동 확인 + 스크린샷 3장(Dashboard / Navigation / Landing).

## 0.7 완료 보고

"✅ Clean Rebuild Phase 완료" + Dashboard / Navigation / Landing 스크린샷 첨부. 이후 Slice 7.5 Final Visual Touch 플랜 별도 상정.
