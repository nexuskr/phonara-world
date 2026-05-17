# v19 Final — Trade Polish #4 (Counter Cleanup · USDT Betting · Imperial Logo)

3가지 좁고 명확한 작업. money-flow / Operator Isolation / FREEZE / Bundle Budget / 신규 RPC 0 — diff 0줄.

---

## 1. LiveTradingCounter 제거 (중복 제거)

`ImperialTradeFomoBar`(2.2M 황제 헤더)가 이미 동일 메시지를 더 압도적으로 표시하므로
하단의 `LiveTradingCounter`("188,589명의 황제가 실시간 트레이딩 중") 칩은 트레이딩 화면에서 깔끔하게 제거한다.

- `src/pages/TradingArenaBybit.tsx`
  - `const LiveTradingCounter = lazy(...)` import 삭제
  - 라인 366 `<Suspense><LiveTradingCounter /></Suspense>` 마운트 삭제
- `src/components/dashboard/DashboardBetPanel.tsx`
  - import + `<LiveTradingCounter compact />` 마운트 삭제 (DashboardHero/FomoBar 와 중복)
- `src/pages/Home.tsx` 의 1회 노출은 유지 (홈 라이브 티커 컨텍스트)
- 컴포넌트 파일(`src/components/fomo/LiveTradingCounter.tsx`)은 Home에서 계속 사용되므로 보존

---

## 2. PHON · USDT 듀얼 베팅 (PhonOrderPanel)

현재 PHON 전용인 베팅 패널을 PHON / USDT 두 통화로 입력 가능하게 확장한다.
서버 정산은 항상 PHON으로 진행되며, USDT는 표시 환산 레이어 (1 USDT = 1300 PHON, `src/lib/displayCurrency.ts` 기존 상수 재사용). 신규 RPC 0.

### UI 변경 (`src/components/trading/v3/PhonOrderPanel.tsx`)

- 헤더 라벨 "PHON 베팅" → 세그먼트 토글 `[ PHON | USDT ]`
- `unit: "PHON" | "USDT"` 상태 추가, 기본 PHON
- 입력 amount 는 선택 단위로 받음
  - PHON 선택 시 기존 동작 (정수 PHON)
  - USDT 선택 시 소수 둘째자리 입력 → 내부 `amountPhon = round(amountUsdt * 1300)`
- 보유량 표시: "보유 N PHON ≈ M USDT" 한 줄 보조 라벨
- 25/50/75/MAX 칩: 단위와 무관하게 보유 PHON 기준 비율을 계산 후 단위에 맞춰 변환 표시
- 청산가 / 할인 표기 옆에 선택 단위 환산값 병기
- `useOpenPhonPosition` 호출은 그대로 `amountPhon` 전달 (백엔드 미터치)
- `PhonOrderConfirmSheet` 에 `displayUnit` prop 추가, 베팅 금액을 PHON + USDT 환산 두 줄로 표시

### 카피 (`src/components/trading/v3/PhonBettingNudge.tsx`)

- "PHON 으로 베팅하면…" → "PHON · USDT 베팅 모두 지원 · 수수료 20% 자동 할인"
- 안내 한 줄 추가: "USDT 입력 시 1 USDT = 1,300 PHON 으로 환산되어 즉시 체결됩니다."

### 충전 안내

- USDT 선택 + 잔액 부족 시 토스트 "USDT 충전은 지갑 → 코인 입금에서" + /wallet?tab=crypto 링크
- 기존 PHON 부족 안내는 유지

money-flow 가드는 PHON 베팅 경로 그대로 유지 — `useOpenPhonPosition` / `MegaOrderPanel` / `useDeposit*` / `useCrashRound` 파일 diff 0.

---

## 3. Imperial Logo 전면 교체

현재 로고는 단순한 "P 박스 + PHONARA 텍스트". Stake / Rollbit / Bybit 수준의 정체성을 위해
전용 SVG 마크 + 황실 워드마크로 교체한다.

### 신규 컴포넌트 `src/components/brand/ImperialLogo.tsx`

- 인라인 SVG 마크 (외부 이미지 0)
  - 8각 별·왕관·세리프 P 가 결합된 단일 글리프
  - 골드 `linear-gradient (hsl(var(--gold)) → hsl(var(--rose)))` + 외곽 1px 골드 스트로크
  - 내부 다이아몬드 컷 라인 (Stake 의 미니멀 마크 수준의 무게감)
  - `<title>` PHONARA.WORLD
- 워드마크
  - `font-imperial` (Italiana / Cormorant Garamond — 이미 로드됨)
  - 자간 0.28em, 굵게, 골드→로즈 그라디언트 텍스트
  - "PHONARA" + 작은 골드 다이아몬드 구분자 + "WORLD" (옵션)
- Props: `size?: "sm" | "md" | "lg"`, `withWordmark?: boolean`, `withWorld?: boolean`
- `prefers-reduced-motion` 가드, 호버 시 마크 8각 별이 0.5° 미세 회전 + 글로우 펄스 (transform/opacity only)

### 교체 지점

- `src/components/Layout.tsx` 라인 150·192·218 — 3개 위치의 P 박스 + PHONARA 텍스트를 `<ImperialLogo />` 로 치환 (데스크탑 사이드바 / 모바일 시트 / 모바일 톱바)
- `src/components/nav/PhonaraTopBar.tsx` 라인 48~54 — 동일 치환

디자인 토큰만 사용, 신규 폰트 0, 외부 이미지 0.

---

## 절대 준수

- money-flow 8경로 / Operator Isolation / Bundle Budget / Phase D/F / FREEZE → diff 0
- 신규 RPC / edge function / 외부 이미지 0
- 디자인 토큰 (hsl(var(--gold)), --rose, --primary, --pink) 만 사용
- USDT는 입력 표시 레이어 전용. 서버 베팅 금액은 항상 PHON
