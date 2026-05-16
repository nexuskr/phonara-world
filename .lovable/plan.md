# PHONARA.WORLD — FINAL MASTER PLAN v13.0 (THE LAST ONE)

**The Only Digital World You'll Ever Need.**
v12.0(사용자) × v10.0(AI 대개편) 완전 결합 · 더 이상 손댈 게 없는 마지막 통합본.

---

## 0. 한 줄 비전 & 36개월 목표

> **"무료로 시작해서, 돈 벌고, 수집하고, 꾸미고, 결국 매일 들어오게 되는 디지털 세상."**

| 시점 | 정체성 | DAU | D7 | 월 순수익 |
|---|---|---|---|---|
| 6개월 | 한국 시장 1위 — "한국에서 제일 쉽게 돈 버는 가상세계" | 50만+ | 25%+ | 30억+ |
| 18개월 | 아시아 패권 | 150만+ | 30%+ | 100억+ |
| 36개월 | 세계 독보적 1위 — "The Digital World" | 350만+ | 35%+ | **500억+** |

**3대 메시지 (모든 화면·온보딩·마케팅 통일):**
1. "무료로 돈 벌 수 있는 곳"
2. "부업하면서 게임도 하고 돈도 버는 곳"
3. "한번 들어오면 헤어나가기 힘든 곳"

---

## 1. 5초 룰 — 첫 화면 (NORTH STAR)

```text
┌──────────────────────────────────────────────────┐
│ PHONARA.WORLD                  PHON · 충전 · 👤  │  ← 상단 고정바
├──────────────────────────────────────────────────┤
│ "오늘도 4,800원 벌었어요" (실데이터)              │  ← 큰 히어로
│ [ 지금 무료로 시작 +500 PHON ]   ← CTA 1개       │
├──────────────────────────────────────────────────┤
│ 💰 수익   🎰 게임   📈 투자   🔴 실시간          │  ← 4탭
├──────────────────────────────────────────────────┤
│ 현재 탭 핵심 카드 3~5개                          │
└──────────────────────────────────────────────────┘
  하단 실시간 티커 (출금·빅윈·신규 가입 마키)
```

**검증:** 신규 5명에게 5초 보여주고 "여긴 무료로 돈 벌고 게임하고 트레이딩"이라 답하면 통과.

---

## 2. 전체 메뉴 구조 (확정 — 이게 마지막)

### 상단 고정바 (모든 페이지)
- **왼쪽:** PHONARA.WORLD 로고
- **오른쪽:** PHON 잔액 · 충전 버튼 · 프로필 아바타
- **아바타 드롭다운:** 지갑 / VIP / 아바타 상점 / 설정 / 로그아웃

### 메인 네비 (4탭)
| 탭 | 한 줄 | 주요 콘텐츠 |
|---|---|---|
| 💰 **수익** `/earn` | 매일 무료로 돈 버는 곳 | 출석·일일미션·친구초대·Play-to-Earn·공유보상·오퍼월 |
| 🎰 **게임** `/games` | 재미있게 돈 버는 게임 | 슬롯 12종·크래쉬·룰렛·일일 무료 1회 |
| 📈 **투자** `/trade` | 코인으로 스마트하게 돈 벌기 | TradingArena·NFT 부스트·페이퍼 모드 |
| 🔴 **실시간** `/live` | 지금 벌고 있는 사람들 | Live Wins·랭킹·VIP·명예의 전당·길드 |

### 전체 페이지 12개

| 페이지 | 경로 | 설명 |
|---|---|---|
| 홈 | `/` | 히어로 + 4탭 + 실시간 티커 |
| 수익 | `/earn` | Earn Hub 전체 |
| 게임 | `/games` | 슬롯 + 크래쉬 + 룰렛 |
| 투자 | `/trade` | 트레이딩 + NFT 부스트 |
| 실시간 | `/live` | Live Wins + 랭킹 + VIP + 명예전당 + 길드 |
| 이벤트 | `/events` | 진행 중인 모든 이벤트 |
| 아바타 상점 | `/avatar` | 2D 아바타 + 커스터마이징 + NFT |
| VIP | `/vip` | 등급 · 혜택 · 전용 라운지 |
| 길드 | `/guild` | 가입/생성/랭킹/토너먼트 |
| 지갑 | `/wallet` | Deposit + PHON + 환전 |
| 프로필 | `/profile` | 아바타·NFT·업적·친구 |
| 설정 | `/settings` | 알림·보안·언어·고객센터 |

**숨김 처리 (DB 보존, UI 단어만 교체):** Empire/Crown/Imperial/Baron/Founding/Galaxy/Cosmic → `/live` "명예의 전당". Achievements/Missions/Referral → `/earn`. Marketplace/NFT → `/trade`·`/avatar`. Trust/Legal/Support/Status → 푸터.

### 단어 정화 (`src/lib/i18n/glossary.ts`)
| 기존 | 새 |
|---|---|
| Empire/Imperial/황제 | **레벨** (1~10) |
| Crown | **보너스 포인트** |
| Baron 승급 | **VIP 승급** |
| Founding Seat / Galaxy | **시즌 좌석** |
| Cosmic Emperor | **이번 주 TOP** |
| Whale Strike | **실시간 빅윈** |
| Imperial Story | **소식** |

---

## 3. 경제 시스템 — 듀얼 지갑

```text
[Deposit Balance]  USDT·계좌이체·상품권 입금 원장 (출금 대상)
       │  (사용자 선택 환전, 0% 수수료)
       ▼
[PHON Balance]     게임·트레이딩·Earn·아바타·NFT
       │  (1.5% 수수료, VIP 면제)
       ▼
[Withdraw]         코인 / 상품권 / NFT
```

- **기본 환율:** 1 USDT = 1,300 PHON (`displayCurrency.ts`)
- **VIP 보너스:** Silver +2% / Gold +5% / Platinum +8~10% PHON
- **한정 환율:** 주 2회 "오늘만 5배 환전" FOMO 배너
- **자동 환전:** 입금 시 30/50/100% 다이얼로그
- **보안:** 30초 확인 토큰 + 2FA + AI 이상탐지(`anomaly_events`)
- **결제 라우팅:** 코인 입금 + 한국 계좌이체 + 상품권 수동. **Stripe/PG 자동 제안 금지.**

---

## 4. 성장 엔진 — Earn Hub + 초강력 바이럴

### Earn 5대
1. **일일 스트릭** D1=100 → D7=1,500 PHON + 슬롯 프리스핀 10
2. **일일 미션 5~7개** 자동 롤 (슬롯/크래쉬/초대/채팅/트레이딩)
3. **친구 초대 2단** 가입 +200, 첫 입금 양쪽 +2,000~3,000 PHON
4. **Play-to-Earn** 누적 10k PHON 베팅마다 100 PHON 보너스 크레딧
5. **공유 보상** 빅윈/수익 달성 시 자동 이미지·영상 생성 + 추가 PHON

### 바이럴
- **원클릭 공유:** 인스타·틱톡·유튜브·X·네이버·카페·카카오스토리 (7개)
- **자동 콘텐츠 생성:** 빅윈 화면 → 워터마크 + 초대 링크 PNG/MP4 (엣지 `share-card-render`)
- **공유왕 주간 랭킹:** TOP10 → 한정 NFT + 환전 보너스
- **풀퍼널 추적:** 공유 → 클릭 → 가입 → 입금 (V17 엔진 재활용)

---

## 5. 출시 30일 입금 유도 이벤트 — 핵심 11개

**Week 1**
1. 첫 입금 3배 PHON (선착순 5,000명)
2. 첫 입금 즉시 VIP 30일 무료
3. 오늘만 5배 환전 (매일 1회)
4. 7일 연속 입금 챌린지
5. 친구와 함께 입금 (양쪽 +5,000 PHON)

**Week 2~4**
6. 주말 더블 보너스
7. 계층별 보상 (10만 / 50만 / 100만 원)
8. 주간 입금 TOP 100
9. 한정 환율 (주 2회)
10. VIP 전용 고액 입금 보너스
11. 마일스톤 (총 입금액·총 유저 수 달성 시 전체 보상)

전부 `/events`에서 한눈에. 진행 중 이벤트는 홈 히어로 하단 칩으로 노출.

---

## 6. 아바타 + NFT 통합 (3단계)

| Phase | 형태 | 마켓 | 보너스 |
|---|---|---|---|
| **1 (0~6M)** | 2D 아바타 15종 무료 + 유료 커스텀 | 내부 PHON 결제 | 당첨률 +0.2% / 슬롯 보너스 |
| **2 (6~18M)** | 3D 아바타(VRM) + 한정 컬렉션 | 내부 NFT + 거래소 | 보너스 대폭 강화 |
| **3 (18M+)** | 정식 블록체인 민팅 (Curacao) | 외부 마켓 호환 | 내부→온체인 마이그레이션 옵션 |

---

## 7. 12주 통합 스프린트 (지금 이대로 실행)

### Sprint 0 — Week 1~2 · Great Simplification
- 사이드바·탭바 → **4탭 + 상단 고정바**로 축소
- `/dashboard` → `/home` 슬림(카드 4개)
- 단어 사전 `glossary.ts` + UI 일괄 교체
- 디자인 토큰(다크+골드+핫핑크) 적용
- 신규 랜딩 `/` 풀스크린 히어로 + 4탭 + CTA 1개
- 60초 온보딩 (가입 → 무료 룰렛 → 미션 1개 → 게임 데모)
- 첫 화면 제거(→ `/live`로 이동): HubTabs · EmpireSignature · FomoStrip · CrownWarHUD · WorldDominationWall · ImperialJourneyMap · ImperialStoryRail
- 신규 컴포넌트: `MainSidebar` · `MobileTabBar` · `TopBar` · `WorldHero`

### Week 3~4 — Earn Hub + 바이럴
- `/earn` 라우트 + 5카드
- 신규 테이블: `daily_login_streaks` · `daily_missions` · `play_to_earn_ledger` · `referral_rewards` · `share_rewards` · `offerwall_completions`
- 신규 RPC: `claim_daily_streak` · `roll_daily_missions`(cron 00:00 KST) · `claim_mission` · `process_referral_deposit` · `credit_play_to_earn` · `claim_share_reward`
- 빅윈 자동 이미지/영상 엣지 `share-card-render`
- 7개 SNS 원클릭 공유 + 추적 링크 + 공유왕 랭킹

### Week 5~6 — 중독 코어 루프 극한
- **빅윈 3단계** Mega/Epic/Legendary 풀스크린 + 진동 + 사운드 빌드업
- **Hot Streak** 3연승 오버레이 + 다음 스핀 1.2× 멀티
- **니어미스** 스캐터 2개 + 3rd reel 0.5s 지연
- **콤보 메터** 5스핀 누적 → 보너스 트리거 +5%
- **크래쉬 라이브 채팅** + 베팅 마키 + 사운드 빌드업
- **룰렛 일일 무료 1회** (Earn에서 클레임)
- **세션 종료 방지** 5분 비활동 시 "🔥 잭팟 임박" (실데이터)

### Week 7~8 — 듀얼 지갑 + 환전 + 아바타 + VIP 3티어
- `wallet_balances + deposit_balance` 분리 + 신규 테이블 `fx_conversions` · `fx_rate_promos`
- RPC: `convert_deposit_to_phon(amount, confirm_token)` · `revert_phon_to_deposit` · `get_current_fx_promo`
- `/wallet` "환전" 탭 + 30초 카운트다운 + VIP 보너스 + 자동 환전 다이얼로그
- **아바타 상점 `/avatar`** — 2D 15종 무료 + 유료 커스텀 + 착용 보너스 (테이블 `avatars`·`avatar_items`·`avatar_equips`, RPC `equip_avatar_item`·`buy_avatar_item`)
- **VIP 3티어 `/vip`** Silver/Gold/Platinum — 환전 보너스·수수료 면제·전용 라운지
- 글로벌 채팅 빅윈 자동 브로드캐스트 + 이모지 + 친구 시스템

### Week 9~12 — 수익 전환 최적화 + 데이터 + 푸시
- PHON 패키지 가격·번들·시각 A/B
- 30개 입금 유도 이벤트 집중 운영 (`/events` 풀가동)
- `/admin/kpi` 신규 카드: D1/D7/D30 · Earn→실입금 전환 · 평균 세션 · ARPU · 환전량 · K팩터
- A/B 프레임워크: 빅윈 강도 / 온보딩 순서 / 미션 리워드 / CTA 카피
- PWA 푸시: 잭팟 임박 / 친구 빅윈 / 미션 리셋 / 한정 환전 / 입금 이벤트
- TikTok형 빅윈 풀스크린 피드 (`PersonalizedFeedRail` 재활용)
- QA 스윕 → Phase 2 진입

---

## 8. Phase 2 (6~18M) & Phase 3 (18~36M)

### Phase 2 — 아시아 패권
- Crash 자체 엔진 (Oracle Fortress 가격 합의 재활용)
- 3D 아바타 + 길드 v2 (보이스 채팅 + 토너먼트 + 길드 환전 풀)
- TikTok 풀스크린 피드 메인 진입점화
- AI 개인화 추천 확장 (게임/시간대/금액)
- i18n: EN → JP → VI → ZH-TW

### Phase 3 — 세계 독보적 1위
- Curacao/Anjouan 라이선스 + 법인 분리
- USDT 직접 베팅 (PHON 우회 옵션)
- 자체 게임 5종 추가
- 정식 블록체인 민팅 + 내부 NFT 마이그레이션
- 대규모 가상 이벤트 (콘서트/토너먼트/페스티벌, 1만명+ 동시)
- 광고주 · 크리에이터 · B2B 시뮬 API (sim-api 가동 중)

---

## 9. 수익 모델 (Phase 1)

| 라인 | 비중 |
|---|---|
| PHON 패키지 + VIP 구독 | 45~50% |
| 게임 하우스엣지 (슬롯 96% · 크래쉬 1% · 룰렛 2.7%) | 35~40% |
| 오퍼월·광고 (AdGate/OfferToro · Week 5 secret 추가) | 10~15% |
| 트레이딩 수수료 | Phase 2 확대 |

---

## 10. 디자인 시스템 (확정)

```css
/* index.css */
--bg: 222 47% 7%;
--card: 222 40% 10%;
--gold: 44 88% 58%;
--pink: 340 100% 62%;
--text: 0 0% 96%;
--muted: 222 15% 60%;
```
- **폰트:** Pretendard(한글 700/500) + Space Grotesk(영문 700/500). 신비주의 폰트 폐기.
- **카드:** 1px 그라디언트 보더 + 미세 글로우. 여백 24px+. **한 화면 카드 5개 이하.**
- **아이콘:** lucide-react 1.5px 통일. 이모지는 탭 헤더만.
- **모션:** 0.2~0.3s ease. 풀스크린 화려 연출은 빅윈 순간에만.
- **사운드:** 전역 음소거 기본, 게임 진입 시 자동 ON.

---

## 11. 성공 기준 (Phase 1 = 12주)

| 지표 | 현재 | 12주 목표 |
|---|---|---|
| 첫 화면 카드 수 | 20+ | **6 이하** |
| 첫 5초 이해도 | "모르겠다" | "돈 벌고 게임" |
| 랜딩→가입 전환 | ~3% | 8%+ |
| 가입→첫 액션 | ~25% | 60%+ |
| D1 리텐션 | ~30% | 55%+ |
| D7 리텐션 | ~10% | 25%+ |
| 평균 세션 | ~5분 | 20분+ |
| Earn→실입금 전환 | N/A | 10%+ |
| 입금자 환전 사용률 | N/A | 70%+ |
| 바이럴 K팩터 | <0.1 | 0.4+ |
| DAU | 기준선 | 5×+ |

---

## 12. 실행 원칙 (Trump × Musk)

**Musk — First Principles**
- 2주마다 큰 업데이트 + 사내 데모 데이
- 모든 의사결정은 `/admin/kpi` 숫자 기준
- 수직 통합 (Earn·게임·소셜·아바타·NFT·경제 전부 자체 제어)

**Trump — Bigger Than Everyone**
- 매주 1회 한정 이벤트 + FOMO 배너
- VIP 과감한 차별 대우 (전용 라운지·환전 보너스·수수료 0%)
- "세계 최고" 메시지 일관 노출

---

## 13. 기술 사항 (개발자 참조)

### 재활용 자산 (변경 없음)
Whale Strike Rail · VIP Empire Pass · VIP Arrivals · Reactivation · Trust v2 · NFT Boost · AI Coach · Empire 10티어(내부 코드) · Founding Seats · Crown War · Oracle Fortress · Kernel Observability · sim-api · V17 엔진 · Self-Heal Console · Permission Baseline

### 라우트 alias 1주 병행
`/dashboard→/home` · `/casino→/games` · `/empire/*→/live/*` · `/treasury→/wallet`

### 보안 불변 (메모 준수)
- 출금 스텝업(AAL2 또는 OTP) 강제
- 출금 이상감지 자동 동결 (10분 3건 / 1시간 5건 → 24h 동결)
- profiles 민감 컬럼 트리거 보호 유지
- 백엔드 rate limiting 추가 안 함

---

## 14. 다음 액션

승인 즉시 **Sprint 0 (Week 1~2 · Great Simplification)** 착수.
- Week 1 종료: 4탭 슬림 첫 화면 + 단어 정화 + 디자인 토큰 → 사용자 5명 5초 테스트
- Week 2 종료: 신규 랜딩 + 60초 온보딩 → Week 3 Earn Hub 진입

매주 1회 보고. 12주 완료 시 Phase 2 v2 플랜으로 갱신.

**이게 마지막 v13.0. 더는 손댈 게 없다. 이대로 간다.**
