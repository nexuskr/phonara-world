# PROJECT TITAN ∞ — Phonara Mobile OS Rebuild (4-Sprint Plan v2)

피드백 6건 반영판. 머니플로 8경로 git diff = 0, Crown 백엔드 유지, imperial-duel는 "실시간 대결"로 리네이밍 유지.

---

## 변경 요약 (v1 → v2)

1. P0에서 UI 변경 완전 제거 → Crown→PHON 리브랜딩은 **P1 전용**
2. P0-3을 **P0-3A(체결 안정화)** + **P0-3B(슬롯·스테이킹)** 두 PR로 분리
3. Flow Engine에 비정상 상태 4종 추가 (Verify / Pending / SafeMode / Status)
4. Hero 카피 톤 다운 — 과장 제거
5. Bottom Nav 순서 = 홈 / 실시간대결 / 트레이딩 / 게임 / PHON
6. AchievementsV3 **Hard Delete 금지** → UI만 제거 + 데이터 유지 + PHON Collection Adapter 연결

---

## SPRINT P0 — Release Blocker (1주, 인프라/인증/체결/출금/슬롯만)

### PR-P0-1 인프라 (UI 변경 없음)
- `setVisibleInterval` 전역 적용 (visibilitychange로 background RPC 정지)
- GodModePanel 중복 realtime 채널 정리
- Cloudflare + Edge Rate Limit 인프라 **문서만** (백엔드 RL 코드 추가 금지)

### PR-P0-2 인증 (#1·#3·#5·#26)
- #1 2FA OTP 6자리 입력 후 화면 전환
- #3 지문(WebAuthn) 완전 작동
- #5 출금 비밀번호 키패드 가림 (iOS 11+, visualViewport + scrollIntoView)
- #26 매직링크 KYC 1회 후 반복 제거

### PR-P0-3A 체결 안정화 (#10·#13·#14)
- #10 트레이딩 상단 숫자 떨림 (tabular-nums + fixed-width + rAF 스로틀)
- #13 Long/Short "PHON 베팅이 잠시 멈춰있어요" 제거 + 실제 체결
- #14 Isolated / Cross 모드 복구 (Bybit/Binance 동일)

### PR-P0-3B 슬롯 & 스테이킹 (#15·#21, 회귀 위험 격리)
- #15 슬롯 로딩 가속 + 회전 끊김 (sprite preload + WebGL fallback)
- #21 phon#staking "스테이크 추가" 먹통 + 2FA 완료자 재인증 알림 제거

**P0 완료 게이트**: 로그인 99.9% / 체결 99% / 출금 오류 <1% / 슬롯 프레임 드랍 0 / OTP 반복 0. **UI/카피 변경 절대 금지.**

---

## SPRINT P1 — 구조·성능·라우팅 + Crown UI 제거 (1주)

### PR-P1-1 Crown → PHON Adapter Layer
- 신규: `src/core/reward/rewardAdapter.ts` — `grantPhonReward()` / `grantVipReward()` / `grantReferralReward()` 내부에서만 `award_crown` 호출
- ESLint: 프론트에서 `award_crown` 직접 호출 금지
- 용어 매핑 (사용자 화면 전용): Crown → PHON Bonus / Crown Reward → PHON Reward / Crown Level → VIP Level / Crown Point → PHON Point / Crown Multiplier → VIP Boost / Empire Crown Booster → PHON Booster
- 삭제 UI: CrownAura, CrownBadge, Crown Progress, Crown Widget, Crown 메뉴/라우트
- **백엔드 (`award_crown`, `crown_events`, Founding Season, Baron 승급, Whale Strike, Achievement, Empire Booster) 전부 유지**

### PR-P1-2 Navigation 한글화 + Hero 재설계

**Bottom Nav 5탭 (심리적 진입 순서)**
```text
홈 │ 실시간 대결 │ 트레이딩 │ 게임 │ PHON
```
- 48dp 터치 타겟, `viewport-fit=cover` + `env(safe-area-inset-*)`
- 트레이딩을 2번째 → 3번째로 이동 (초보 긴장 완화)

**Hero (톤 다운)**
- Headline: **"오늘 사람들이 가장 많이 참여 중인 실시간 PHON"**
- Sub: **"코인 입출금 주력 · 무료 예측 · 게임 · 실시간 보상"** ("쉽게 돈 번다" 뉘앙스 금지)
- Primary CTA: "지금 참여하기"
- Secondary CTA: "체험 모드 시작하기"
- 아래 섹션: Whale Strike Feed · 오늘의 예측 미션 · Popular Games Top 5 · Live Payouts Ticker (한국 은행 출금 강조)

### PR-P1-3 Flow Engine (비정상 상태 포함 상태머신)

```text
정상 경로:
  비로그인              → Landing
  가입 완료             → Onboarding
  온보딩 완료           → Home
  재방문                → Home

비정상 경로 (신규):
  인증(이메일/전화) 미완료  → /verify
  KYC 진행중               → /kyc/pending
  계정 freeze              → /safe-mode (account_freezes 기준)
  maintenance_mode ON      → /status (비-admin)
```
- Landing → Guide → Landing 랜덤 이동 꼬임 제거
- 단일 `useFlowState()` 훅으로 진입 시 1회만 라우팅 결정

### PR-P1-4 성능
- `React.lazy + Suspense` 최대 적용 (admin/*, atelier, heavy 3D)
- Lounge framer-motion `IntersectionObserver` pause + `prefers-reduced-motion`
- Pretendard `font-display: swap` + LCP `<link rel=preload fetchpriority=high>`
- Target: Mobile LCP < 2.0s, FCP < 1.2s

---

## SPRINT P2 — UX / UI 리빌드 (1주, 11 bug)

3개 PR로 분할 (각 rollback 가능):

**PR-P2-A 가이드·고객 동선**: #2 친구추천 분리 / #7 운영원칙 재정리 / #8 1:1 챗봇 자동 답변 / #9 실시간 대결 50~70대 즉시 인지 + 1탭 진입

**PR-P2-B 제국·잔액·트레이딩 UI**: #4 배지+업적 단일화 / #6 라이브 피드 속도 + 동작 최소화 / #11 PHON+KRW+USDT 한 줄 / #12 레버리지 슬라이더 Bybit급 / #20 라이브 메뉴 플랫폼 이름

**PR-P2-C 슬롯·패키지·정리**: #16 슬롯 볼륨/잔고 / #17 배당표 스크롤 제거 / #18 폰트·로고 통일 / #19 패키지 중복 / #22 atelier 카피 / #23 Crown 잔존 UI / #24 atelier 지갑→NFT 버튼 / #25 등급 단일화 / #27 어드민 1인 운영 IA

### 정리 정책 (수정)
- **Hard Delete**: GodModePanel · CockpitV2 · apex-vrf-oracle-v1 · 구 Lounge heavy marquee · test/debug/legacy
- **UI 제거 + 데이터 유지 + Adapter**: **AchievementsV3** → PHON Collection으로 어댑터 연결 (배지=리텐션 핵심, 데이터 보존)
- **Rename + Keep**: imperial-duel → "실시간 대결"
- **Lazy + Conditional Render**: Admin/Operator 전체, NFT Atelier(미완), pixi.js/three.js heavy

---

## SPRINT P3 — Retention Engine (출시 후, 신규 기능 허용)

Daily Mission · PHON Hunt · Streak Reward · Daily Prediction · Referral Team · Slot Event · Whale Event · AI Coach.

---

## 입출금 정책 (전역 카피)

1. **코인 입출금** (BTC/USDT/USDC) — "주력" 강조
2. **한국 원화 계좌이체** — "빠른 한국 은행 출금" 신뢰 카피
3. 상품권 수동 (기존)
- Stripe/PG 자동 결제 제안 금지 (memory constraint)

---

## 디자인 토큰

Dark + Gold + Neon Purple / 큰 버튼·큰 글씨 / 한 손 조작 / 50~70대 친화 / 모든 색상 HSL 토큰만.

---

## Out of scope

- award_crown / Treasury / Founding Season / withdrawal RPC / PHON ledger 본문 수정
- Crown 백엔드 hard delete (DROP TABLE / DROP FUNCTION / trigger)
- AchievementsV3 데이터 삭제
- 백엔드 코드 레벨 rate limiting
- imperial-duel 기능 삭제

---

## 실행 순서

PR-P0-1 → P0-2 → P0-3A → P0-3B → **P0 완료 보고 + QA** → P1-1 → P1-2 → P1-3 → P1-4 → **P1 완료 보고** → P2-A → P2-B → P2-C → P3.

승인 시 **PR-P0-1 (인프라, UI 변경 없음)** 부터 진입합니다.
