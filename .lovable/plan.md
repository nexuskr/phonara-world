# Phase E — Slice 4: FOMO / 중독성 디테일 마무리

목표: Dashboard 상단의 출석 streak·라이브 출금 카운터·"어제 N명 출금" 배너를 Imperial Luxury 톤으로 묶어 매일 들어오고 싶게 만든다. 기존 페이지 구조·라우팅·RPC·money-flow 8경로·three3d·슬롯 내부(Phase D 동결)는 1줄도 건드리지 않는다.

## 범위

1. **`StreakFlame` Imperial Glow 강화** (`src/components/streak/StreakFlame.tsx`)
   - 1~6일 muted, 7일+ amber pulse, 14일+ amber/rose gradient + ring pulse, 30일+ Imperial Half-Off gradient + 회전 corona + 우상단 👑 칩.
   - `prefers-reduced-motion`에서 pulse/회전 OFF, drop-shadow는 유지.
   - `contain: layout paint` + `will-change: transform` 적용. `cn` 유틸로 클래스 합성 유지(props/타입 무변경).

2. **`LivePayoutCounter` Imperial 톤 + FOMO 카피 강화** (`src/components/fomo/LivePayoutCounter.tsx`)
   - 카드 컨테이너 `.imperial-card` 토큰 적용, 좌측 imperial-pulse-dot 사용.
   - 카피를 `"지금 {n}명의 황제들이 출금하고 있습니다 — 폐하도 자격이 충분합니다"` 로 교체(FOMO.withdrawingNow 토큰화).
   - 데이터 hook(`useLiveFomoCounters`) / 폴링 / RPC 무변경.

3. **`YesterdayPayoutsBanner` 신규** (`src/components/fomo/YesterdayPayoutsBanner.tsx`)
   - 1줄 Warm Gold Imperial Banner. 아이콘 + "어제 폐하 {N}명이 출금을 마쳤습니다 — 다음 차례는 폐하입니다".
   - 데이터: 기존 공개 RPC `get_recent_payouts_100()` (Trust v2) 1회 호출 → 클라이언트에서 어제(KST 기준) `completed_at` 카운트. 신규 RPC/마이그레이션 없음.
   - 5분 sessionStorage 캐시(`phonara:yesterday_payouts:v1`). N === 0 또는 fetch 실패 시 null 렌더.
   - `.imperial-card` + `bg-gradient` warm gold sheen, 우측 chevron CTA → `/trust`.
   - Dashboard 상단 `<LivePayoutCounter />` 바로 아래에 `<Suspense fallback={null}>` lazy 마운트.

4. **`StreakBadge` 위치/문구 그대로 유지** — 이미 Imperial 톤. `StreakFlame` 강화로 시각 위계 정리되면 충분. 추가 변경 없음.

5. **FOMO 카피 토큰 확장** (`src/lib/glossary.ts` `FOMO` 네임스페이스 추가만)
   - `FOMO.streakGlow = "폐하의 연속 제국이 빛나고 있습니다"`
   - `FOMO.withdrawingNow = (n: number) => "지금 {n}명의 황제들이 출금하고 있습니다 — 폐하도 자격이 충분합니다"`
   - `FOMO.yesterdayPayouts = (n: number) => "어제 폐하 {n}명이 출금을 마쳤습니다 — 다음 차례는 폐하입니다"`
   - 기존 8종 그대로 유지, 추가만.

6. **Dashboard 상단 마운트 조정** (`src/pages/Dashboard.tsx`)
   - 기존 `<LivePayoutCounter />` 바로 아래에 신규 `<YesterdayPayoutsBanner />` lazy 1줄 추가. 그 외 위젯 순서·마운트 0줄 변경.

## 비범위

- `StreakBadge` 본체, AttendanceCard / SevenDayChallenge 등 출석 로직.
- `useLiveFomoCounters` 폴링 / `get_payout_ops_stats_24h` / Trust RPC 시그니처.
- 슬롯 내부(`src/components/slots/**`, `src/pages/casino/<Game>.tsx`) — Phase D 동결.
- money-flow 8경로(`PRJ_FREEZE_RAW_CHANNEL`), Operator Isolation, three3d 청크.
- 신규 페이지/라우트/RPC/마이그레이션/엣지.

## 보호 가드

- money-flow 8경로 git diff = 0
- `node scripts/check-operator-isolation.mjs` PASS
- `npm run size:check` PASS (index ≤ 180KB gz, three3d / lobby / wallet / slots 청크 변동 0)
- raw `supabase.channel(...)` 0건 추가, ESLint no-direct-sonner / no-raw-channel 유지
- HSL 토큰만, 인라인 hex 0건
- `prefers-reduced-motion`에서 pulse / corona / sheen 자동 OFF

## 기술 메모

- StreakFlame 30일+ Imperial corona = `::after` absolute, conic-gradient(from 0deg, amber, pink, amber), `animation: spin 6s linear infinite`, `mask: radial-gradient(transparent 60%, black 62%)`.
- YesterdayPayoutsBanner KST 어제 = `new Date(Date.now() - 24*3600*1000)` toISOString의 KST 변환 후 `YYYY-MM-DD` 매칭. 5분 sessionStorage 캐시.
- LivePayoutCounter는 기존 `useLiveFomoCounters` 그대로 — 컴포넌트 마크업/스타일만 교체.
- 모든 컨테이너에 `contain: layout paint` + `will-change-transform` 부여(스크롤 중 리페인트 0).

## 검증 절차

1. `git diff --name-only` — 위 5개 파일(StreakFlame, LivePayoutCounter, glossary, Dashboard, YesterdayPayoutsBanner 신규) 외 변경 없음 확인
2. money-flow grep freeze 0줄
3. `node scripts/check-operator-isolation.mjs`
4. `npm run size:check`
5. 프리뷰 `/` Dashboard 진입 → ChurnBanner / LivePayoutCounter / YesterdayPayoutsBanner / FriendGapToast 순서, StreakBadge 7/14/30일 시각 단계 확인 (DevTools에서 streak 임시 조작)
6. `mem://features/phase-e-slice-4-fomo-detail` 신규 등재 + `mem://index.md` 갱신
