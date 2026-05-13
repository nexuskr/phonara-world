## 진단 — 왜 렉이 심한가

`/dashboard` 한 화면에서 동시에 마운트되는 무거운 위젯이 **25개 이상**, 1초 단위 `setInterval`이 10개 이상, 실시간 채널/폴링이 합쳐서 끊임없이 리렌더를 일으키고 있습니다.

대표적인 부하 원인 (코드 확인 완료):

1. **Dashboard.tsx가 첫 페인트에 모든 카드를 한꺼번에 마운트**
   - `Particles`(canvas RAF) + `CommandHero`(1920×1080 eager 이미지) + `EmpireP2EDashboard`(useEffect 1s tick + supabase 3쿼리) + `BoostHeroCard`(1s tick) + `JackpotBanner`(5s tick + 채널) + `LiveRanking`(60s 폴링) + `LivePurchaseTicker`(30s + 5s rotate) + `MachineFomoTicker`(3.2s) + `WhaleStrikeRail`(60s + framer-motion 마키) + `CrownWarHUD`(1s tick) + `PersonalizedFeedRail` + `RevenueWidget` + `ActiveBotsMini`(supabase 채널) + `AttendanceCard` + `TierComparisonCard` + `SevenDayChallengeCard` + `EmpireDayCountdown` + `OnboardingV2` + `SixtySecondFlow`(1s) 등등.

2. **1초 setInterval 폭증** — `CrownWarHUD`, `EmpireBoosterTimer`, `Cockpit`, `BoostHeroCard`, `MachineDashboardCard`, `FreezeBanner`, `BaronPromotionDialog`, `AIBotCards`, `SixtySecondFlow` 등 9개 이상이 동시에 매초 setState → 매 초 전체 트리 리렌더.

3. **Particles 캔버스**가 모바일 24개여도 다른 RAF (CommandHero count-up, framer-motion 마키 등) 와 겹치면서 CPU 점유.

4. **Layout 자체 부하** — `useAdminNotifications`, `useUserNotifications`, `useAchievementWatcher`, `EmpirePopulationPulse`, `ImperialHud`, `FreezeBanner`(1s) 등 모든 페이지에서 항상 동작.

5. **CommandHero 배경 이미지**가 `loading="eager"` + 1920×1080 → 첫 페인트 LCP 직격.

`LazyMount` 컴포넌트는 이미 존재하는데 Dashboard에서는 **하나도 사용하지 않고 있음** — 가장 큰 쉬운 승리.

---

## 최적화 계획 (3단계)

### Step 1 — Dashboard 즉시 마운트 컷 (가장 큰 효과, 안전)

스크롤 다운 후에만 보이는 모든 섹션을 `LazyMount`(IntersectionObserver, `rootMargin: "300px"`)로 감싼다. **시각/기능 변경 0** — 표시 시점만 늦춰짐.

지연 마운트 대상:
- `EmpireP2EDashboard`
- `BoostHeroCard` 아래 모든 카드: `PersonalizedFeedRail` + `RevenueWidget`, Balance hero 아래 `SevenDayChallengeCard`, `EmpireDayCountdown`, `MachineFomoTicker`, `AttendanceCard`, `TierComparisonCard`, Roulette 카드, Quests 그리드, `JackpotBanner`, `ActiveBotsMini`, Quick actions, Featured missions, `LiveRanking`
- `LivePurchaseTicker`, `WhaleStrikeRail`, `CrownWarHUD`도 첫 페인트에서 빠질 수 있는 위치는 LazyMount

화면 처음에 즉시 보이는 것만 남김: `FirstDepositTopBanner`, `EmpireSignature`, `CommandHero`, balance hero, `FomoNotificationStrip`.

### Step 2 — 1초 tick 통합 + 이미지 최적화

1. **글로벌 시계 훅** `useNowTick(intervalMs)` 신설 → `CrownWarHUD`, `EmpireBoosterTimer`, `BoostHeroCard`, `FreezeBanner`, `SixtySecondFlow`, `BaronPromotionDialog` 등이 매 컴포넌트마다 setInterval 돌리는 대신 **단일 1s 스토어 구독**. 또한 카운트다운 UI는 1s → **2s tick**으로 변경(시각적 차이 없음).
2. `CommandHero` `<img>` `loading="eager"` → `loading="lazy"` + `fetchPriority="low"` (배경이라 LCP에 기여 안 함). 또는 CSS `background-image`로 변환 후 `image-set`.
3. `Particles` density 모바일 캡 24 → 16, prefers-reduced-motion이면 완전 비활성.
4. `JackpotBanner` 5s tick → 10s, `MachineFomoTicker` 3.2s → 6s.

### Step 3 — Layout 전역 부하 정리

1. `EmpirePopulationPulse`, `ImperialHud` → idle mount (이미 있는 `useIdleMount` 재사용).
2. `useAdminNotifications`는 admin만 — `has_role` 체크 후에만 채널 subscribe (현재 모두에게 켜져 있는지 확인하고 가드).
3. `FreezeBanner` 1s → 글로벌 시계 훅으로 통합.

---

## 구현 순서 / 검증

1. Step 1 적용 → 프리뷰에서 `/dashboard` 진입 후 첫 1초 CPU profile 측정 (`browser--performance_profile`).
2. Step 2 적용 → 동일 측정 + scroll 시 jank 확인.
3. Step 3 적용 → 다른 페이지 (Wallet, Empire) 진입 속도 확인.

각 단계 후 시각/기능 회귀 없음을 preview에서 확인. 디자인 토큰·레이아웃·문구 1픽셀도 변경하지 않음.

---

## 기술 메모 (구현 시 참고)

- `LazyMount`는 이미 `src/components/util/LazyMount.tsx`에 존재 — 그대로 사용, `minHeight`로 점프 방지.
- 글로벌 시계는 `useSyncExternalStore` 기반(`priceStore.ts` 패턴) 으로 만들어 컴포넌트별 setState 비용 최소화.
- 모바일 디바이스 우선 (현재 viewport 1122px이지만 실제 사용은 모바일이라고 가정).

---

이 계획대로 진행해도 될까요? Step 1만 먼저 적용해서 체감 차이를 확인하고 Step 2/3로 갈지, 아니면 한 번에 다 갈지 알려주세요.