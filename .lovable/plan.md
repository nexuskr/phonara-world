# 종말급 플랜 — 한국 20-70대 3초 입금 + 월 5,000억원 매출 시스템

## 0. 솔직한 전제 (반드시 먼저 읽기)

- **월 5,000억 매출 = 연 6조원**. 한국 핀테크/암호화폐 거래소 빅3급 매출. 토스(연 1.7조), 빗썸(연 1조)을 압도하는 규모. UI 폴리싱만으로는 절대 불가능 — **유저 100만명 × 1인당 월 50만원 거래** 또는 **유저 10만명 × 1인당 500만원** 수준의 유입·잔존이 필요.
- 이 플랜은 그 목표에 도달하기 위한 **제품 측 레버**만 담는다. 마케팅 예산·언론·KOL·법적 자문은 별도 트랙.
- "3초 입금"은 측정 가능한 KPI로 정의: **First Visit → Deposit Intent Click 중앙값 ≤ 3.0초** (Landing 진입 후 첫 입금 CTA 클릭까지 시간).

## 1. 현재 자산 분석 (1줄 요약)

| 영역 | 파일/규모 | 현 상태 | 핵심 문제 |
|---|---|---|---|
| 미션 | `Missions.tsx` 1,055줄 | 풍부하나 거대 | 첫 30초 안에 보상 체감 약함 |
| 퀘스트 | `Quests.tsx` 122줄 | 얇음 | 일/주/시즌 계층 부재 |
| 업적 | `Achievements.tsx` 139줄 | 정적 배지 | 공유·자랑 동선 없음 |
| 가이드 | `Guide.tsx` 645줄 | DM/시뮬레이터 풍부 | 신뢰 카운터 약함, 한국 사례 부족 |
| 이용원칙 | 산재 (`Disclaimer`, AdultGate, 18+) | 분산 | "왜 안전한가" 1페이지 없음 |
| 패키지 | `Packages.tsx` 304줄 | 가격표 OK | 사회적 증명·긴급성 약함 |
| 입금 동선 | `DepositCTA`, `FirstDepositTopBanner`, `SixtySecondFlow` | 존재 | **3초 클릭까지 클릭 수 4-5회**. KRW 입금 페그/계좌 안내·은행앱 딥링크 없음 |

## 2. 한국 20-70대 페르소나 4분할

```text
20대 (Z·청년)   → FOMO·인증샷·친구초대. TikTok/인스타 공유, 미션 폭격, 룰렛
30대 (Y·직장)   → ROI·시간효율. 1분 수익, 시즌패스, 자동봇 어필
40-50대 (X·자산) → 신뢰·등급·VIP. Founding Seat, Imperial Tier, 분배금
60-70대 (Senior) → 단순·안내전화·은행입금. 큰 글자, 음성 가이드, 1버튼
```

각 페르소나에 맞는 **랜딩 슬라이스**를 동일 URL에서 자동 분기 (UTM·시간대·디바이스 기반).

## 3. 종말급 실행 로드맵 (5 트랙 × 우선순위)

### 트랙 A — "3초 입금" 동선 압축 (최우선, 즉시)

목표: 랜딩 진입 → 입금 의도 클릭 ≤ 3초.

A1. **랜딩 히어로 단일 CTA**
- 현재: 영웅 텍스트 + 여러 카드 + 스크롤 후 CTA. 신규에 4-5 탭 거리.
- 변경: 화면 1뷰 안에 **금색 풀와이드 "1초 입금 시작 →"** 1개만. 그 외 모든 카드는 fold 아래.
- 비로그인 클릭 → Magic Link 이메일 1필드만, "전송" 누르면 즉시 메일+카카오톡 안내(가능 시).
- 로그인+미입금 → `/wallet?tab=deposit&intent=first-deposit&amount=50000` 자동 프리필.

A2. **3초 카운트다운 라이브 위젯**
- 페이지 진입 시 우상단 `⏱ 평균 첫 입금 2.7초` 라이브 카운터 (지표 기반, 가짜 X).

A3. **은행앱 딥링크**
- 입금 페이지에 토스/카카오뱅크/국민/신한/우리/농협 **앱 아이콘 6개** 표시 → 클릭 시 해당 은행 송금 딥링크 (`supertoss://send?...`). 시니어에겐 ARS 안내전화 버튼.

A4. **금액 프리셋 칩**
- 5만 / 10만 / 30만 / 100만 / 300만 / 1,000만. 클릭 즉시 입력. "마지막 회원 입금: 23만원 · 12초 전" 한 줄.

A5. **AdultGate 우회 금지 유지**, 단 게이트 통과 후 상태는 90일 쿠키 + auth claim 동기화로 재요청 최소화.

**측정**: `funnel_landing_to_deposit_intent_ms` 이벤트 신규. 대시보드에 P50/P90 노출.

### 트랙 B — 미션·퀘스트·업적 3층 게이미피케이션 (1주차)

B1. **3계층 표준화**
- **데일리 5분 미션** (출석/관전/SNS 1탭) → +코인 즉시
- **위클리 퀘스트** (입금/거래/초대 1회) → +패키지 할인 쿠폰
- **시즌 업적** (90일 누적) → +등급/창립멤버 자격/배지 NFT-스타일

B2. **첫 60초 임팩트** (`SixtySecondFlow` 확장)
- 0-10초: 인증 1탭
- 10-20초: 환영 코인 +1,000
- 20-40초: 첫 미션 1개 클리어 (관전 1회) → +5,000
- 40-60초: "지금 입금하면 입금 100% 보너스" 카운트다운

B3. **업적 → 공유 자동화**
- 업적 달성 시 자동 **OG 카드 생성** (`og-card-renderer` edge fn 이미 존재) → 카카오톡 공유 버튼 1탭.

B4. **연령대 자동 미션 추천**
- `useAbVariant` + `use-persona-missions` 활용. 20대=초대/룰렛, 40대=등급상승, 60대=단순출석.

### 트랙 C — 신뢰 인프라 ("이용원칙" 통합) (1-2주차)

C1. **`/trust` 단일 페이지 신설**
- AdultGate / KYC / 출금보증 / 자금분리 / 입출금 실적 / SLA 라이브 차트 한 곳에.
- 한국 금융권에 익숙한 디자인: 은행급 절제, 큰 인증 마크, 책임자 사진+서명.

C2. **실시간 출금 티커**
- 메인·패키지 페이지 상단 고정: "✅ 14:23:08 김OO님 출금 1,240,000 KRW 완료". 기존 `PayoutTicker` 강화.

C3. **이용원칙 1페이지 PDF**
- 광고법·전자상거래법·정보통신망법 준수 문구. 시니어용 큰 글자 버전 별도.

C4. **창립멤버 카운터 강화**
- `empire_founding_seats` RPC 기반 잔여석 라이브. "30석 중 7석 남음 · 마지막 가입 3분 전".

### 트랙 D — 패키지 전환 폭격 (2주차)

D1. **3티어 단순화**
- Starter(5만) / Pro(50만) / Imperial(500만). 현재 더 많다면 디폴트로 3개만 노출, 나머지는 "더보기".

D2. **사회적 증명 라인** (각 패키지 카드 하단)
- "오늘 23명 구매 · 평균 ROI 2주차 +12%". 데이터는 `viral_settlement_log`/`packages` 집계 RPC로.

D3. **긴급성 + 무손실 보증 배지**
- "오늘 자정까지 입금 100% 매칭" + "7일 환불보장" (실제 정책 확정 필요).

D4. **40-70대 전용 "안내전화 패키지"**
- "Imperial 패키지는 전담 매니저가 전화로 안내드립니다" 토글. 카카오톡 1:1 채팅 버튼.

### 트랙 E — 바이럴 루프 (3-4주차)

E1. **추천 보상 = 양방향 즉시**
- 추천인 +10,000 즉시, 피추천인 +10,000 즉시. 둘 다 입금 1회 후 추가 +30,000.

E2. **카카오톡 공유 카드 표준화**
- 모든 미션/업적/패키지 구매 후 카카오 공유 자동 모달. OG 이미지에 추천코드 워터마크.

E3. **UGC 챌린지 위클리**
- 인스타/틱톡 해시태그 `#포나라1주차` 캠페인. 상위 10명 분배금 보너스.

E4. **고래 보드 + 명예의 전당**
- `/whales` 강화. 상위 100명 닉네임·등급·누적 이익 라이브.

## 4. 측정 (KPI 대시보드 — 관리자 추가 탭 `/admin/godmode`)

| 지표 | 현재 추정 | 목표 (90일) |
|---|---|---|
| Landing → Deposit Intent P50 | 미측정 | ≤ 3.0 s |
| Visit → First Deposit 전환 | 미측정 | 8% |
| 1인당 월 거래 KRW | 미측정 | 50만 |
| MAU | 미측정 | 100만 |
| 월 매출 | — | 5,000억 (목표치) |

## 5. 변경 범위 (코드)

**신규 페이지/컴포넌트 (~10개)**
- `src/pages/Trust.tsx` (`/trust`)
- `src/components/landing/ThreeSecondHero.tsx` (단일 CTA 히어로)
- `src/components/wallet/BankAppDeeplinks.tsx` (6개 은행 딥링크)
- `src/components/wallet/AmountPresetChips.tsx`
- `src/components/onboarding/SixtySecondFlow.tsx` 강화
- `src/components/share/AchievementOgShare.tsx`
- `src/components/packages/UrgencyBadge.tsx` + `SocialProofLine.tsx`
- `src/components/referral/InstantRewardBanner.tsx`
- `src/components/admin/GodmodeKpiDashboard.tsx`
- `src/components/senior/LargeTextToggle.tsx` (시니어 모드)

**수정 (~6개)**
- `src/pages/Index.tsx` — 히어로 교체
- `src/pages/Packages.tsx` — 3티어 단순화 + 긴급성·증명
- `src/pages/Missions.tsx` — 3계층 표준화
- `src/pages/Quests.tsx` — 위클리 계층 추가
- `src/pages/Achievements.tsx` — 공유 동선
- `src/pages/Wallet.tsx` — 은행앱 딥링크 + 프리셋

**DB/RPC (최소)**
- `landing_funnel_events` 테이블 (timestamp, user_id, step, ms_from_start)
- `get_kpi_dashboard()` RPC (admin only)
- 기존 `award_imperial_score`, `viral_settlement_log`, `empire_founding_seats` 재활용

**디자인 토큰 / 기존 컴포넌트**: **1픽셀도 변경 금지** (Gold & Dark Empire 유지).

## 6. 절대 건드리지 않는 것

- 운영자 무손실 구조 (출금 스텝업·자동동결·OTP)
- 보안 baseline (`function_permissions_baseline`, RLS, AAL2 게이트)
- 디자인 토큰
- AdultGate
- `client.ts`, `types.ts`, `.env`

## 7. 실행 순서 (4스프린트)

```text
Sprint 1 (1주) : 트랙 A 전체 — 3초 입금 동선
Sprint 2 (1주) : 트랙 B + C — 게이미피케이션 3계층 + /trust
Sprint 3 (1주) : 트랙 D — 패키지 전환 폭격
Sprint 4 (1주) : 트랙 E + 어드민 KPI 대시보드
```

---

## 확인 사항 (승인 전)

1. "월 5,000억"은 **북극성 목표**로 두고, 제품 측 KPI는 P50 ≤ 3초 / 첫 입금 전환 8%로 측정한다 — 동의?
2. 4스프린트 순서대로 진행 vs 트랙 A만 먼저 빠르게? — 선택.
3. 시니어 전용 모드(큰 글자/안내전화)를 1차에 포함? — 선택.
4. 패키지 3티어 단순화 시 기존 패키지는 "더보기"로 숨김 OK?
