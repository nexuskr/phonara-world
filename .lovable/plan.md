# PR-P1-B — Hero + Home + Flow State Engine

P1-A 정리(5탭 + Crown→PHON 0건)에 이어, 진입 화면과 홈 대쉬보드 그리고 사용자 상태별 라우팅을 정돈한다. 머니플로 8경로 git diff = 0 유지. UI는 사용자 표면만, 백엔드 무변경.

## 1. Hero 완전 재설계 (`/` Landing)

대상 파일: `src/pages/Landing.tsx` 의 `<Hero/>` 섹션.

| 슬롯 | 변경 후 |
|---|---|
| Eyebrow chip | `오늘의 실시간 챌린지` (Gem 아이콘 유지) |
| Headline (H1) | **오늘 사람들이 가장 많이 참여 중인 실시간 리워드 챌린지** |
| Sub | 무료 예측 · 무료돈벌기 · 실시간 보상 · PHON 받기 |
| Primary CTA | **무료 시작하기** → `/auth?mode=signup&next=/dashboard` |
| Secondary CTA | **체험 모드** → `Practice ON + /home` (`enterPracticeMode()` 호출 후 navigate) |
| 신뢰 라인 | `지금 N,NNN명이 참여 중 · 평균 지급 12초` (PayoutTicker 단일화) |

3초 룰: Hero 첫 화면 = headline + sub + CTA 두 개 + 라이브 카운트 한 줄. 기존 `imperial-jackpot-breathe` 골드 그라디언트 톤 유지. CTA는 `min-h-[56px]` 엄지존, secondary는 outline-gold.

## 2. Home 대쉬보드 대청소 (`/dashboard`)

대상 파일: `src/pages/Dashboard.tsx` (`<Layout>` 안). 5탭 "홈" 라우트는 인증 시 `/dashboard`로 활성 매핑되어 있어, Dashboard = "Home"으로 정렬.

제거 (lazy 마운트 해제):
- 중복 FOMO/티커: `ImperialPresenceBar`, `ImperialLiveActivity`, `InviteRailMini`
- 무거운 게임 카탈로그 8장(ORIGINALS/SLOTS grid) — `/games` 로 이전, Dashboard에는 진입 카드 1장만
- 모티프 SVG `GameArt` 헬퍼 (게임 카드 제거와 함께 삭제)
- `PullToRefreshIndicator` (현재 데이터 fetch 거의 없음 → 제거)

유지/추가 (Tier S 5탭 라이트 카드):
1. 인사 헤더 (한 줄, 닉네임 + Gem 아이콘)
2. **무료돈벌기** 카드 → `/earn` (오늘 받을 PHON 합계)
3. **실시간대결** 카드 → `/duel` (현재 라이브 룸 수, crimson glow)
4. **실시간예측** 카드 → `/trade` (BTC 24h 변동)
5. **내PHON** 카드 → `/phon` (PHON 잔액 + 어제 적립)
6. `<WhaleStrikeRail />` 1회 (24h 라이브 마키, 60s 갱신) — 이미 친숙한 사회적 증명만 남김
7. `<PowerHeader />` 우측 상단(기존 그대로)

타깃: Dashboard 컴포넌트 코드 315줄 → 약 130줄. 모든 카드는 `imperial-card` 토큰 재사용, 신규 색상 변수 없음.

## 3. Flow State Engine

신규 파일: `src/lib/flow/flowState.ts`, `src/components/flow/FlowRouter.tsx`.

### 상태 도출 (`computeFlowState`)
```text
입력: { hasSession, profile, practiceOn, kycStatus, killSwitches, isFirstVisit }
출력: "landing" | "quickstart" | "practice" | "home"
       | "verify_email" | "kyc_pending" | "safe_mode" | "maintenance"
```

우선순위 (위에서 아래):
1. `killSwitches.maintenance_mode` → `maintenance` (기존 `<MaintenanceGate/>` 그대로 사용)
2. `killSwitches.signup_halt && !hasSession` → `safe_mode` (`/safe`)
3. `hasSession && profile?.email_confirmed === false` → `verify_email` (`/auth?step=verify`)
4. `hasSession && profile?.kyc_status === 'pending'` → `kyc_pending` (`/wallet?notice=kyc`)
5. `hasSession` → `home` (`/dashboard`)
6. `!hasSession && isFirstVisit` → `landing` (`/`)
7. `!hasSession && practiceOn` → `practice` (`/home`)
8. else → `landing`

`isFirstVisit` = `localStorage.getItem('phonara:flow:visited:v1')` 없음. 첫 마운트 시 즉시 set.

### `<FlowRouter/>`

`/` 진입 시 위 상태 계산 → 필요시 `<Navigate to=… replace/>`. 비정상 상태는 안내 배너만 띄우고 Landing은 항상 폴백.

- `first_visit (unauth)` → `<Landing/>` 그대로 (Hero secondary CTA로 Quick Start)
- `return_user (auth)` → `<Navigate to="/dashboard"/>`
- `verify_email` → `<Navigate to="/auth?step=verify"/>`
- `kyc_pending` → `<Navigate to="/wallet?notice=kyc"/>`
- `safe_mode` → `<Navigate to="/safe"/>`
- `maintenance` → `<MaintenanceGate/>` 가 이미 처리하므로 패스스루

`App.tsx` 변경: `<Route path="/" element={<Landing/>}/>` → `<Route path="/" element={<FlowRouter><Landing/></FlowRouter>}/>`. Landing/Home/Dashboard 컴포넌트 자체는 그대로 import.

### Quick Start / Practice

기존 `enterPracticeMode()` (`src/lib/practiceMode.ts`) + `<PracticeModeBanner/>` 재사용. Hero의 Secondary CTA가 `enterPracticeMode(); navigate('/home')` 한 줄로 호출.

## 4. 검증

- `node scripts/check-no-crown-ui.mjs` = 0 유지
- 머니플로 8경로 git diff = 0
- `rg "ImperialLiveActivity|InviteRailMini|GameArt" src/pages/Dashboard.tsx` = 0
- 비로그인 `/` = Landing + 새 Hero, 로그인 `/` = `/dashboard` 자동 이동, practice ON 비로그인 = `/home`

## 변경 파일 요약

```text
edit   src/pages/Landing.tsx                 # Hero 재설계
edit   src/pages/Dashboard.tsx               # 대청소 + Tier S 5카드
new    src/lib/flow/flowState.ts             # computeFlowState
new    src/components/flow/FlowRouter.tsx    # / 게이트
edit   src/App.tsx                           # / 라우트 FlowRouter 래핑
```

## 금지 사항

- 새 글로벌 오버레이/팝업 마운트 금지
- /admin · /apex · /operator 라우트 무변경
- money-flow 8경로(`imperial-bet-place/-settle`, `credit-crypto-deposit`, `request-withdrawal`, `walletApi.ts`, `imperialBet.ts`, `leverage.ts`, `flywheel.ts`) 무변경
