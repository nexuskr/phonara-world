# Phonara — Playwright E2E Sovereign Defense Protocol (Phase 0 Final)

1인 운영자가 매일 5분 안에 "오늘 모바일에서 죽은 곳이 있는가?"를 확인하고, Stake/Rollbit/Bybit 유저가 넘어올 때 **모바일 첫 30초**에서 이탈하지 않도록 보장하는 실전 E2E. 거창한 거버넌스 조직체 없음. 머니플로/imperial_* RPC/Operator Isolation은 0바이트 미터치 — 전부 mock.

## 🔥 TIER 0 — "첫 30초 이탈 방지" 4대 인터랙션 (모든 다른 테스트보다 먼저, 가장 빠르게, 매 PR 차단)

이 4개가 깨지면 신규 유저는 무조건 이탈. 별도 `@critical` 태그 + 전용 shard로 가장 먼저 실행 + 실패 시 즉시 Slack 빨간 알림.

| # | 인터랙션 | 합격 기준 |
|---|---|---|
| **T0-1** | `/auth` 가입 CTA 첫 탭 → 입력 폼 노출 | < 800ms, 터치 타깃 ≥44×44, 키보드 자동 포커스, IME 한글 입력 가능 |
| **T0-2** | 가입 완료 → `/welcome` 진입 → **15,000 PHON 클레임 다이얼로그 자동 노출** | < 2.5s, CTA 1회 탭 성공률 100%, 새로고침해도 동일 단계 복귀 |
| **T0-3** | `/dashboard` 첫 진입 → **첫 Daily Bonus CTA 시각적 강조 + 1회 탭 클레임** | 잔액 증가 애니메이션 표시, 중복 클릭 차단, 오프라인 시 한국어 토스트 |
| **T0-4** | `/duel` 첫 진입 → **Top 1 SovereignCard 탭 → DuelGate 탭 → swipe-up Oracle 확장** | 각 단계 ≤ 300ms 응답, 60fps 유지, 핀치줌/회전 중에도 깨짐 없음 |

→ `tests/00-tier0-first-30s.spec.ts` 1개 파일에 위 4개 시나리오만 압축. 실패 = 머지 차단.

## 디렉터리

```text
e2e/
  playwright.config.ts          # 5 프로젝트 (Desktop, iPhone13, Pixel7, LowEnd, ReducedMotion)
  fixtures/
    auth.fixture.ts             # 로그인 세션 storageState 캐시
    mock-supabase.ts            # supabase.from/rpc/channel route intercept
    haptic-spy.ts               # navigator.vibrate 호출 캡처
    network.ts                  # offline / slow-3g / saveData 헬퍼
    a11y.ts                     # axe-core 주입
  utils/
    selectors.ts                # data-testid 단일 진실 (코드 변경 없이 fallback aria/role)
    gestures.ts                 # pinch / double-tap / swipe / pull-to-refresh
    visual.ts                   # 스크린샷 diff threshold
  tests/
    00-tier0-first-30s.spec.ts          # @critical — 첫 30초 4대 인터랙션
    01-onboarding-death-path.spec.ts
    02-duel-lobby-journey.spec.ts
    03-mobile-os-native-feel.spec.ts
    04-worker-cosmetic-integrity.spec.ts # NearMiss / MultiplierCountUp Worker ON/OFF 매트릭스
    05-betting-safety-net.spec.ts
    06-edge-cases-dust.spec.ts          # 회전/오프라인/저전력/입력 IME/탭 백그라운드
    07-a11y-smoke.spec.ts               # axe critical only
  reporters/
    ko-reporter.ts              # 한국어 에러 + 스크린샷 경로 + 5분 요약
    slack-notify.ts             # 실패 시 SLACK_WEBHOOK 으로 요약
  .github/workflows/e2e.yml     # PR마다 자동
```

## Playwright 프로젝트 매트릭스

| 프로젝트 | 디바이스 | 목적 |
|---|---|---|
| `mobile-ios` | iPhone 13 (390×844, DPR 3, touch) | 주력 — Stake/Rollbit 유저 |
| `mobile-android` | Pixel 7 (412×915) | Android 분기 검증 |
| `mobile-lowend` | 360×640, CPU throttle 4×, slow-3g | 인도네시아/베트남 저사양 |
| `mobile-reduced-motion` | iPhone 13 + `prefers-reduced-motion: reduce` + `saveData` | 접근성/배터리 절약 |
| `desktop` | 1280×720 | 회귀만 |

`use: { trace: 'retain-on-failure', video: 'retain-on-failure', screenshot: 'only-on-failure' }`.

## Critical Path 우선순위 (이탈 확률 높은 순)

### 01 Onboarding Death Path (가장 비싸게 잃는 유저)
- `/auth` 진입 → 이메일/구글 가입 → `/welcome` → 15,000 PHON 클레임 다이얼로그 → `/dashboard` → 첫 Daily Bonus
- 단계마다: 로딩 스피너 ≤2.5s, CTA 터치 타깃 ≥44×44, 에러 토스트 한국어, 새로고침 후에도 동일 단계 복귀
- 회원가입 mock: `**/auth/v1/signup` intercept → 합성 세션 주입
- 클레임 mock: `**/rest/v1/rpc/imperial_claim_signup_bonus` → `{status:"ok", amount_phon:15000, new_balance:15000}`
- 실패 시나리오: 클레임 RPC 500 / 네트워크 끊김 / 중복 클릭 / 가입 직후 새로고침

### 02 Imperial Duel Lobby Full Journey (Sprint 4 핵심)
- `/duel` 진입 → `HallOfSovereigns` Top 1 카드 탭 → `LiveDuelGates` 카드 탭 → swipe-up 으로 `FomoFloatingOracle` 확장 → `VerificationOracleModal` 열림 → 닫기 swipe-down
- `NearMissOverlay` 진입 시 opacity transition, `MultiplierCountUp` scale 1→1.15→1 검증 (transform 인라인 스타일 읽어서 단언)
- mock: `useDuelRooms` 의 `imperial_get_duel_rooms` RPC → 4개 방 + spectators 노이즈

### 03 Mobile OS Native Feel Extreme
- **Pinch zoom**: `viewport meta`가 줌 허용인지 확인, 두 손가락 핀치 → layout shift 없음, double-tap zoom → 텍스트 재배열 없음
- **Pull-to-Refresh**: `usePullToRefresh` 영역에서 touchstart at top → 80px drag → release → `onRefresh` 콜백 호출 (mock spy)
- **Swipe Gesture**: 좌/우/상/하 4방향, BottomSheet dismiss
- **Dynamic Island**: `dynamicIsland.show(...)` 페이지 액션 트리거 후 pill DOM `opacity:1` + `translate3d(0,0,0) scale(1)` 검증, ttl 후 invisible
- **Haptic**: `navigator.vibrate` spy → success/medium/error 각 1회 이상 호출
- **Orientation**: `page.setViewportSize` portrait↔landscape, 레이아웃 깨짐/오버플로 0
- **Safe area**: `env(safe-area-inset-top)` 적용 확인 (DynamicIslandPill top 계산)
- **Reduced motion**: PTR 비활성, framer-motion 트랜지션 즉시 완료

### 04 Worker + Cosmetic Visual Integrity
- `calcNearMiss` worker on → score ≥ 0.5 시 overlay 표시, off (worker reject) → main-thread fallback 동일 결과
- `calcMultiplierFrames` Float32Array transferable 경로 + fallback 둘 다 최종 값 동일
- 60fps 검증: `requestAnimationFrame` 카운트 / 시간 비율 ≥ 50fps on mid-tier emulation

### 05 Basic Betting Safety Net (mock)
- Crash 베팅: `/games/crash` → 베팅 슬립 입력 → 베팅 RPC mock 200 → UI 잔액 차감 반영 → cashout 버튼 활성
- Duel 베팅: 동결 상태 mock → `RealBetSlip.frozen` 배너 표시, 베팅 버튼 disabled
- Kill switch ON mock → 베팅 버튼 disabled + 사유 노출
- **절대 실제 RPC 호출 금지** — 모두 `page.route('**/rpc/imperial_*', ...)` 로 차단

### 06 Edge Cases Dust (먼지 한 톨)
- 탭 백그라운드 → 30s 후 복귀 → realtime 재연결, 잔액 stale 없음
- 오프라인 → 베팅 시도 → 명확한 한국어 에러 토스트
- 키보드 IME (한글 조합) → 금액 입력 필드 깨짐 없음
- 시스템 폰트 크기 200% → 레이아웃 오버플로 없음
- 빠른 더블탭 → 버튼 중복 제출 없음 (idempotency 가드)
- 뒤로가기/앞으로가기 → 모달 상태 정상

### 07 A11y Smoke
- axe-core `critical` 룰만 — 핵심 6 페이지 (`/`, `/auth`, `/dashboard`, `/duel`, `/wallet`, `/games`)
- 위반 0 강제, `serious` 는 경고만

## 기술 규약

- **Selector 정책**: `data-testid` 추가 금지. `role` + `name` (accessible name) 우선, fallback `:has-text()`. 코드 0 변경.
- **Mock 전략**: `page.route` 로 Supabase REST/RPC/Realtime WebSocket 차단. 머니플로 RPC는 호출되면 즉시 테스트 fail (`expect(routedMoneyFlow).toBe(false)`).
- **Auth fixture**: 1회 가입 후 `storageState.json` 캐시, 모든 spec에서 재사용.
- **Reporter**:
  - `ko-reporter.ts` — 실패 시 `❌ [02-duel-lobby] Top 1 카드 탭 실패 — selector 'role=button[name=/Top 1/]' not found / screenshot: results/.../trace.zip`
  - `slack-notify.ts` — `SLACK_WEBHOOK_E2E` 환경변수 있을 때만, 실패 N건 요약 + Playwright HTML 리포트 링크
- **HTML report**: `playwright-report/` GitHub Actions artifact 30일 보관.

## CI

`.github/workflows/e2e.yml`:
- PR + main push 트리거
- `bun install` → `bunx playwright install --with-deps chromium webkit`
- `bunx playwright test --project=mobile-ios --project=mobile-android` (필수)
- `mobile-lowend` / `mobile-reduced-motion` / `desktop` 는 `continue-on-error: true` (경고만)
- 실패 시 artifact 업로드 + Slack 알림
- 5분 안에 끝나도록 `--workers=4` + shard 2개

## 불변 가드

- `scripts/check-money-flow-freeze.mjs` — E2E 디렉터리 추가가 머니플로 8경로 git diff = 0 유지하는지 검증 (기존 스크립트 그대로)
- E2E 코드가 `src/` 또는 `supabase/` 를 import 하지 않음을 `.dependency-cruiser.cjs` 룰로 강제
- `imperial_place_phon_bet` / `_settle_*` / `request_withdrawal` / `credit_crypto_deposit` 등은 **real 호출 자체 차단**

## 실행 명령

```bash
bunx playwright install --with-deps
bunx playwright test                    # 전체
bunx playwright test 02-duel             # 특정
bunx playwright test --project=mobile-ios --headed --debug
bunx playwright show-report
```

## 산출물 (이번 phase)

1. `e2e/playwright.config.ts` + 5 프로젝트
2. 7개 spec 파일 (01~07)
3. fixtures/utils/reporters
4. `.github/workflows/e2e.yml`
5. `e2e/README.md` — 매일 5분 점검 루틴 (1인 운영자용)

## 다음 단계 (선택)

- Phase 2: visual regression (Percy/Argos) 도입
- Phase 3: BrowserStack 실디바이스 매트릭스
- Phase 4: 실 트래픽 replay (HAR → Playwright)
- 위 3개는 본 plan에 포함하지 않음 — 1인 운영 부담 회피.
