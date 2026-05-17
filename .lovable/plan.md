# v19 Final — Trade Section Imperial God Mode

목표: 트레이딩 화면을 Stake/Bybit/Rollbit를 시각·FOMO·제스처·통화·모바일 UX 모든 면에서 압도하는 "황제의 실전 트레이딩 홀"로 완성한다. money-flow 8경로, Operator Isolation, Bundle Budget, Phase D/F는 **diff 0줄** 유지.

---

## 1) 좌측 메뉴 (Desktop Imperial Rail) + Bottom Nav 라벨 통일

신규 컴포넌트 `src/components/nav/ImperialSideRail.tsx`
- `md+` 에서만 노출 (`hidden md:flex`), 좌측 sticky 72px 폭 아이콘 레일
- 항목: 홈 / 트레이딩 / 수익게임 / 라이브 / 지갑 / 황실 / 관리자(admin only)
  - 라우트: `/` `/trade` `/games` `/live` `/wallet` `/empire` `/admin`
- Warm Gold 액티브 글로우 + Cinzel 미니 라벨, Reduced Motion 가드
- `SlimShell.tsx` 에 `<ImperialSideRail/>` 마운트, `main` 좌측 패딩 `md:pl-[88px]` 추가

기존 `PhonaraNav` (모바일 하단 5탭) 라벨만 조정:
- 홈 / 트레이딩 / PHON(FAB) / 수익게임 / 내정보
- (지갑·황실·관리자는 데스크탑 레일 + 프로필 메뉴 경유 — 모바일 5탭 유지)

## 2) "황제의 실전 트레이딩 홀" 리브랜딩

`src/pages/TradingArenaBybit.tsx`
- 헤더 카피 2곳 "실전 트레이딩 아레나" / "실전 트레이딩" → **"황제의 실전 트레이딩 홀"** / **"황제의 홀"** 칩
- `<title>` / `<meta description>` 동기화
- 다른 노출 위치(`QuickAccessStrip`, `ko.ts`, `Empire.tsx`)도 일괄 치환

## 3) 글로벌 FOMO Progress Bar — `ImperialTradeFomoBar`

신규 `src/components/trade/ImperialTradeFomoBar.tsx` (트레이딩 페이지 최상단)
- 시드 기반 카운터 1,240,000~2,850,000 (초기 ~1,684,392)
  - `useCountUp` + 2.5~7s 랜덤 틱 (±2k~30k 일반, 8% 확률 +50k~80k 점프)
  - 카피: "현재 N명의 황제가 제국에서 실시간으로 트레이딩하고 있습니다"
- LONG vs SHORT 듀얼 게이지 (에메랄드 ↔ 로즈)
  - 35~65% 범위, 2~5s 마다 부드러운 보간 (spring), Reduced Motion 시 정적
- Cinzel + Gold/Pink shimmer, GPU-only transform

신규 RPC/edge function 0 — 순수 클라이언트 시뮬레이션 (`use-fake-player-count` 패턴 차용)

## 4) 주문 패널 제스처 & 애니메이션 (FREEZE 우회)

**FREEZE 준수**: `MegaOrderPanel.tsx` 자체는 1줄도 수정하지 않는다. 모든 제스처/애니메이션은 **래퍼**에서 처리.

`src/components/trading/v3/MobileOrderSheet.tsx` 업그레이드
- framer-motion `drag="y"` + `dragConstraints` + `dragElastic` 으로 Swipe Up/Down 핸들
- 닫힘 transition: cubic-bezier(.22,1,.36,1) 280ms (Imperial easing 토큰 `--ease-imperial`)
- 하단 트리거 버튼: Idle 시 subtle breathing glow, press 시 scale 0.95→1.08 + multi-layer gold→hot pink glow + 파티클 burst (인라인 SVG, lazy)

신규 `src/components/trading/v3/ImperialQuickFab.tsx` (모바일 전용 플로팅)
- Tap: `phonara:focus-bet` 이벤트 dispatch (시트 자동 open)
- Long-press 600ms: confirm dialog → 모든 포지션 종료 RPC 호출은 **기존 hook 재사용**, 신규 RPC 0

`src/components/trading/v3/CurrencySwipeToggle.tsx`
- 시트 헤더 위 USDT ↔ PHON 좌우 스와이프 토글 (framer drag x), 결과는 URL `?ccy=` 로만 전파 (MegaOrderPanel 내부 prop 미변경)

차트 위 Long-press → Limit prefill: `LightweightChartPanel` 래퍼 레벨에서 `onPointerDown` 600ms 타이머 → `phonara:limit-prefill` 이벤트만 발사 (PendingOrderManager가 이미 listen — 1줄 추가 OK if non-money-flow)

모든 애니메이션: `transform`/`opacity`만, `will-change`, `@media (prefers-reduced-motion)` 가드.

## 5) 통화 교환 버튼 (PHON ↔ USDT ↔ KRW)

신규 `src/components/trade/CurrencyExchangeButton.tsx` (트레이딩 홀 헤더 우상단)
- Luxury gold-bordered pill, 클릭 시 `Dialog` 오픈
- 내부는 **기존 `useSwapPhonKrw` 훅 재사용** — 신규 RPC 0
- USDT 표시는 `KRW_PER_USDT` 환산 디스플레이만 (실거래는 PHON↔KRW 한정)
- AAL2 게이트는 기존 swap RPC가 처리

## 6) 모바일 God Mode 마무리

- 시트/탭/FAB hit-target ≥ 48px, `touch-action: manipulation`
- 60fps: 모든 신규 효과 `transform-gpu`, 큰 blur 회피
- Tailwind 토큰만 사용 (gold/pink/emerald/rose semantic), 신규 외부 이미지 0

## 7) 절대 불변

- FREEZE 파일 0줄: `MegaOrderPanel.tsx`, `useDeposit*`, `bybit-feed.ts`, `useCrashRound.ts`, `use-kill-switches.ts`, `use-auto-bet.ts`
- 신규 RPC / edge function / 외부 이미지: 0
- Operator chunk, Bundle Budget, Phase D/F push 경로 미변경

## 기술 노트

- 모든 신규 컴포넌트는 `src/components/trade/*` 또는 `src/components/trading/v3/*` (operator 청크 분리 유지)
- framer-motion 이미 번들 인 → 추가 deps 0
- ImperialSideRail은 `React.lazy` 불필요(작음), 그러나 `admin` 항목은 `useUserRole`로 조건부 렌더
- FOMO Bar는 SSR 무관 (CSR only), prerender 영향 0

## QA 체크리스트

- [ ] Desktop 1440px: 좌측 레일 + 트레이딩 홀 + FOMO Bar + 차트 + 주문 패널 1행 표시
- [ ] Mobile 390px: 헤더 → FOMO Bar → 차트 → 시트 트리거 → 하단 5탭
- [ ] 시트 swipe up/down 60fps
- [ ] 통화 교환 다이얼로그 동작
- [ ] 좌측 레일 admin 항목은 admin 계정에서만 노출
- [ ] `npm run build` 성공, bundle-budget green, operator-isolation green
