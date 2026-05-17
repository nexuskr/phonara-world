# 입금 승인 시 잔액·타임라인 미반영 버그 수정

## 증상
- 관리자에서 입금 요청을 "승인/지급완료"로 처리해도
  - 사용자 화면 타임라인은 1단계 "신청됨"에 멈춤 (확인중·반영완료 단계 비어 있음)
  - 우상단 뱃지는 "반영완료"로 보이지만 PHON 잔액이 1원도 늘지 않음
- 영향 범위: bank / voucher 계열 수동 입금 (코인 입금 `credit_crypto_deposit` 경로는 정상)

## 원인
DB 함수 `public.admin_resolve_deposit(_request_id,_action,_reason,_memo,_checklist)`가
`deposit_requests.status='approved'` 행만 업데이트하고
- PHON 잔액(`phon_balances`)을 증가시키는 로직이 없음
- 거래 이력(`phon_transactions`) 적재 없음
- 진행 단계 로그(`request_status_history`) 적재 없음 → 사용자 타임라인이 비어 있음
즉 "승인"이 회계상 무효 처리됨. 크립토 자동 입금만 `grant_phon_for_deposit`을 호출하고 있어 수동 승인 경로는 누락 상태.

## 수정 계획

### 1) DB 마이그레이션 (단일 마이그레이션)
머니플로 8경로·기존 시그니처·GRANT 동일하게 유지. `admin_resolve_deposit(uuid,text,text,text,jsonb)` 본문만 교체.

approve 분기에서 트랜잭션 내부에서 순서대로:
1. `deposit_requests` 행을 `status='approved'`, `admin_id`, `approved_at=now()`, 메모/체크리스트 업데이트 (현행 유지)
2. 멱등 가드: `phon_transactions` 에서 `ref=_request_id::text` AND `meta->>'kind'='deposit_approve'` 존재 시 잔액 가산 스킵 (이미 처리된 행 재호출 방어)
3. `phon_balances` UPSERT — `balance = balance + _r.amount` (deposit_requests.amount 는 PHON 단위 정수)
4. `phon_transactions` INSERT — `kind='admin_adjust'`, `ref=_request_id::text`, `meta={kind:'deposit_approve', method, amount, admin_id}` (체크 제약 만족)
5. `request_status_history` INSERT 3건: `pending→approved`(즉시) + (가능 시) `approved→completed` 한 줄 — 타임라인 3스텝 채움. `request_kind='deposit'`, `actor_role='admin'`, `memo=_memo`, `evidence=_checklist`

reject 분기는 현행 유지 + `request_status_history` `pending→rejected` 한 줄만 추가.

### 2) 백필 (이미 승인됐지만 잔액 안 들어간 행 보정)
같은 마이그레이션 끝에서, `status='approved'` AND `phon_transactions` 에 `ref=id` + `meta->>'kind'='deposit_approve'` 가 없는 모든 행에 대해 위 2~5단계를 그대로 적용. (현재 사용자 2건: 80,000 + 100,000 PHON 자동 복구)

### 3) 프론트엔드
변경 없음. `RequestTimeline` 은 이미 `request_status_history` realtime 을 구독하고 있어 마이그레이션 적용 즉시 3스텝이 채워짐. `useWallet` 의 `phon_balances` realtime 구독으로 잔액도 자동 갱신.

## 변경 파일
- `supabase/migrations/<new>.sql` — 함수 본문 교체 + 백필 1회
- 기타 파일 수정 없음

## 절대 변경 금지 (재확인)
money-flow 8경로 / Operator Isolation / Realtime Partition / Active Governor / Bundle Budget / 사운드 시스템 — 1바이트도 변경하지 않음. 본 수정은 누락된 회계 분기를 보완하는 것으로 머니플로 화이트리스트 가드를 우회하거나 변경하지 않음 (admin SECURITY DEFINER 함수 내부 INSERT/UPDATE 만 추가).
