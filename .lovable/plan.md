# PROJECT TITAN ∞ — Phonara Mobile OS Rebuild (4-Sprint Plan)

확정된 원칙을 그대로 반영합니다.

- 머니플로 8경로 git diff = 0 (award_crown / Treasury / Founding / reward / withdrawal / wallet / settlement / PHON ledger)
- Crown은 **백엔드 유지 / 사용자 화면에서만 100% 제거** (Adapter Layer 도입)
- imperial-duel는 "실시간 대결"로 리네이밍하여 유지
- 한국 원화 계좌이체는 코인 다음으로 강조, Stripe/PG 자동 결제 제안 금지
- 27개 버그는 **P0 → P1 → P2 → P3 4스프린트**로 분할, PR당 5~8개, 각 PR rollback 가능
- 출시 후 Retention(P3)만 신규 기능 허용

---

## SPRINT P0 — Release Blocker 안정화 (1주 / 8 bug)

목표: 로그인·인증·체결·출금·스테이킹 100% 안정.

수정 대상 버그:
- #1 2FA OTP 6자리 입력 후 화면 전환
- #3 지문(WebAuthn) 인증 완전 작동
- #5 출금 비밀번호 키패드 가림 (iOS 11+, `visualViewport` + `scrollIntoView`)
- #10 트레이딩 상단 숫자 화면 떨림 (tabular-nums + fixed-width + `requestAnimationFrame` 스로틀)
- #13 Long/Short "PHON 베팅이 잠시 멈춰있어요" 제거 + 실제 체결
- #14 Isolated / Cross 모드 복구 (Bybit/Binance 동일)
- #15 슬롯 로딩 가속 + 회전 그림 끊김 (preload sprite + WebGL fallback)
- #21 phon#staking "스테이크 추가" 먹통 + 2FA 완료자 재인증 알림 제거
- #26 매직링크 KYC 1회 후 반복 제거

추가 인프라:
- `setVisibleInterval` 전역 적용 (visibilitychange로 background RPC 정지)
- Cloudflare + Edge 레벨 Rate Limit 도큐먼트화 (백엔드 RL 코드 추가 안 함, 인프라 문서만)
- GodModePanel 중복 realtime 채널 제거

완료 게이트: 로그인 99.9% · 체결 99% · 출금 오류 <1% · 슬롯 프레임 드랍 0 · OTP 반복 0.

---

## SPRINT P1 — 구조 / 성능 / 라우팅 (1주)

### Crown UI 제거 + PHON 리브랜딩 (Adapter Layer)
- 신규: `src/core/reward/rewardAdapter.ts` — `grantPhonReward()` / `grantVipReward()` / `grantReferralReward()` → 내부에서만 `award_crown` 호출
- 프론트는 `award_crown` 직접 호출 전면 금지 (ESLint rule 추가)
- 용어 매핑: Crown → PHON Bonus / Crown Reward → PHON Reward / Crown Level → VIP Level / Crown Point → PHON Point / Crown Multiplier → VIP Boost / Empire Crown Booster → PHON Booster
- 삭제 UI: CrownAura, CrownBadge, Crown Progress, Crown Widget, Crown 메뉴/라우트
- 백엔드 (`award_crown`, `crown_events`, Founding Season, Baron 승급, Whale Strike, Achievement, Empire Booster) **전부 유지**

### Navigation 한글화 — Bottom Nav 5탭
```text
홈 │ 트레이딩 │ 실시간 대결 │ 게임 │ PHON
```
(P2에서 5탭 확정: 트레이딩 / 실시간대결 / 게임 / PHON / VIP)
- 48dp 터치 타겟, `viewport-fit=cover` + `env(safe-area-inset-*)`

### Hero 재설계
- Headline: "지금 가장 많이 참여 중인 PHONARA"
- Sub: "코인 입출금 주력 · 무료 예측 · 게임 · 실시간 보상 · PHON 받기"
- Primary CTA "지금 참여하기" / Secondary "체험 모드 시작하기"
- 아래 섹션: Whale Strike Feed · 오늘의 예측 미션 · Popular Games Top 5 · Live Payouts Ticker (한국 은행 출금 강조)

### Flow Engine (라우팅 상태머신)
- 비로그인 → Landing / 가입 완료 → Onboarding / 온보딩 완료 → Home / 재방문 → Home
- Landing → Guide → Landing 랜덤 이동 꼬임 제거

### 성능
- `React.lazy + Suspense` 최대 적용 (admin/* + atelier + heavy 3D)
- Lounge framer-motion `IntersectionObserver` pause + `prefers-reduced-motion`
- Pretendard `font-display: swap` + LCP `<link rel=preload fetchpriority=high>`
- Target: Mobile LCP < 2.0s, FCP < 1.2s

---

## SPRINT P2 — UX / UI 리빌드 (1주, 11 bug)

- #2 친구추천을 별도 메뉴로 분리 + 카피·UX 개편
- #4 내 제국 안 배지 + 업적 단일 화면 통합
- #6 내 제국 라이브 피드 속도 정상화 + 동작 최소화 토글
- #7 운영원칙·가이드 Stake/Rollbit/Freecash 수준 재정리
- #8 1:1 챗봇 상황별 기본 답변 자동 제공
- #9 대관전 (= 실시간 대결) 50~70대 즉시 인지 위치 + 1탭 진입
- #11 잔액 표시 = PHON + KRW + USDT 한 줄 (이미 `<MultiCurrencyBalance />` 활용)
- #12 레버리지 슬라이더 Bybit/Binance급 업그레이드
- #16 슬롯 볼륨/잔고/글자 Stake.com급 배치
- #17 슬롯 배당표·규칙·보너스 스크롤 없이 노출
- #18 슬롯 플랫폼 로고 + 전체 폰트 통일
- #19 제국 패키지 중복 정리
- #20 라이브 메뉴 플랫폼 이름 노출
- #22 atelier "합성 = 제국의 결혼식" → "NFT 합성"
- #23 Crown UI 완전 PHON 통합 (P1과 연동, 잔존분 제거)
- #24 atelier 지갑 버튼 → NFT 확인 페이지로
- #25 플랫폼 등급 시스템 단일화 (VIP Level만 노출)
- #27 어드민 1인 운영 최적화 (Stake/Rollbit급 IA, AAL2 그대로)

### 삭제 / 숨김
- **Hard Delete**: GodModePanel · CockpitV2 · AchievementsV3 · apex-vrf-oracle-v1 · 구 Lounge heavy marquee · test/debug/legacy 페이지
- **Rename + Keep**: imperial-duel → "실시간 대결"
- **Lazy + Conditional Render**: Admin/Operator 전체, NFT Atelier (미완), pixi.js/three.js heavy

---

## SPRINT P3 — Retention Engine (출시 후)

Daily Mission · PHON Hunt · Streak Reward · Daily Prediction · Referral Team · Slot Event · Whale Event · AI Coach.

---

## 입출금 정책 (전역 카피)

- 1순위: **코인 입출금** (BTC/USDT/USDC) — "주력" 강조
- 2순위: **한국 원화 계좌이체** — "빠른 한국 은행 출금" 신뢰 카피
- 3순위: 상품권 수동 (기존)
- Stripe/PG 자동 결제 제안 금지 (memory constraint)

---

## 디자인 토큰

- Dark + Gold + Neon Purple
- 큰 버튼 / 큰 글씨 / 한 손 조작 / 50~70대 친화
- 모든 색상 HSL 토큰 (index.css), `text-white`/`bg-black` 등 직접 클래스 금지

---

## 실행 순서 / Rollback

1. **PR-P0-1**: setVisibleInterval + Cloudflare RL 문서 + GodModePanel 채널 정리 (인프라)
2. **PR-P0-2**: 인증 4종 (#1·#3·#5·#26)
3. **PR-P0-3**: 트레이딩 4종 (#10·#13·#14·#15·#21)
4. → P0 완료 보고 → QA → P1 시작
5. **PR-P1-1**: rewardAdapter + ESLint guard + Crown UI 제거
6. **PR-P1-2**: Navigation 한글화 + Bottom Nav + Hero 재설계
7. **PR-P1-3**: Flow Engine + lazy + LCP/FCP 최적화
8. → P1 완료 보고 → P2 시작
9. P2를 3개 PR로 분할 (#2·4·6·7·8·9 / #11·12·16·17·18·20 / #19·22·24·25·27)
10. 각 PR rollback 가능, Master PR 금지

---

## Out of scope (이번 작업에서 절대 하지 않음)

- award_crown / Treasury / Founding Season / withdrawal RPC / PHON ledger 본문 수정
- Crown 백엔드 hard delete (DROP TABLE / DROP FUNCTION / trigger 삭제)
- 백엔드 코드 레벨 rate limiting (인프라 문서만)
- imperial-duel 기능 삭제 (이름만 변경)

---

## 승인 후 즉시 시작

승인 시 **PR-P0-1 (setVisibleInterval + GodModePanel 채널 정리 + Cloudflare RL 문서)** 부터 단일 PR로 진입합니다.
