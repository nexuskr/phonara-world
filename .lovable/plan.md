
# Phonara 단기 수익화 — 최종 실행 플랜 (사용자 조정 반영)

## 사용자 조정 반영
- 코인 입금 보너스: **+10% → +8%** (어뷰저/마진 균형)
- AML 임계점: **100만원 / 1,000만원 2단계 게이트** (확정)
- 상품권: **문화상품권 / 해피머니 / 컬쳐랜드 3종**
- admin 영문화: **종료** (한국어 단일 유지)
- 진행 순서: **P0(Starter 핸드북 + 수익 시뮬레이터) 즉시 착수**

---

## Phase 1 — P0 (즉시 진행) ⚡

### 1-A. `/guide` Starter 탭 (왕초보 사용설명서)

**위치**: `src/pages/Guide.tsx` 기존 4탭 앞에 `starter` 탭 추가, 신규/비로그인 유저 자동 진입.

**6스텝 구성** (각 스텝 = 1뷰 카드, 모바일 우선):

```text
Step 1. 가입 → +5,000원 즉시 지급 ✓
Step 2. 매일 출석 → +500~3,000원
Step 3. 미션·AI봇 → 일 최대 30,000원
Step 4. 패키지 구매 → 30일 확정 적립
Step 5. 출금 → 10~30분 내 입금
Step 6. 친구 초대 → 평생 10% 커미션
```

각 스텝:
- "바로 해보기" CTA → 해당 페이지 딥링크
- 완료 체크박스 (DB 기록)
- 6스텝 모두 완료 시 **+₩2,000 Handbook 보너스** (1회 한정)

**DB 신설**:
```sql
CREATE TABLE handbook_progress (
  user_id uuid PRIMARY KEY,
  steps_completed jsonb NOT NULL DEFAULT '{}',  -- {step1: true, ...}
  bonus_paid boolean NOT NULL DEFAULT false,
  created_at, updated_at
);
-- RLS: 본인만 select/upsert. bonus 지급은 SECURITY DEFINER RPC
```

**RPC**: `claim_handbook_bonus()` — 6스텝 완료 검증 후 ₩2,000 transactions 입금 + bonus_paid=true 토글 (idempotency_keys로 이중지급 방지).

**i18n**: `guide.starter.*` (KO/EN 양쪽).

### 1-B. 수익 시뮬레이터 위젯

**위치**: 새 컴포넌트 `src/components/guide/EarningsSimulator.tsx`, Starter 탭 + Packages 페이지 양쪽에 임베드.

**UX**:
- 입금액 슬라이더 (10만원 ~ 1,000만원)
- 패키지 라디오 (Easy / Easy150 / Empire)
- 결과 즉시 표시:
  - 일 수익 (확정)
  - 7일 수익 + 연속 보너스
  - 30일 총 적립
  - ROI %
  - "Empire Day +50% 적용 시" 가산
- "지금 결제" CTA → `/packages?pkg=...` 딥링크

순수 클라이언트 계산(서버 호출 0) — 즉각 반응성으로 전환율 ↑.

---

## Phase 2 — P1 (입금/출금 구조 + AML)

### 2-A. 입금 채널 3분할

| 채널 | 보너스 | 처리 | DB 컬럼 |
|---|---|---|---|
| 계좌이체(은행) | 0% | 5~30분 (관리자 승인) | `method='bank'` |
| 상품권 | +3% | 10~60분 | `method='voucher'`, `voucher_brand: 'culture'\|'happy'\|'cultureland'`, `voucher_pin` |
| USDT (TRC20/ERC20/BEP20) | **+8%** | 자동 (블록 컨펌) | `method='coin'` (기존) |

**마이그레이션**:
```sql
-- enum deposit_method에 'voucher' 추가
ALTER TYPE deposit_method ADD VALUE IF NOT EXISTS 'voucher';

ALTER TABLE deposit_requests
  ADD COLUMN voucher_brand text,        -- 'culture' | 'happy' | 'cultureland'
  ADD COLUMN voucher_pin_hash text,     -- 평문 PIN은 절대 저장 X (해시만)
  ADD COLUMN bonus_amount bigint NOT NULL DEFAULT 0,
  ADD COLUMN bonus_pct numeric NOT NULL DEFAULT 0;

ALTER TABLE profiles
  ADD COLUMN total_coin_deposits bigint NOT NULL DEFAULT 0,
  ADD COLUMN coin_master_unlocked boolean NOT NULL DEFAULT false;
```

**프론트**: `src/pages/Wallet.tsx` 입금 탭에 채널 3택 UI + 상품권 입력 폼(브랜드 셀렉트, 핀 16자리, 액면가).

**RPC 수정**: `submit_deposit()` — 채널별 보너스 자동 계산해서 `bonus_amount`/`bonus_pct` 기록. 승인 시 `amount + bonus_amount`로 잔액 가산.

### 2-B. AML 2단계 출금 게이트

**임계 구조**:
```
누적출금 < 100만원         → 기본 PIN + SMS
100만원 ≤ 누적 < 1,000만원 → +본인인증(휴대폰) + 셀카 1회
누적출금 ≥ 1,000만원       → +금융거래 목적 확인서 + 24h hold

일일 한도: NORMAL 50만 / VIP 300만 / GOD 1,000만 / EMPIRE 3,000만
```

**자동 차단 룰** (이미 있는 `anomaly_events` 재활용):
- 가입 7일 내 누적 출금 > 입금×1.5 → 자동 hold
- 입금→24h 내 전액 출금 → admin 승인 강제
- 새 디바이스 첫 출금 → 24h + 이메일 인증
- Risk Score 70+ → hold + admin 알림

**DB 신설**:
```sql
CREATE TABLE aml_verifications (
  id uuid PK,
  user_id uuid NOT NULL,
  level int NOT NULL,                    -- 1: phone, 2: selfie, 3: docs
  status text NOT NULL,                  -- pending|approved|rejected
  selfie_path text,
  doc_signed_at timestamptz,
  approved_at, approved_by, rejected_reason,
  created_at
);

CREATE TABLE aml_risk_scores (
  user_id uuid PK,
  score int NOT NULL DEFAULT 0,          -- 0~100
  factors jsonb NOT NULL DEFAULT '{}',
  updated_at
);
-- RLS: 본인 select / admin select+update
```

**RPC**: `request_withdraw()` 수정 — 누적 출금액 + 디바이스 + Risk Score 체크 후 필요 단계 반환.

**프론트**: `src/components/wallet/AMLGate.tsx` — 단계별 모달(휴대폰 본인인증 → 셀카 업로드 → 서류 동의).

---

## Phase 3 — P2 (바이럴 & 게임화)

### 3-A. 친구 초대 3단 로켓
- 1단: 친구 가입 시 양쪽 +5,000원 (현재 유지)
- 2단: **친구 첫 입금 시 → 추천인 +20,000원 + 친구 +10,000원** (신규)
- 3단: 친구 30일 활성 → 평생 10% 커미션 (현재 유지)
- **주간 추천왕 TOP 10** 리더보드 (1위 10만원 / 2~3위 5만원)

**DB**: `referrals` 테이블에 `first_deposit_bonus_paid boolean`, `weekly_referral_leaderboard` view.

### 3-B. 뱃지 13개 추가
- `황금손`(누적입금 100만), `다이아핸드`(30일 미출금), `레전드 추천왕`(50명 활성), `잭팟 헌터`(잭팟 3회), `코인 마스터`(코인 5회), `Founding Member`(강조), 외 7개
- **Lounge 닉네임 옆 뱃지 노출** (사회적 우월감)

`achievements_catalog`에 row 13개 INSERT + `chat_messages.metadata`에 badge_keys 추가.

---

## Phase 4 — P3 (선택적 차별화)

- AI 운명 점괘 봇 (일 1회, 90% 1,000원 미만 / 1% 잭팟)
- AI 카피라이팅 봇 (친구 초대 콘텐츠 자동 생성)
- 시즌 패스 프리미엄 ₩19,900 (이미 `seasons.premium_price` 존재 — 활성화)
- 룰렛 RTP 정밀화 (무료 95% / 유료 80%)

---

## 작업 순서 (확정)

| # | 작업 | 파일 | 시간 |
|---|---|---|---|
| 1 | DB: `handbook_progress` 테이블 + `claim_handbook_bonus` RPC | migration | 30분 |
| 2 | i18n: `guide.starter.*` + `simulator.*` 키 추가 | i18n.ts | 30분 |
| 3 | `EarningsSimulator.tsx` 컴포넌트 | 신규 | 1h |
| 4 | `Guide.tsx` Starter 탭 + 6스텝 카드 + 보너스 청구 | Guide.tsx | 1.5h |
| 5 | 빌드/타입체크/E2E 테스트 추가 | conversion-i18n.test 패턴 | 30분 |
| **총** | **P0 완료** |  | **~4h** |

P0 완료 후 P1(입금 3분할 + AML)로 이어갑니다 — 별도 마이그레이션 승인 필요.

---

## 보안 메모리 업데이트 예고

P1 완료 후 `@security-memory`에 다음 추가:
- 코인 입금 +8% 보너스 정책 (어뷰저 모니터링 기준)
- AML 100만/1,000만 2단계 게이트
- 상품권 PIN은 해시만 저장(평문 절대 금지)

---

**P0 즉시 시작 승인하시면 다음 메시지에서 마이그레이션 → 코드 → 검증 순으로 진행합니다.**
