# 전체 UI/UX 및 메뉴 구조 리빌드 — Pass 1 (World #1)

money-flow 8경로 / Operator Isolation / Bundle Budget / Realtime 4-Partition / Active Governor 모두 **무변경**.
이번 Pass는 **메뉴 단순화 + Home/PHON 허브 정리 + 디자인 토큰 통일** 에 집중. 페이지 내부의 비즈니스 로직은 손대지 않고, 기존 컴포넌트를 재배치·재활용.

## 0) 정직한 스코프

요청은 “전체 리빌드”지만 한 PR에 모두 우겨넣으면 머니플로 8경로·번들 예산·번역 키 등 파급이 너무 큼. 이번 Pass는 **체감 변화의 80%를 만드는 5개 변경**으로 한정하고, 나머지는 후속 Pass.

| 항목 | 이번 Pass | 후속 |
|---|---|---|
| Bottom Nav 5탭 라벨/라우트 정비 | O | — |
| 신규 `/phon` 허브 페이지 | O | 실제 Swap/Stake 백엔드 |
| Home 페이지 카드 재배치 | O | — |
| Trading Pass 1 강화 (이미 완료) | 유지 | — |
| Profile 카드 그리드 통일 | O | 신규 위젯 |
| 모든 페이지의 로딩/빈상태 표준화 | 부분 (Home/Profile/PHON) | 그 외 페이지 |
| 디자인 토큰 (Gold/Hot Pink/Deep Black) 정리 | tailwind config 추가만 | 컴포넌트 전수 마이그레이션 |
| Pull-to-Refresh 전면 적용 | **스킵** (realtime이 이미 갱신) | 필요 페이지만 별도 |
| 라우트 대청소 (deprecated 라우트 redirect) | O (8~12개) | 나머지 |

## 1) Bottom Nav 정비 (`src/components/Layout.tsx`)

기존 5탭 → 요청 사양으로 라벨/라우트 정확히 매핑:

```text
[홈]           /home        → Home
[트레이딩]     /trade       → TradingArenaBybit
[PHON]         /phon        → 신규 PhonHub (FAB 강조: gold→pink 그라디언트)
[게임]         /games       → CasinoLobby
[내 제국]      /profile     → Profile
```

- `BOTTOM_NAV` 배열만 교체. FAB(중앙)는 PHON.
- `matches` 는 각 탭의 하위 경로까지 포함 (`/trade`, `/arena`, `/arena/army` 전부 [트레이딩] 활성화 등).
- 데스크톱 사이드바는 유지하되 1차 그룹 라벨을 동일 5개와 정합되게 정렬.

## 2) 신규 페이지 `src/pages/PhonHub.tsx` + `/phon` 라우트

기존 자산 재활용 only — 신규 RPC 없음:

```text
┌ <PhonHero/>            잔액 + 다음 NFT 임계값 (useMyPower)
├ <PhonAdvantageRibbon/> (트레이딩에서 만든 것 재활용)
├ <PhonBenefitsGrid/>    수수료 -20% / 레버리지 최대 100x / Crown ×1.5 카드 3종
├ <NextTierProgress/>    nextThreshold 진행률 바 + 입금 CTA
├ <EmpireCollection/>    (lazy 재활용, 본인 NFT 컬렉션)
├ <ComingSoonCard/>      "스왑 · 스테이킹 · 일일 배당" 곧 공개 placeholder (가짜 데이터 금지)
```

- 모두 lazy. 신규 파일은 `src/components/phon/*` 디렉터리.
- `/phon` 진입은 인증 필요 (`useRequireAuth`).

## 3) Home (`src/pages/Home.tsx`) 카드 순서 정리

현재 페이지를 “위에서 아래로 한 화면 = 한 결정”이 되도록 재배치 (코드 import는 그대로, JSX 순서만 조정):

```text
1. <BigPnLLine />          (간단 라인: 오늘 손익 한 줄, 신규)
2. <ChurnReactivationBanner /> (있을 때만)
3. <DailyChest /> + <LevelProgressBar />  (한 줄 2칸)
4. <MissionsCard />         (오늘의 미션)
5. <LiveFomoRow />          출금 + 트레이딩 + Founding 카운터 (신규 슬림 1행)
6. <WhaleStrikeRail />      마키 (기존)
7. <PersonalizedFeedRail /> (기존)
```

“복잡한 배너 / 중복 위젯” 정리:
- VipArrivalsTicker · RoutingMigrationBanner · OnboardingV2 같은 1주차 배너는 **App 루트** 마운트로 이미 통합되어 있어 Home 본문에서 추가 노출되면 중복 — Home 본문에 중복 마운트가 있다면 제거.

## 4) Profile (`src/pages/Profile.tsx`) 그리드 통일

상단 1열, 그 아래 2열 그리드 (mobile 1열):

```text
[ Avatar + Nickname + Empire Lv. + PHON Lv. + Streak Flame ]
[ LevelProgressBar (PHON 1~100) ]
[ BadgeCollection ] | [ MyFoundingSeat (lazy) ]
[ NFT Collection (lazy) ] | [ 최근 트레이드 요약 ]
```

신규 위젯 없음 — 기존 컴포넌트 재배치 + 카드 컨테이너 통일 (rounded-2xl, border-border/40, bg-card/40).

## 5) 디자인 토큰 정리 (가산 only)

`tailwind.config.ts` 에 시맨틱 alias 추가 (기존 토큰 변경 금지):

```ts
colors: {
  // 기존 그대로 + alias 추가
  "warm-gold":  "hsl(var(--warm-gold) /  <alpha-value>)",
  "hot-pink":   "hsl(var(--hot-pink)  /  <alpha-value>)",
  "deep-space": "hsl(var(--deep-space)/  <alpha-value>)",
}
```

`index.css` `:root` 에 변수 정의 (이미 비슷한 값 존재할 가능성 → 중복 시 alias만 추가):

```css
--warm-gold:  45 95% 60%;
--hot-pink:  330 85% 60%;
--deep-space: 240 25%  6%;
```

신규 컴포넌트(이번 Pass 추가분)에서만 이 토큰을 사용. 기존 컴포넌트 전수 마이그레이션은 별도 Pass.

## 6) 라우트 대청소 (App.tsx)

- 사용자에게 보이는 path 5개 (`/home`, `/trade`, `/phon`, `/games`, `/profile`) 외 — 사용 빈도 낮은 deprecated 경로는 **redirect 유지** (이미 다수 redirect 존재, 추가 redirect 1개: `/swap` → `/phon`).
- 코드 삭제는 안 함 (다른 곳에서 link 깨질 수 있음).

## 7) 검증

- `node scripts/check-money-flow-freeze.mjs` → 0
- `node scripts/check-operator-isolation.mjs` → PASS (빌드 단계, CI)
- `npm run size:check` → PASS (PhonHub 포함 신규 4 파일 전부 lazy, index 청크 영향 0 목표)
- 375x812 모바일에서 Bottom Nav 5탭 + FAB(PHON) + safe-area-inset 동작 확인
- /home /trade /phon /games /profile 5개 페이지 진입 OK

## 8) 의도적으로 미포함 (안전 우선)

- 실제 PHON Swap/Stake 백엔드: 머니플로 신규 RPC 필요 → 별도 PR.
- 모든 페이지에 Pull-to-Refresh: 현재 realtime 이 더 빠르고 안전. UX 가치 낮음.
- Skeleton Loading 전수 적용: 기존 `LoadingState` 가 이미 표준. 신규 페이지에서만 사용, 기존은 그대로.
- 메뉴 “복잡 정리”: deprecated 경로 코드 삭제 — 외부 링크/SEO 영향 우려, 이번엔 redirect 유지로 충분.
