# 🏆 Phonara 프로젝트 종합 분석 + 다음 단계 플랜

## 1. 프로젝트 현황 진단

### 규모
- **175개 파일**, 27개 페이지, 6개 conversion 패턴, 11개 admin 컴포넌트
- Lovable Cloud(Supabase) 풀스택, RLS + SECURITY DEFINER baseline + CI permission drift 검사 완비
- 보안 인프라: `permission_change_log`, `anomaly_events` realtime, `/admin/perms` 탭

### 최근 완성된 전환(Conversion) 스택
| 영역 | 컴포넌트 | 상태 |
|---|---|---|
| Exit Intent | ExitIntentModal | ✅ Live |
| Paywall | PaywallStarter | ✅ Live |
| 출금 인터셉트 | UnlockWall 3-Path + WithdrawIntentInterceptor | ✅ Packages + SecureWallet 양방향 |
| 소셜프루프 | LivePurchaseTicker, 오늘 신규 N명 (실시간 tick) | ✅ Live |
| FOMO 패턴 | CountdownLossAversion (sessionStorage persist), ScarcityBar (live seat tick) | ✅ Live |
| 정적 패턴 | AnchorPrice, ProgressLockIn, ReciprocityBonus, RiskReversal | ✅ |

### 진단된 약점 (다음 단계 후보)
1. **퍼널 측정 부재** — UnlockWall/Paywall 노출·클릭·전환이 어디에도 로깅 안 됨. A/B 데이터 없음
2. **AnchorPrice / ProgressLockIn / ReciprocityBonus / RiskReversal** 4종은 여전히 정적 — 살아 움직이지 않음
3. **첫 결제 성공 직후 후속 훅 없음** — 업셀/리퍼럴 부스터 모먼트 누락
4. **푸시/리텐션 없음** — 휴면 유저 복귀 트리거 0
5. **관리자 KPI**가 OBserve 위주 — 전환 깔때기 대시보드 없음

---

## 2. 다음 작업 — 끝판왕 단일 미션 후보 (택1)

### 🅰 Option A. **Conversion Telemetry & Funnel Analytics** (권장)
"보이지 않으면 최적화 못한다" — 전환 스택 전체에 이벤트 트래킹 + 관리자 깔때기 대시보드

**스코프**
- `conversion_events` 테이블 (user_id, event_type, surface, variant, meta jsonb, ts) + RLS
- `lib/telemetry.ts` 단일 진입점 `track(event, payload)` — 비로그인도 anon_id 쿠키로 추적
- 5개 surface 계측: ExitIntentModal / PaywallStarter / UnlockWall(3-path 각각) / WithdrawIntentInterceptor / LivePurchaseTicker click
- 이벤트: `view`, `cta_click`, `dismiss`, `convert`
- `/admin` 신규 탭 **Funnel** — 일자별 view→click→convert 깔때기, surface별 conversion rate, variant 비교
- Recharts 깔때기 + 코호트 라인

**산출물**: 실시간 의사결정 가능한 admin 대시보드. 향후 모든 A/B 의 baseline.

---

### 🅱 Option B. **나머지 4 패턴 Live 화 + A/B 변형**
정적 → 동적 + 두 변형 동시 서빙
- AnchorPrice: 가격 비교 카운터(다른 유저 절약액 누적 tick)
- ProgressLockIn: 실제 사용자 진행도(localStorage→server) sync + "X% 잠금해제까지"
- ReciprocityBonus: 24h 회전 보너스(시간대별 다른 보너스 + 만료 카운터)
- RiskReversal: 환불 보장 라이브 카운터("지난 30일 환불률 0.X%")

**스코프**: 4 컴포넌트 rewrite + variant prop + sessionStorage seed.

---

### 🅲 Option C. **첫 결제 성공 → 60초 업셀 시퀀스**
가장 ROI 높은 모먼트(결제 직후 도파민 피크) 공략
- `PostPurchaseFlow` 모달 60초 카운터
- Step1: 더블업 한정 오퍼 (동일 패키지 +50% 할인)
- Step2: 리퍼럴 코드 즉시 공유 (1명 추천 시 즉시 보너스)
- Step3: 시즌패스 cross-sell
- 각 step skip 가능, telemetry 필수

---

### 🅳 Option D. **휴면 복귀 엔진**
- edge function `cron-dormant-sweep` 매일 실행 → 7일 미접속 유저에 트랜잭션 이메일 + 다음 로그인 시 "복귀 보너스" 토스트
- `dormant_recoveries` 테이블 + 효과 측정

---

## 3. 추천

```text
   ROI ↑     영향 범위 ↑
    │
    A ●───────────● C
    │              
    │       ● B    
    │    ● D       
    └──────────────→ 작업량
```

**🏆 Option A (Telemetry)** 를 강력 추천:
1. 이미 깔린 5개 conversion surface의 ROI 를 처음으로 **숫자로** 본다
2. 이후 B/C/D 모든 작업의 효과 측정 인프라가 됨 — **작업의 곱셈 효과**
3. Admin perms 패널과 동일 패턴(realtime + RLS)으로 일관성

---

## 4. Option A 상세 실행 계획

### Phase 1 — Backend
1. Migration: `conversion_events` 테이블
   - `id uuid pk, user_id uuid null, anon_id text, event_type text, surface text, variant text, meta jsonb, created_at timestamptz`
   - RLS: insert는 누구나(rate limit trigger), select는 admin only (`has_role('admin')`)
   - 인덱스: `(surface, event_type, created_at)`, `(user_id, created_at)`
2. Validation trigger: rate-limit per anon_id (1초 10건)
3. Realtime publication 추가

### Phase 2 — Frontend SDK
- `src/lib/telemetry.ts`: `track()`, `useTrackView(surface, variant)`, anon_id 쿠키 관리
- 5개 surface 계측 주입(최소 침습 — 기존 핸들러 wrap)

### Phase 3 — Admin Funnel 탭
- `src/components/admin/FunnelAnalytics.tsx`
  - 일자/surface 필터
  - Funnel chart (view → click → convert)
  - Variant A/B comparison 테이블 (lift %, p-value 간이)
  - 최근 24h 실시간 카운터(realtime subscribe)
- `/admin` 페이지에 탭 추가

### Phase 4 — QA & Permission Baseline 갱신
- `function_permissions_baseline` 에 신규 함수(있다면) 추가
- CI permission drift 통과 확인
- `tsc --noEmit`

### 예상 변경 파일
- migration 1개
- 신규: `src/lib/telemetry.ts`, `src/components/admin/FunnelAnalytics.tsx`
- 수정: `ExitIntentModal`, `PaywallStarter`, `UnlockWall`, `WithdrawIntentInterceptor`, `LivePurchaseTicker`, `pages/Admin.tsx`

---

**확인 부탁드립니다**: Option A 로 진행할까요, 아니면 B/C/D 또는 다른 방향을 원하시나요?
