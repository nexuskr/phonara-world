# PROJECT TITAN ∞ — Phonara Mobile-First Rebuild (FINAL v3)

3초 안에 "무료로 참여 가능한 게 있네 / 복잡하지 않네 / 한 번 눌러볼까"를 만든다. Mobile First / Mobile Only / One-Hand / Clarity > Features / Trust > Complexity / Speed > Everything.

## 절대 규칙

- 머니플로 8경로 git diff = 0 (award_crown / Treasury / Founding Season / reward engine / withdrawal / PHON ledger / settlement / wallet)
- Crown 백엔드 완전 유지 — UI 에서만 100% 제거 + PHON 리브랜딩
- imperial-duel → "실시간 대결" (리네이밍만, 기능 유지)
- PR 당 최대 5~8개 변경 / Master PR 금지 / 모두 rollback 가능
- 사용자 페이지는 Tier S/A/B만 노출, C는 라우트 유지 + UI 숨김

---

## SPRINT P0 — Release Blocker (UI 변경 금지)

### PR-P0-1 인프라
- `setVisibleInterval` 전역 (visibilitychange로 background RPC 정지)
- GodModePanel 중복 realtime 채널 제거
- Cloudflare + Edge Rate Limit 문서화 (코드 변경 없음)

### PR-P0-2 인증 (#1·#3·#5·#26)
- OTP 6자리 입력 후 자동 이동
- WebAuthn(지문) 복구
- 출금 비밀번호 키패드 가림 (visualViewport + scrollIntoView)
- Magic Link KYC 1회 후 반복 제거

### PR-P0-3A 트레이딩 (#10·#13·#14)
- 숫자 떨림 (tabular-nums + rAF 스로틀)
- Long/Short 체결 오류 + "잠시 멈춰있어요" 제거
- Isolated / Cross 모드 복구

### PR-P0-3B 슬롯·스테이킹 (#15·#21)
- sprite preload + WebGL fallback
- 슬롯 회전 끊김 제거
- staking 추가 버튼 + 2FA 재인증 알림 제거

### P0 완료 조건
로그인 99.9% / 체결 99% / 출금 오류 <1% / 슬롯 프레임드랍 0 / **UI·카피 변경 0건**

---

## SPRINT P1 — Architecture + Routing + PHON

### PR-P1-1 Reward Adapter
- 신규: `src/core/reward/rewardAdapter.ts` — `grantPhonReward()` / `grantVipReward()` / `grantReferralReward()` 내부에서만 `award_crown` 호출
- ESLint: 프론트에서 `award_crown` 직접 호출 금지
- 사용자 화면 용어 매핑: Crown → PHON Bonus, Crown Level → VIP Level, Crown Point → PHON Point, Empire Crown Booster → PHON Booster
- UI 삭제: CrownAura, CrownBadge, Crown Progress, Crown Widget, Crown 메뉴/라우트
- **백엔드 (award_crown, crown_events, Founding Season, Baron 승급, Whale Strike, Empire Booster) 전부 유지**

### PR-P1-2 Bottom Navigation (5탭, 한 손 도달)
```text
홈 │ 게임 │ 실시간 대결 │ 실시간 예측 │ PHON
```
- 48dp 이상 터치 타겟
- `viewport-fit=cover` + `env(safe-area-inset-*)`
- 라벨 한글 단독, 큰 글씨

### PR-P1-3 Landing Rebuild (Above The Fold)
- 최상단: **[실시간 참여 카운터]** (지금 N명 참여 중)
- Headline: **"지금 사람들이 무료로 참여 중인 실시간 PHON 챌린지"**
- Sub: **"무료 예측 · 무료 미션 · 실시간 게임 · 참여 보상"**
- CTA1: "무료 시작하기" / CTA2: "체험 모드"
- 신뢰 라인: 가입 → 참여 → 보상 확인 (3-step 시각화)
- 아래 섹션: 오늘 인기 참여 TOP 5 · 실시간 지급 피드 · 오늘의 미션 · 무료 보상 받기

### PR-P1-4 Flow Engine (`useFlowState()` 단일)
```text
정상:
  first_visit  → Landing → Quick Start → Practice Mode → Home
  return_user  → Home

비정상:
  email 미인증  → /verify
  KYC 진행중    → /kyc/pending
  freeze        → /safe-mode
  maintenance   → /status
```
- 진입 시 라우팅 결정 **1회만** 실행
- 금지: Landing → Guide → Landing / Home → Guide / 랜덤 이동

### PR-P1-5 성능
- React.lazy + Suspense (Admin/Atelier/heavy 3D)
- Lounge framer-motion IntersectionObserver pause + `prefers-reduced-motion`
- Pretendard `font-display: swap` + LCP preload
- Target: Mobile LCP < 2.0s / FCP < 1.2s / TTI < 3.0s

---

## PAGE PRIORITY ENGINE

- **Tier S (항상)**: 홈 / 게임 / 실시간 대결 / 실시간 예측 / PHON
- **Tier A (조건)**: 친구초대 / VIP / 미션 / 출금
- **Tier B (조건부)**: NFT / Atelier
- **Tier C (사용자 숨김, 라우트 유지)**: Admin / Operator / Debug / Legacy / Test / GodMode

## DELETE POLICY

- **Hard Delete**: GodModePanel · CockpitV2 · apex-vrf-oracle-v1 · legacy · debug · test
- **Lazy Hide**: Admin 전체 / NFT Atelier / heavy 3D
- **UI 제거 + 데이터 유지 + Adapter**: AchievementsV3 → PHON Collection
- **Rename + Keep**: imperial-duel → "실시간 대결"

---

## SPRINT P2 — UX / UI (11 bug, 3 PR 분할)

- 친구추천 분리 · 업적 단일화 · 실시간 대결 노출 강화 · 잔액 UI 단순화 (PHON+KRW+USDT 한 줄)
- 슬롯 UI 재배치 · 패키지 중복 제거 · 등급 단일화
- 레버리지 슬라이더 Bybit급 · 라이브 피드 속도 / 동작 최소화 · 폰트·로고 통일
- Admin IA 1인 운영 단순화

## SPRINT P3 — Retention (출시 후)

Daily Mission · PHON Hunt · Daily Prediction · Streak Reward · Slot Event · Whale Event · AI Coach

---

## 입출금 정책 (전역 카피)

1. **코인 입출금** (BTC/USDT/USDC) — 주력
2. **한국 원화 계좌이체** — 빠른 한국 은행 출금
3. 상품권 수동 (기존)
- Stripe/PG 자동 결제 제안 금지

## 첫 방문 KPI

- 3초: "무료 참여 가능한 보상이 있다" 인지
- 10초: 첫 행동
- 30초: 첫 보상 경험
- 60초: 재방문 이유 확보

## 금지 사항

페이지 132개 재증식 / 중복 시스템 / 랜덤 라우팅 / FOMO 컴포넌트 중첩 / Crown UI 재등장 / 사용자 혼란

---

## 실행 순서

PR-P0-1 → P0-2 → P0-3A → P0-3B → **"P0 완료" 보고 + QA** → P1-1 → P1-2 → P1-3 → P1-4 → P1-5 → **"P1 완료" 보고** → P2 (3 PR) → P3.

승인 시 **PR-P0-1 (인프라, UI 변경 없음)** 부터 진입합니다. 각 PR 완료 시 `"P0-1 완료"` 형식으로 보고합니다.
