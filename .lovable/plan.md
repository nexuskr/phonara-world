# v14.0 Sprint 0 — Great Simplification (Week 1~2)

v14.0 마스터 플랜의 첫 스프린트. 목적은 **첫 화면을 5초 안에 이해 가능하게 슬림화**하고, 앞으로 12주를 받쳐줄 **폴더 alias 골격 + 단어 정화 + 디자인 토큰 정리 + 새 랜딩/온보딩**을 까는 것.

기존 기능/데이터는 **하나도 삭제하지 않음**. UI 표시·진입점·단어만 바꾸고, 깊은 페이지들은 alias로 살려둔다.

---

## 1. 폴더 alias 골격 (`src/packages/*`)

Turborepo 물리 분리는 Sprint 4 종료 후. 지금은 **alias 레이어만** 깐다.

- 생성: `src/packages/{core,ui,wallet,earn,game-engine,trade,live,avatar-nft,referral,analytics}/index.ts`
- 각 폴더 `index.ts`는 현재 `src/components/*`, `src/lib/*`에서 해당 도메인의 안정적인 export만 re-export. 신규 코드만 여기로 들어오고, 기존 import 경로는 그대로 유지.
- `tsconfig.json` paths에 `@pkg/core/*` … `@pkg/analytics/*` 추가 (`@/` 경로는 변경 없음).
- `docs/adr/0001-packages-alias.md`에 결정 기록.

이렇게 두면 Sprint 1~4 동안 신규 도메인 코드(earn, wallet 환전 등)는 `@pkg/*`로만 짜고, Sprint 4 끝에 그 폴더만 떼서 Turborepo로 옮기면 된다.

## 2. 단어 정화 (glossary)

- 신규: `src/packages/core/i18n/glossary.ts`
  - 매핑: Empire→레벨 · Crown→보너스 포인트 · Baron→VIP · Founding/Galaxy→시즌 좌석 · Cosmic Emperor→이번 주 TOP · Whale Strike→실시간 빅윈 · Imperial Story→소식
- 헬퍼 `g(key)` 한 개만 export. **DB 컬럼/내부 코드명/메모/RPC명은 절대 건드리지 않음.**
- 적용 범위는 사용자 가시 텍스트만:
  - `src/components/Layout.tsx` 사이드바·헤더 라벨
  - `<EmpireLevelBadge />`·`<WhaleStrikeRail />`·`<BaronPromotionDialog />`·`<VipPassBadge />` 등 표시 라벨
  - 새 `/home`·`/earn`·`/live`의 카피
- Sprint 0에서는 **위 핵심 6곳만** 1차 적용. 나머지 페이지는 Sprint 1~2에서 점진 교체.

## 3. 첫 화면 슬림화 + TopBar 4탭

기존 사이드바(`MainSidebar`)와 모바일 하단 탭바를 **TopBar + 4탭 + 하단 티커**로 축소.

- 신규: `src/packages/ui/nav/TopBar.tsx`
  - 좌: PHONARA.WORLD 로고 (→ `/home`)
  - 우: PHON 잔액 · 충전 버튼 · 프로필 아바타 드롭다운(지갑/VIP/아바타/설정/로그아웃)
- 신규: `src/packages/ui/nav/MainTabs.tsx`
  - 4개 탭: 💰 수익(`/earn`) · 🎰 게임(`/games`) · 📈 투자(`/trade`) · 🔴 실시간(`/live`)
  - 데스크탑은 TopBar 하단, 모바일은 하단 고정.
- 신규: `src/packages/live/components/LiveTicker.tsx`
  - 하단 1줄 마키. 데이터 = 기존 `get_whale_strikes_24h` + `get_recent_payouts_100` + 신규 가입(공개 카운트 RPC 있으면 사용, 없으면 생략 — **Sprint 0에서는 신규 RPC 만들지 않음**).
- `src/components/Layout.tsx`: 새 컴포넌트 3개로 교체. 기존 `MainSidebar`/`MobileTabBar`는 파일 보존하되 import 제거.
- `/home`(`src/pages/Home.tsx`) 카드 **5개 이하**로 압축:
  1. 히어로 — "오늘도 X원 벌었어요" 실데이터(=`get_recent_payouts_100` 24h 합산) + 단일 CTA `[지금 무료로 시작 +500 PHON]`
  2. 진행 중인 이벤트 1개 (`/events`)
  3. Earn 진입 카드 (오늘의 미션 1개 미리보기)
  4. 게임 진입 카드 (인기 슬롯 1개)
  5. Live 미리보기 (`<WhaleStrikeRail />` 축소판)
- **`/home`에서 제거(import 삭제)할 7개 컴포넌트**:
  `HubTabs` · `EmpireSignature` · `FomoStrip` · `CrownWarHUD` · `WorldDominationWall` · `ImperialJourneyMap` · `ImperialStoryRail`
  → 모두 `/live`로 이동(LiveTabs로 묶음). 파일은 삭제하지 않음.

## 4. 디자인 토큰 정리

- `src/index.css` 정리:
  ```css
  --bg: 222 47% 7%;
  --card: 222 40% 10%;
  --gold: 44 88% 58%;
  --pink: 340 100% 62%;
  --text: 0 0% 96%;
  --muted: 222 15% 60%;
  ```
- `tailwind.config.ts`에 위 6개 토큰만 노출. 기존 토큰은 호환을 위해 유지하되 새 컴포넌트는 위 6개만 사용.
- 폰트: Pretendard(한글 700/500) + Space Grotesk(영문 700/500). `<link>` 정리.
- `lucide-react` strokeWidth=1.5 전역화는 새 컴포넌트(TopBar/MainTabs/Home)부터.

## 5. 신규 풀스크린 랜딩 `/`

- `src/pages/Landing.tsx` 전면 리뉴얼:
  - 풀스크린 히어로 ("한국에서 제일 쉽게 돈 버는 가상세계" + 실데이터)
  - 4탭 미리보기 카드
  - 단일 CTA `[무료로 시작 +500 PHON]` → `/auth?next=/home`
  - 하단 LiveTicker 동일 컴포넌트 재사용
- 기존 Landing는 `/landing-legacy`로 보존.

## 6. 60초 온보딩

- 신규: `src/packages/earn/components/Onboarding60s.tsx`
  - 4스텝: 가입 완료 → 무료 룰렛 1회(`/missions?tab=battle` 호출) → 오늘의 미션 1개 클레임 → 슬롯 데모(`/casino/cherry-sakura-500` deeplink, 베팅 없이 1스핀 데모)
  - 진행률 바 + "건너뛰기" + 완료 시 +500 PHON 클레임(기존 `claim_daily_streak` 또는 신규 RPC 없이 일단 미션 1개에 +500 보너스 키만 추가)
- 마운트 위치: `/home` 첫 진입 시(localStorage `phonara:onboarding60s:v1` 미존재 시 1회). 기존 `OnboardingV3`는 잠시 비활성(import 유지, 마운트 분기에서 제외).

## 7. 라우트 alias 1주 병행

이미 `/home`·`/earn`·`/live`·`/games`·`/trade` 라우트는 존재. Sprint 0에서 추가로:

- `/dashboard` 진입 시 일주일간 상단에 `<RoutingMigrationBanner />` ("새 홈은 /home 입니다"). 일주일 후 `/dashboard` → `/home` 리다이렉트(이 결정은 Sprint 1 시작 시점에서).
- `/casino`→`/games`, `/empire/*`→`/live/*` alias는 **현 상태 유지**.

---

## 변경 파일 요약

**생성**
- `src/packages/{core,ui,wallet,earn,game-engine,trade,live,avatar-nft,referral,analytics}/index.ts` (10)
- `src/packages/core/i18n/glossary.ts`
- `src/packages/ui/nav/TopBar.tsx`
- `src/packages/ui/nav/MainTabs.tsx`
- `src/packages/live/components/LiveTicker.tsx`
- `src/packages/earn/components/Onboarding60s.tsx`
- `src/components/RoutingMigrationBanner.tsx`
- `docs/adr/0001-packages-alias.md`

**수정**
- `src/components/Layout.tsx` (TopBar/MainTabs/LiveTicker로 교체)
- `src/pages/Home.tsx` (5카드 슬림화, 7개 컴포넌트 import 제거)
- `src/pages/Live.tsx` (7개 컴포넌트를 탭으로 흡수)
- `src/pages/Landing.tsx` (풀스크린 히어로 리뉴얼)
- `src/index.css` + `tailwind.config.ts` (토큰 정리)
- `src/App.tsx` (Onboarding60s 마운트 분기, OnboardingV3 마운트 OFF)
- `tsconfig.json` (`@pkg/*` paths)

**삭제**
- 없음. 모든 기존 컴포넌트/페이지/RPC/테이블 보존.

---

## 제약 / 비범위

- DB 마이그레이션 없음. RPC 신설 없음. 엣지 함수 없음. (Earn 테이블/RPC는 Sprint 1)
- 결제 라우팅(코인+계좌이체+상품권 수동) 그대로. Stripe/PG 자동 제안 금지.
- 보안 메모(출금 AAL2, 이상감지 동결, profiles 민감 컬럼 트리거, no-backend-rate-limiting) 모두 유지.
- 글로서리는 사용자 가시 텍스트만 교체. 내부 코드/DB/메모는 Empire/Crown/Baron 명칭 유지.
- 단어 정화 2차 적용(전 페이지)은 Sprint 1과 병행.

## 출구 조건 (Week 1 / Week 2)

- **Week 1**: TopBar + 4탭 + 5카드 `/home` + 단어 정화 6곳 + 디자인 토큰 + alias 폴더 → 신규 5명에게 5초 노출 시 "무료로 돈 벌고 게임하고 트레이딩"이라 답해야 통과.
- **Week 2**: 풀스크린 랜딩 + 60초 온보딩 가동 → Sprint 1 Earn Engine 진입.
