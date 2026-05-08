# Phonara vFinal+ — 1000점 마스터 실행 플랜

## 확정 사항 (Final Lock)
- Referral: 90일 한정 + 고정 보상 (inviter 30,000C / invitee 10,000C)
- Empire Founding Seats: 100석 사전 시드
- Command Hub: HubTabs 5번째 탭 (Dashboard 단일 화면)
- Disclaimer: 주요 페이지 하단 고정
- 금지어 전수 제거: 확정 / 보장 / 평생 / 최대 N% / 수익 분배 / lifetime / guaranteed / profit share

---

## Phase 1 — P0 Critical (법·자금 정합성)

### 1.1 Referral v2
**마이그레이션**
- `referrals` ADD `window_expires_at timestamptz`, `policy_version smallint default 2`
- 신규 referral 생성 시 `window_expires_at = created_at + interval '90 days'`
- `_credit_referral_first_deposit(_invitee, _amount)` 재작성:
  - `now() <= window_expires_at` 검증 (만료 시 silent pass)
  - 고정 지급: inviter 30,000C / invitee 10,000C (입금액 무관)
  - `idempotency_keys` scope=`ref_first_deposit_v2:<invitee>`
  - `referral_earnings.source='first_deposit_fixed_v2'`
  - `referrals.first_deposit_bonus_paid=true`

**UI**: ReferralPanel/InviteCard → "친구 첫 입금 후 **90일 한정** 고정 보상 (인바이터 30,000C / 친구 10,000C)" + 남은 일수 카운트다운

### 1.2 i18n 금지어 + <Disclaimer>
- `src/i18n.ts` 전수 치환:
  - 확정/보장 → 예정/변동 가능
  - 평생/lifetime → 장기/지속
  - 최대 N% → N% 시뮬레이션
  - 수익 분배/profit share → 보상 시뮬레이션
  - guaranteed → 목표
- `<Disclaimer>` 공용 컴포넌트 신설 → Packages, EarningsSimulator, Paywall, Withdraw, BoostHero, CommandHero 하단 고정
- `scripts/check-forbidden-phrases.mjs` + CI 게이트(빌드 차단)

### 1.3 Sovereign 우선 출금 큐
- `withdrawal_requests` ADD `priority smallint default 100`, `tier_at_request user_tier`
- INDEX `(status, priority, created_at)`
- `request_withdrawal` RPC: tier별 priority (`sovereign=10, vip=50, normal=100`) + tier_at_request 캡처
- Admin Withdraw 큐: `ORDER BY priority ASC, created_at ASC` + 우선순위 배지

### 1.4 Founding Seat 자동 할당 + 100석 시드
- 시드: `INSERT INTO empire_founding_seats (seat_no) SELECT generate_series(1,100) ON CONFLICT DO NOTHING`
- 신규 RPC `claim_founding_seat(_purchase_id uuid)` SECURITY DEFINER, `set search_path=public`
  - `FOR UPDATE SKIP LOCKED`로 미할당 seat 잠금 후 할당
  - `package_purchases.founding_seat_no`, `is_empire_founding_member=true`
  - 만석 시 graceful pass + `notifications` 알림
- `admin_resolve_package` EMPIRE 분기에서 호출
- `function_permissions_baseline` 등록
- `policy_assertions`: 동시 클레임 무결성 케이스 추가

### 1.5 cron-settle-packages 권한 강화
- `settle_package_daily` 가드:
  ```
  auth.uid() IS NULL
  OR has_role(auth.uid(),'admin')
  OR coalesce(current_setting('request.jwt.claims', true)::jsonb->>'role','') = 'service_role'
  ```
- `cron_settle_audit_log.caller='cron'` 기록, 실패 시 `anomaly_events` 적재

---

## Phase 2 — P1 Major (일관성·견고성)

### 2.1 Command Hub 통합
- `HubTabs.tsx`에 `command` 탭 추가 (5번째) → Dashboard 단일 화면 매핑
- 활성 표시·breadcrumb 일관화

### 2.2 <ActiveFlowCard> 단일화
- 신규 추상 컴포넌트 (상태머신: idle/running/cooldown/boost)
- CommandHero, BoostHeroCard, SixtySecondFlow에서 재사용

### 2.3 Idempotency 강화
- `harvest_machine` (user_id, harvest_date) UNIQUE 보강
- `_credit_referral_first_deposit`, `claim_handbook_bonus` scope 일관화

### 2.4 잔여 카피 약화
- "최대 6시간 자동 폭발 보장" → "최대 6시간 부스트 예정 (변동 가능)"
- 마케팅 톤 전반 약화

---

## Phase 3 — P2 Minor (UX/SEO/Mobile)

### 3.1 WITHDRAW_LIMITS 단일 소스
- 클라이언트 mock 제거 → `withdraw_limits_get()` RPC만 사용

### 3.2 SEO/메타
- 핵심 라우트 H1 1개 + meta description <160 + canonical
- JSON-LD: Organization / Product(Packages) / FAQ
- `/` Index 자동 리다이렉트 SEO-safe

### 3.3 391px 모바일 최적화
- CommandHero/BoostHeroCard collapsible + sticky CTA
- Wallet 카드 간격, Withdraw ETA 배지

### 3.4 Console 경고 정리
- 잔여 경고 제거, Lighthouse 90+

---

## Phase 4 — 검증 (1000점 달성)

1. `supabase--linter` 0 error
2. `policy_assertions` 전 항목 PASS → `policy_assertion_runs` 그린
3. `chaos_runs` 신규 시나리오:
   - founding seat 동시 클레임
   - withdraw priority 정렬 무결성
   - referral 90일 윈도우 경계
   - cron service_role 가드
4. CI 게이트(`db-permissions.yml`): RLS/권한 drift + 금지어 grep + 마이그 dry-run
5. 수동 E2E: Starter 6스텝 → Package 구매 → Settle → Referral 첫입금(90일 경계) → Withdraw(우선순위) → Founding Seat → Cron

---

## 진행 순서
1. i18n 금지어 정리 + Referral v2 (독립, 가장 먼저)
2. Withdraw priority + Founding Seat RPC + 100석 시드
3. cron settle 권한 강화
4. Command Hub + ActiveFlowCard 리팩토링
5. P2 UX/SEO/모바일
6. 최종 검증·CI 게이트

## 산출물
- 마이그레이션 5개 (referral v2, withdraw priority, founding seat RPC+seed, settle guard, idempotency indexes)
- 신규 컴포넌트: `<ActiveFlowCard>`, `<Disclaimer>`, Command Hub 탭
- `src/i18n.ts` 전수 정리 + `scripts/check-forbidden-phrases.mjs` + CI 게이트
- 감사 보고서 v2
