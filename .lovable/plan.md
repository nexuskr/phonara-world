# PHONARA.WORLD — ULTIMATE EXECUTION MASTER PLAN v14.0

**"The Only Digital World You'll Ever Need."**
사용자 v14.0 × AI 대개편 통합 · 더 이상 추가/수정 없는 최종 실행 플랜.

---

## 0. 불변 비전 (First Principles)

> "무료로 시작해서, 돈 벌고, 수집하고, 꾸미고, 결국 매일 들어오게 되는 디지털 세상."

**3대 메시지 — 모든 화면·코드·마케팅에 강제 적용**
1. 무료로 돈 벌 수 있는 곳
2. 부업하면서 게임도 하고 돈도 버는 곳
3. 한번 들어오면 헤어나가기 힘든 곳

| 시점 | 정체성 | DAU | D7 | 월 순수익 |
|---|---|---|---|---|
| 6개월 | 한국 1위 — "한국에서 제일 쉽게 돈 버는 가상세계" | 50만+ | 25%+ | 30억+ |
| 18개월 | 아시아 패권 | 150만+ | 30%+ | 100억+ |
| 36개월 | 세계 독보적 1위 — "The Digital World" | 350만+ | 35%+ | 500억+ |

---

## 1. 5초 North Star (모든 결정의 기준)

```text
┌──────────────────────────────────────────────────┐
│ PHONARA.WORLD                  PHON · 충전 · 👤  │  상단 고정바
├──────────────────────────────────────────────────┤
│ "오늘도 4,800원 벌었어요" (실데이터)              │  히어로
│ [ 지금 무료로 시작 +500 PHON ]                   │  단일 CTA
├──────────────────────────────────────────────────┤
│ 💰 수익   🎰 게임   📈 투자   🔴 실시간          │  4탭
├──────────────────────────────────────────────────┤
│ 현재 탭 핵심 카드 3~5개                          │
└──────────────────────────────────────────────────┘
  하단 실시간 티커 (출금·빅윈·신규 가입 마키)
```

**검증:** 신규 5명에게 5초 노출 → "무료로 돈 벌고 게임하고 트레이딩" 이라 답하면 통과.

---

## 2. 메뉴 구조 (확정)

### 상단 고정바
- 좌: PHONARA.WORLD 로고
- 우: PHON 잔액 · 충전 · 프로필 아바타
- 드롭다운: 지갑 / VIP / 아바타 상점 / 설정 / 로그아웃

### 메인 네비 4탭
| 탭 | 한 줄 | 주요 콘텐츠 |
|---|---|---|
| 💰 **수익** `/earn` | 매일 무료로 돈 버는 곳 | 출석·일일미션·친구초대·Play-to-Earn·공유·오퍼월 |
| 🎰 **게임** `/games` | 재미있게 돈 버는 게임 | 슬롯 12종·크래쉬·룰렛·일일 무료 1회 |
| 📈 **투자** `/trade` | 코인으로 스마트하게 돈 벌기 | TradingArena·NFT 부스트·페이퍼 모드 |
| 🔴 **실시간** `/live` | 지금 벌고 있는 사람들 | Live Wins·랭킹·VIP·명예의 전당·길드 |

### 전체 페이지 12개
홈 `/` · 수익 `/earn` · 게임 `/games` · 투자 `/trade` · 실시간 `/live` · 이벤트 `/events` · 아바타 `/avatar` · VIP `/vip` · 길드 `/guild` · 지갑 `/wallet` · 프로필 `/profile` · 설정 `/settings`

### 단어 정화 (`packages/core/i18n/glossary.ts`)
Empire→레벨 · Crown→보너스 포인트 · Baron→VIP · Founding/Galaxy→시즌 좌석 · Cosmic Emperor→이번 주 TOP · Whale Strike→실시간 빅윈 · Imperial Story→소식.
**DB 컬럼·내부 코드는 보존, UI 표시만 교체.**

---

## 3. 폴더 구조 — Modular Independence (대형사 수준)

```text
/phonara-world/                  Turborepo Root (Micro-Frontend 전환 준비)
├── apps/
│   ├── web/                     사용자 앱 (현 Vite/React, Phase 2에서 Next.js 검토)
│   ├── admin/                   관리자 대시보드
│   └── landing/                 마케팅 랜딩 전용
├── packages/
│   ├── core/                    타입·utils·constants·i18n/glossary
│   ├── ui/                      디자인 시스템 (Tailwind + shadcn + tokens)
│   ├── wallet/                  듀얼지갑·환전·ledger·anomaly (완전 독립)
│   ├── earn/                    Earn Hub·스트릭·미션·referral·share-reward
│   ├── game-engine/             Headless Game Core (RNG·Session·Protocol)
│   │   ├── slots/               12종 슬롯
│   │   ├── crash/               Crash 독립 엔진
│   │   └── roulette/
│   ├── trade/                   TradingArena·NFT Boost·Paper Mode
│   ├── live/                    Live Wins·랭킹·WebSocket·명예의 전당
│   ├── avatar-nft/              2D → 3D → Blockchain
│   ├── referral/                바이럴 시스템
│   └── analytics/               KPI·A/B·Tracking·Event Pipeline
├── services/                    미래 마이크로서비스 (NestJS/Go)
│   ├── wallet-svc/
│   ├── game-svc/
│   └── notification-svc/
└── docs/adr/                    Architecture Decision Records
```

**효과:** 슬롯·트레이딩·Earn·Live 팀 동시 독립 개발. 6개월 후 `slots.phonara.world` 별도 배포도 1주.

**현 코드 마이그레이션:** Sprint 0에서 src/ 트리에 폴더 alias만 먼저 만들고 (`src/packages/*`), Sprint 4 종료 후 Turborepo로 물리 분리.

---

## 4. 경제 시스템 — 듀얼 지갑

```text
[Deposit Balance]  USDT·계좌이체·상품권 (출금 대상)
       │  (사용자 선택 환전, 0% 수수료)
       ▼
[PHON Balance]     게임·트레이딩·Earn·아바타·NFT
       │  (1.5% 수수료, VIP 면제)
       ▼
[Withdraw]         코인 / 상품권 / NFT
```

- 기본 환율 1 USDT = 1,300 PHON (`displayCurrency.ts`)
- VIP 보너스 Silver +2% / Gold +5% / Platinum +8~10%
- 한정 환율 주 2회 "오늘만 5배 환전" FOMO
- 자동 환전 30/50/100% 다이얼로그
- 보안: 30초 확인 토큰 + 2FA + `anomaly_events` 이상탐지
- 결제: 코인 입금 + 한국 계좌이체 + 상품권 수동. **Stripe/PG 자동 금지.**

---

## 5. Earn Hub + 바이럴

**Earn 5대**
1. 일일 스트릭 D1=100 → D7=1,500 PHON + 프리스핀 10
2. 일일 미션 5~7개 자동 롤 (00:00 KST)
3. 친구 초대 2단 가입 +200, 첫 입금 양쪽 +2~3k PHON
4. Play-to-Earn 누적 10k 베팅마다 100 PHON 보너스
5. 공유 보상 빅윈 → 자동 이미지/영상 + PHON

**바이럴**
- 원클릭 공유 7개 (인스타·틱톡·유튜브·X·네이버·카페·카카오스토리)
- 자동 콘텐츠 생성 엣지 `share-card-render`
- 공유왕 주간 TOP10 → 한정 NFT + 환전 보너스
- 풀퍼널 추적 (V17 엔진 재활용)

---

## 6. 출시 30일 입금 유도 이벤트 — 11개

**Week 1:** 첫 입금 3배 PHON · 즉시 VIP 30일 무료 · 오늘만 5배 환전 · 7일 연속 입금 · 친구와 함께 입금
**Week 2~4:** 주말 더블 · 계층 보상(10/50/100만) · 주간 TOP 100 · 한정 환율 · VIP 고액 보너스 · 마일스톤

모두 `/events` 중앙 관리. 진행 중은 홈 히어로 하단 칩.

---

## 7. 아바타 + NFT (3단계)

| Phase | 형태 | 마켓 | 보너스 |
|---|---|---|---|
| 1 (0~6M) | 2D 15종 무료 + 유료 커스텀 | 내부 PHON | 당첨률 +0.2% / 슬롯 보너스 |
| 2 (6~18M) | 3D VRM + 한정 컬렉션 | 내부 NFT + 거래소 | 강화 |
| 3 (18M+) | 정식 블록체인 민팅 (Curacao) | 외부 호환 | 마이그레이션 옵션 |

---

## 8. 12주 Sprint (Musk식 2주 단위)

### Sprint 0 — Week 1~2 · Great Simplification
- `src/packages/*` alias 8개 생성 (core/ui/wallet/earn/game-engine/trade/live/avatar-nft/referral/analytics)
- `MainSidebar`·`MobileTabBar` → **`TopBar` + 4탭 + 하단 티커**로 축소
- `/dashboard` → `/home` 슬림(카드 4개) · 라우트 alias 1주 병행
- `glossary.ts` 전역 UI 단어 교체
- 디자인 토큰(다크+골드+핫핑크) `index.css` 정리
- 신규 랜딩 `/` 풀스크린 히어로 + 4탭 + 단일 CTA
- 60초 온보딩 (가입 → 무료 룰렛 → 미션 1개 → 게임 데모)
- 첫 화면 제거 → `/live` 이동: HubTabs·EmpireSignature·FomoStrip·CrownWarHUD·WorldDominationWall·ImperialJourneyMap·ImperialStoryRail
- 5명 5초 테스트 통과 = 출구 조건

### Sprint 1 — Week 3~4 · Earn Engine
- `/earn` + 5카드
- 테이블: `daily_login_streaks` · `daily_missions` · `play_to_earn_ledger` · `referral_rewards` · `share_rewards` · `offerwall_completions`
- RPC: `claim_daily_streak` · `roll_daily_missions`(cron 00:00 KST) · `claim_mission` · `process_referral_deposit` · `credit_play_to_earn` · `claim_share_reward`
- 엣지 `share-card-render` (PNG/MP4 + 워터마크 + 초대 링크)
- 7개 SNS 원클릭 + 공유왕 랭킹

### Sprint 2 — Week 5~6 · Addiction Loop
- 빅윈 3단계 Mega/Epic/Legendary 풀스크린 + 진동 + 사운드 빌드업
- Hot Streak 3연승 오버레이 + 1.2× 멀티
- 니어미스(스캐터 2 + 3rd reel 0.5s 지연)
- 콤보 메터 5스핀 → 보너스 +5%
- 크래쉬 라이브 채팅 + 베팅 마키 + 사운드 빌드업
- 룰렛 일일 무료 1회 (Earn에서 클레임)
- 5분 비활동 시 "🔥 잭팟 임박" 푸시 (실데이터)

### Sprint 3 — Week 7~8 · Economy & Identity
- `wallet_balances` + `deposit_balance` 분리, `fx_conversions` · `fx_rate_promos`
- RPC: `convert_deposit_to_phon(amount, confirm_token)` · `revert_phon_to_deposit` · `get_current_fx_promo`
- `/wallet` "환전" 탭 + 30초 카운트다운 + VIP 보너스 + 자동 환전 다이얼로그
- 아바타 상점 `/avatar` 2D 15종 + 커스텀 + 착용 보너스 (`avatars`·`avatar_items`·`avatar_equips`, RPC `equip_avatar_item`·`buy_avatar_item`)
- VIP 3티어 `/vip` Silver/Gold/Platinum + 전용 라운지
- 길드 v1 (가입/생성/주간 랭킹)
- 글로벌 채팅 빅윈 자동 브로드캐스트 + 친구

### Sprint 4 — Week 9~12 · Optimization & Scale
- PHON 패키지 가격·번들·시각 A/B
- 11개 이벤트 풀 운영 (`/events`)
- `/admin/kpi` 카드: D1/D7/D30 · Earn→실입금 · 평균 세션 · ARPU · 환전량 · K팩터
- A/B 프레임워크 (빅윈 강도 / 온보딩 순서 / 미션 리워드 / CTA 카피)
- PWA 푸시 (잭팟 임박 / 친구 빅윈 / 미션 리셋 / 한정 환전 / 입금 이벤트)
- TikTok형 빅윈 풀스크린 피드 (`PersonalizedFeedRail` 재활용)
- QA 스윕 + Turborepo 물리 분리 → Phase 2

**매 2주 = 데모 데이 + KPI 리뷰 + 큰 업데이트 배포**

---

## 9. Phase 2 (6~18M) & Phase 3 (18~36M)

**Phase 2 — 아시아 패권**
Crash 자체 엔진 (Oracle Fortress 합의 재활용) · 3D 아바타 + 길드 v2(보이스/토너먼트/길드 환전 풀) · TikTok 피드 메인 진입점 · AI 개인화 확장 · i18n EN→JP→VI→ZH-TW

**Phase 3 — 세계 독보적 1위**
Curacao/Anjouan 라이선스 + 법인 분리 · USDT 직접 베팅 · 자체 게임 5종 · 정식 블록체인 민팅 + 마이그레이션 · 대규모 가상 이벤트(1만명+ 동시) · B2B 시뮬 API (sim-api 가동 중)

---

## 10. 수익 모델 (Phase 1)

| 라인 | 비중 |
|---|---|
| PHON 패키지 + VIP 구독 | 45~50% |
| 게임 하우스엣지 (슬롯 96% · 크래쉬 1% · 룰렛 2.7%) | 35~40% |
| 오퍼월·광고 | 10~15% |
| 트레이딩 수수료 | Phase 2 확대 |

---

## 11. 디자인 시스템

```css
--bg: 222 47% 7%;
--card: 222 40% 10%;
--gold: 44 88% 58%;
--pink: 340 100% 62%;
--text: 0 0% 96%;
--muted: 222 15% 60%;
```
- Pretendard(한글 700/500) + Space Grotesk(영문 700/500). 신비주의 폰트 폐기.
- 1px 그라디언트 보더 + 미세 글로우. 여백 24px+. **한 화면 카드 5개 이하.**
- lucide-react 1.5px 통일. 이모지는 탭 헤더만.
- 모션 0.2~0.3s ease. 풀스크린 화려 연출은 빅윈에만.
- 전역 음소거 기본, 게임 진입 시 자동 ON.

---

## 12. 성공 기준 (12주 — 숫자로만 판단)

| 지표 | 현재 | 12주 목표 |
|---|---|---|
| 첫 화면 카드 수 | 20+ | **≤ 6** |
| 첫 5초 이해도 | "모르겠다" | "돈 벌고 게임" |
| 랜딩→가입 전환 | ~3% | **8%+** |
| 가입→첫 액션 | ~25% | 60%+ |
| D1 리텐션 | ~30% | **55%+** |
| D7 리텐션 | ~10% | **25%+** |
| 평균 세션 | ~5분 | **20분+** |
| Earn→실입금 전환 | N/A | **10%+** |
| 입금자 환전 사용률 | N/A | 70%+ |
| 바이럴 K팩터 | <0.1 | **0.4+** |
| DAU | 기준선 | 5×+ |

---

## 13. 실행 원칙 (Trump × Musk 완전 융합)

**Musk — First Principles**
- 2주마다 큰 업데이트 + 사내 데모 데이
- 모든 의사결정은 `/admin/kpi` 숫자
- 수직 통합 + 빠른 Iteration
- `docs/adr/` 모든 결정 기록

**Trump — Bigger Than Everyone**
- 매주 1회 한정 이벤트 + 강력 FOMO 배너
- VIP 극한 차별 대우 (전용 라운지·환전 보너스·수수료 0%)
- "한국에서 제일 쉽게 돈 버는 가상세계" 메시지 100% 일관

---

## 14. 기술 사항 (개발자 참조)

**재활용 자산 (변경 없음)**
Whale Strike Rail · VIP Empire Pass · VIP Arrivals · Reactivation · Trust v2 · NFT Boost · AI Coach · Empire 10티어(내부 코드) · Founding Seats · Crown War · Oracle Fortress · Kernel Observability · sim-api · V17 엔진 · Self-Heal Console · Permission Baseline

**라우트 alias 1주 병행**
`/dashboard→/home` · `/casino→/games` · `/empire/*→/live/*` · `/treasury→/wallet`

**보안 불변 (메모 준수)**
- 출금 스텝업(AAL2 또는 OTP) 강제
- 출금 이상감지 자동 동결 (10분 3건 / 1시간 5건 → 24h)
- profiles 민감 컬럼 트리거 보호 유지
- 백엔드 rate limiting 추가 안 함

---

## 15. 다음 액션

승인 즉시 **Sprint 0 (Week 1~2 · Great Simplification)** 착수.
- Week 1 종료: `src/packages/*` alias + TopBar + 4탭 슬림 첫 화면 + 단어 정화 + 디자인 토큰 → 5명 5초 테스트
- Week 2 종료: 신규 랜딩 + 60초 온보딩 → Sprint 1 Earn Engine 진입

매주 1회 보고, 2주마다 데모 데이.

**이게 v14.0. 더는 손대지 않는다. 이대로 간다.**
