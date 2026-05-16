# Sprint 3 — Deposit Fast Lane v3.0 (FINAL ARCHITECT EDITION)

PhonarA Wallet / Deposit System. Stake급 운영 안정성 + Rollbit급 속도감 + Freecash급 온보딩 UX.

## 0. 목표
- 입금 시작까지 5초, 입금 완료 확신까지 30초, 재충전 루프 활성화.
- 진짜 만드는 것은 "입금 UI"가 아니라 **돈 흐름 상태머신**. "내 돈이 지금 어디 상태인지" 절대 불안하지 않게.

## 1. Deposit Lifecycle (불변)
```text
draft → intent_created → awaiting_payment → matching → filled
                                          ↘ expired
                                          ↘ manual_review (voucher)
```

### 정책 (불변)
- 입금: USDT / 원화 계좌이체 / 상품권(수동)
- 출금: USDT / 원화 계좌이체 (상품권 출금 금지)

### 재사용 (변경 금지)
- RPC: `create_crypto_deposit_intent`, `get_pay_receive_address`, `get_my_pending_deposits`, `submit_deposit`, `validate_deposit_input`
- 클라: `src/lib/phonaraPay.ts`, `src/lib/deposits-rpc.ts` (`uploadReceipt`)
- 매칭 레이어: `PhonaraPayPanel` realtime / address expiry / intent tracking

## 2. Phase A — Financial Correctness (먼저 고정)

### A-1. State Invariants
- expired intent reuse 금지
- filled 이후 duplicate submit 금지
- voucher는 manual_review 허용
- bank는 memo(sender name) 기반 매칭
- USDT는 `unique_amount` exact match only (소수 4자리)

### A-2. Realtime 우선, Polling은 Fallback
- 채널: `crypto_deposit_intents` UPDATE (intent.id 필터)
- 이벤트 처리: `status=filled` →
  1. Step 3 자동 전환
  2. `notify.success(g('depositSuccess'))`
  3. `window.dispatchEvent(new Event('wallet:refresh'))`
  4. History + balance refetch
- 30s `get_my_pending_deposits` polling fallback (realtime drop 대비)

### A-3. Error Recoverability Map
| 코드 | Recoverable | Action |
|---|---|---|
| `amount_below_min` | YES | stay step 2 |
| `intent_expired` | YES | regenerate intent CTA |
| `voucher_pin_invalid` | YES | reset PIN |
| `receipt_upload_failed` | YES | retry upload |
| `realtime_disconnect` | YES | reconnect + polling |
| `duplicate_submit` | NO | lock + 안내 |

## 3. Phase B — UX Execution

### Step 1 — Method Select (5초 인지)
- 카드 3장 (USDT / 계좌이체 / 상품권), `min-h-[120px] text-xl font-black`, 아이콘 32px
- ETA 배지: USDT 1~5분 · 계좌 5~30분 · 상품권 수동
- 정책 라인 Hot Pink `#FF00AA` 고정: "상품권은 입금 전용 (출금 불가)"

### Step 2 — Method Detail

**A. USDT** — "생각 없이 복사·전송"
```text
get_pay_receive_address → create_crypto_deposit_intent → unique_amount
표시 우선순위: QR > [복사] > 주소 > 경고
Countdown: >5분 Warm Gold / ≤5분 Hot Pink pulse
상태: "현재 매칭 대기 중" pulse
```

**B. Bank** — "은행 앱으로 보내면 끝"
- 입금 계좌 + `senderName = user.nickname` 자동 채움 (오타↓ 매칭률↑ 입력↓)
- `submit_deposit({ method:'bank', amount, memo: senderName })`
- 안심 카피: "자동 매칭 처리 중 · 보통 5~30분 내 반영"

**C. Voucher** — "자동화보다 신뢰감"
- 브랜드: culture / happy / cultureland
- PIN 16~18자리 (마스킹, paste 허용)
- `uploadReceipt(file)` → signed URL → `submit_deposit({method:'voucher', voucher_brand, voucher_pin, receipt_url})`
- 상태 `manual_review` + "카톡 채널 1:1 안내"

### Step 3 — Completion ("내 돈 사라지지 않았다")
- Warm Gold check 성공 표시
- ETA: USDT 1~5분 / 계좌 5~30분 / 상품권 1~6시간
- CTA: [내 입금 보기] / [닫기]

## 4. File Structure (분리 강제 — useDeposit 비대화 금지)

```text
src/packages/wallet/
  hooks/
    useDeposit.ts            # orchestration ONLY (compose 아래 5개)
    useDepositRealtime.ts    # crypto_deposit_intents UPDATE + ownership check + replay protection
    useDepositDraft.ts       # sessionStorage resume (phonara:deposit_draft:v1)
    useDepositTelemetry.ts   # 6 events + session_funnel_id + abandon reason
    useDepositCountdown.ts   # expiresAt - Date.now() 재계산 + visibilitychange drift fix
    useDepositNavGuard.ts    # confirm + beforeunload + useBlocker
  lib/
    sanitize.ts              # trim + zero-width 제거
    depositValidators.ts     # method별 min/format
  components/
    DepositCard.tsx          # 초대형 CTA + 평균 도착 배지
    DepositModal.tsx         # 3-step dialog (얇은 shell)
    DepositStep1Methods.tsx
    DepositStep2Coin.tsx
    DepositStep2Bank.tsx
    DepositStep2Voucher.tsx
    DepositStep3Success.tsx
    DepositHistory.tsx       # 최근 5건 + 3-step timeline + realtime
    DepositTimeline.tsx      # 신청됨 · 확인중 · 반영완료
```

규칙: `useDeposit.ts`는 500줄 이하 유지. 모든 사이드이펙트는 전용 훅으로 위임. method당 컴포넌트 분리해 1500줄 monster 방지.

## 4.5 Core Principles (LOCKED)

1. **Realtime = UX, Polling = Truth**
   - realtime은 즉시 UI 반응(낙관적 전환·토스트·burst).
   - 최종 잔액/intent 상태 확정은 `get_my_pending_deposits` + `phon_balances` refetch로 검증.
   - websocket drop은 반드시 발생 → polling fallback이 source of truth.

2. **History wording은 고령층 언어**
   - 금지: pending / processing / checking / matched.
   - 허용: `신청됨` → `확인중` → `반영완료` (3단계 고정).
   - `DepositTimeline` 단일 출처.

3. **심리 안정감 4종 유지 (타협 불가)**
   - grace UI / safe-checking 카피 / heartbeat / copy verification.
   - "입금 이탈률 감소 장치" — 디자인 단순화 명목으로 제거 금지.

4. **명세 고정 후 그대로 구현**
   - 본 플랜 승인 이후 추가 권장사항은 v1.1로 분리. v1.0은 본 문서 범위 안에서만 구현·QA·배포.

## 5. useDeposit FINAL State Machine
```ts
step: 1 | 2 | 3
method: 'coin' | 'bank' | 'voucher'
common: { amount, beforeBalance, clientRequestId, sessionFunnelId }
coin:   { intent, qrDataUrl, expiresAt, status }
bank:   { bankName, bankAccount, senderName }
voucher:{ voucherBrand, voucherPin, receiptFile, receiptUrl }
locks:  { inputsLocked: boolean }   // soft-freeze after intent_created

actions:
  next() prev() reset() close(reason)
  submit()                  // method별 분기, idempotent via clientRequestId
  copy(text)                // sanitize + haptic + toast + last-6 chip
  regenerateIntent()        // expired/grace 복구
```
orchestration만. realtime/draft/countdown/telemetry/navGuard는 전용 훅이 담당.

## 6. Validation
| 수단 | 최소 |
|---|---|
| coin | 10,000 KRW |
| bank | 10,000 KRW |
| voucher | 5,000 KRW |

- voucher: brand 필수, pin length 16~18
- expired → regenerate 버튼 노출
- upload 실패 → retry CTA

## 7. Mobile 360px QA
- no horizontal overflow / QR fully visible / font ≥16px / CTA thumb reach / safe-area inset
- 공통 클래스: `px-4 py-5 gap-3 rounded-3xl`

## 8. Glossary 정책 (100% `g()`)
신규 키:
```
depositNow, depositCtaSub, depositAvgTime,
depositStep1Title, depositStep2Title, depositStep3Title,
depositMethodCoin, depositMethodBank, depositMethodVoucher,
depositMethodCoinSub, depositMethodBankSub, depositMethodVoucherSub,
depositAmountLabel, depositMin, depositCopy, depositCopied,
depositCoinNetwork, depositCoinAddress, depositCoinUnique,
depositCoinExpiresIn, depositCoinWaiting, depositCoinFilled, depositCoinRegenerate,
depositBankName, depositBankAccount, depositBankSender, depositBankAutoMatch,
depositVoucherBrand, depositVoucherPin, depositVoucherPhoto, depositVoucherKakao, depositVoucherReview,
depositPolicyNotice,
depositSubmit, depositSuccess,
depositEtaCoin, depositEtaBank, depositEtaVoucher,
depositHistoryTitle, depositHistoryEmpty, depositSeeMine,
depositStatusPending, depositStatusFilled, depositStatusExpired, depositStatusReview,
depositErrMin, depositErrExpired, depositErrVoucherPin, depositErrUpload, depositErrDuplicate, depositErrGeneric
```
검증: `rg '"[가-힣]' src/packages/wallet` 결과 0건.

## 9. Final QA Checklist

**UX**
- [ ] 5초 충전 인지 (CTA 즉시 보임)
- [ ] 3-step one-hand flow
- [ ] 모든 버튼 ≥56px, Warm Senior UI

**Financial**
- [ ] unique_amount exact match
- [ ] realtime fill detection
- [ ] expiry handling + regenerate
- [ ] duplicate submit lock

**Ops**
- [ ] manual voucher review 흐름
- [ ] `wallet:refresh` 이벤트 sync
- [ ] recoverable error 복구 UI
- [ ] upload retry

**Engineering**
- [ ] DB 변경 0 / RPC 추가 0
- [ ] Withdraw 흐름 미변경
- [ ] 기존 매칭 레이어 재사용

## 10. 작업 순서
```text
1) Glossary 키 + useDeposit (state + realtime + validate)
2) DepositCard / DepositHistory (realtime status)
3) DepositModal Step1 (method select)
4) DepositModal Step2 (USDT QR + Bank + Voucher)
5) DepositModal Step3 (completion + CTA)
6) WalletTopSection 2열 CTA 통합
7) Polish: 360px QA, expired regenerate, upload retry, grep g() 100%
```

## 11. 배포 직전 강화 (v1.0 Hardening — DB 추가 없이 클라단)

### H-1. Idempotency Lock
- `useDeposit` submit 진입 시 `clientRequestId = crypto.randomUUID()` 생성, sessionStorage에 캐시.
- `submit_deposit` memo 끝에 `[cri:xxxx]` suffix 첨부 → 동일 cri 재전송 시 서버가 같은 row 매칭 가능 (현재 RPC 변경 없이 운영팀이 식별).
- 더블탭/네트워크 retry/모바일 reconnect 시 동일 trip 보장. submit 중 버튼 `disabled + loading` 강제.

### H-2. Intent Race (filled > expired)
- realtime payload에서 `status` 우선순위: `filled > matching > expired`.
- 카운트다운이 만료에 도달해도 마지막 1회 `get_my_pending_deposits` 재조회 → filled로 바뀌었으면 expired UI 무시하고 Step 3 전환.

### H-3. Visibility Timeout (Intermediate State)
- realtime 무응답 10s + intent.status=`awaiting_payment` 시 카드 메시지 전환: `g('depositCoinConfirming')` = "입금 확인 중입니다".
- 사용자가 "돈 사라졌나?" 느끼지 않게 회색 펄스 유지.

### H-4. History 정렬 (Senior-first)
- DepositHistory 정렬: `pending/matching` 그룹 먼저 → 그 다음 `updated_at DESC`.
- 진행 중 카드는 항상 최상단 + Warm Gold border.

### H-5. Voucher Fraud Soft Limit
- localStorage `phonara:voucher_pin_attempts:v1` (24h TTL) 에 SHA-256(pin) 해시 누적.
- 동일 해시 3회 이상 → submit 전 클라단 차단 + `notify.error(g('depositErrVoucherDup'))` + "수동 확인이 필요합니다" 안내(서버 `manual_review` 라벨링은 운영팀).

### H-6. Realtime Disconnect Banner
- `useRealtimeChannel` status='CHANNEL_ERROR' / 30s 무이벤트 시 모달 상단 노란 띠: `g('depositRealtimeDegraded')` = "실시간 연결이 불안정합니다. 자동 새로고침으로 확인 중입니다".
- 백그라운드 폴링 5s로 가속.

### H-7. Telemetry Funnel
- `src/lib/analytics.ts` `trackClick` 재사용. 이벤트:
  ```
  deposit_modal_open
  deposit_method_selected   { method }
  deposit_submit_clicked    { method, amount_band }
  deposit_intent_created    { method, intent_id }
  deposit_filled            { method, elapsed_ms }
  deposit_abandon           { method, step }
  ```
- `amount_band`: <50k / 50k–200k / 200k–1M / 1M+ (PII 제외).
- modal close 시 step≤2면 abandon 자동 발사.

### Glossary 추가 (Hardening)
```
depositCoinConfirming, depositRealtimeDegraded, depositErrVoucherDup,
depositHistoryActiveBadge, depositSubmitLocked
```

## 12. Pre-Launch Confidence Layer (A–E)

### A. Modal Recovery Resume
- `sessionStorage` 키 `phonara:deposit_draft:v1` = `{ method, amount, intentId, expiresAt, step, createdAt }`.
- `useDeposit` mount 시 draft 존재 + `expiresAt > now()` → "진행 중인 입금이 있습니다. 이어서 진행할까요?" 모달 (Warm Gold 강조 / 새로 시작 / 이어서).
- step3 진입(filled) 또는 명시적 cancel 시 draft 삭제.

### B. Copy Verification UX
- 모든 copy 액션(주소/금액/계좌/메모) 후:
  - `notify.success(g('depositCopied'))` + 끝 6자리 강조 칩 (`...8F2A91`, 24px mono, Warm Gold border).
  - 카드 내 해당 필드 1.5s shimmer + 체크 아이콘.
- 고령층 "복사된 거 맞나?" 불안 제거.

### C. Intent Expiry Grace UI
- 카운트다운 00:00 도달 → 즉시 expired 표시 금지.
- 2~5s grace: 카드 메시지 = `g('depositGraceChecking')` = "마지막 확인 중입니다…" + 회색 펄스.
- grace 중 `get_my_pending_deposits` 1회 재조회 → filled면 Step3, 아니면 expired UI + regenerate CTA.

### D. Analytics Correlation ID
- `sessionStorage` 키 `phonara:deposit_funnel_id:v1` = `crypto.randomUUID()` (모달 open 시 발급, close+filled 시 폐기).
- 모든 telemetry payload에 `session_funnel_id` 자동 첨부 → 한 유저의 modal_open→method→submit→intent→filled/abandon 한 줄로 분석.

### E. "내 돈 보호중" 카피
- `depositSafeChecking` = "입금 상태를 안전하게 확인 중입니다"
- `depositProtectedLine` = "고객님의 돈은 안전하게 보호되고 있습니다"
- `depositCoinConfirming` 하단 보조 라인으로 `depositProtectedLine` 노출 + Warm Gold `ShieldCheck` 아이콘.

### Glossary 추가 (A–E)
```
depositCopied, depositResumeTitle, depositResumeBody, depositResumeContinue,
depositResumeFresh, depositGraceChecking, depositSafeChecking, depositProtectedLine
```

## 13. Final Operational Polish (A2–E2)

### A2. Balance Snapshot Before Deposit
- submit 직전 `phon_balances` 현재값 `beforeBalance`로 캡처 → `useDeposit` 상태에 보관.
- Step3 filled 시 `+{credited} PHON 반영 예정` delta 카드 (Warm Gold). realtime로 실제 잔액 반영되면 체크 표시.

### B2. Deposit Timeline UI
- DepositHistory 카드 확장 시 3-step 가로 타임라인: `신청됨 · 확인중 · 반영완료`.
- 현재 단계 Warm Gold 채움 + 펄스, 이전 단계 회색 체크, 다음 단계 회색 점. 텍스트 없이도 위치만으로 이해.

### C2. Copy-Paste Sanitizer
- 모든 텍스트 입력(주소 검증, 상품권 PIN, 메모 확인) `onPaste`/`onChange`:
  - `trim()` + zero-width(`\u200B-\u200D\uFEFF`) 제거 + 모든 whitespace 제거.
- `src/packages/wallet/lib/sanitize.ts` 유틸로 일원화.

### D2. Visibility Heartbeat
- `awaiting_payment` 30s 초과 시 카드 하단 회색 1줄: `마지막 확인 시각: 14:22:31` (realtime 이벤트 또는 polling tick마다 갱신).
- 키 `depositLastChecked`. "멈춘 거 아님" 확신.

### E2. Soft Session Freeze
- submit 성공 → intent_created 후 method/amount 입력 lock (회색 disabled + 자물쇠 아이콘 + `g('depositInputsLocked')`).
- 해제 조건: regenerate / cancel / expired / filled. reconciliation 혼선 차단.

### Glossary 추가 (A2–E2)
```
depositDeltaPreview, depositTimelineStep1, depositTimelineStep2, depositTimelineStep3,
depositLastChecked, depositInputsLocked
```

## 14. Production Operating Layer (A3–E3)

### A3. Intent Ownership Verification
- realtime payload 수신 시 `payload.new.user_id === session.user.id` 검증. 불일치 시 silent drop + `console.warn` (subscription scope 사고 안전장치).

### B3. Realtime Replay Protection
- `useDeposit` 내부 `processedIntentIds: Set<string>` (모달 lifetime). 동일 intent_id `filled` 이벤트 재수신 시 무시 → duplicate toast / 중복 Step3 전환 차단.

### C3. Countdown Drift Correction
- 카운트다운은 `setInterval` tick이 아닌 `expiresAt - Date.now()` 매번 재계산.
- `document.visibilitychange` → `visible` 시 즉시 재계산 + 1회 `get_my_pending_deposits` 동기화. 백그라운드 복귀 drift 0.

### D3. Abandon Reason Classification
- `deposit_abandon` payload에 `reason: 'close_button' | 'backdrop' | 'timeout' | 'refresh' | 'nav_away'` 추가.
- close handler 분기, `beforeunload`/route change 시 'refresh'/'nav_away' 발사.

### E3. "입금 진행 중" Navigation Guard
- `step >= 2 && intentId && status === 'awaiting_payment'` 동안:
  - 모달 X / backdrop → confirm `g('depositLeaveConfirm')` = "진행 중인 입금이 있습니다. 정말 나가시겠습니까?".
  - `beforeunload` 핸들러로 새로고침/탭 닫기 경고.
  - React Router `useBlocker`로 라우트 이탈 confirm.

### Glossary 추가 (A3–E3)
```
depositLeaveConfirm, depositLeaveStay, depositLeaveExit
```

## 15. v1.0 Lock Rules (구현 시 절대 고정)

### L1. 상태 우선순위 ENUM (race-proof)
```ts
export const DEPOSIT_STATUS_PRIORITY = {
  draft: 0,
  intent_created: 1,
  awaiting_payment: 2,
  matching: 3,
  manual_review: 4,
  expired: 5,
  filled: 6,
} as const;
```
- realtime/polling merge: `if (nextPriority >= currentPriority) apply()`.
- `filled`(6)는 항상 최종 승리. `expired`(5)는 `matching`(3) 위지만 `filled`(6) 못 덮음.
- websocket 역순/중복 이벤트 모두 안전 → "입금됐는데 expired 뜸" 박멸.

### L2. Soft Freeze는 financial inputs만
- 변경: `locks.inputsLocked` → `locks.financialInputsLocked: boolean`.
- Lock 대상: amount, method만.
- 항상 활성: copy / regenerate / history 보기 / close(confirm 거침) / 고객지원 CTA.

### L3. Voucher Hash는 솔트 포함
- `sha256(\`${pin}:${user.id}:phonara-v1\`)`. localStorage rainbow 공격 회피. 24h TTL. 동일 해시 3회+ → 클라 차단.

### L4. Polling Truth Merge 규칙
- realtime → optimistic apply.
- polling → authoritative overwrite, **두 조건 동시 만족 시에만**:
  1. `polling.updated_at >= local.updated_at`
  2. `priority(polling.status) >= priority(local.status)`
- 미달이면 polling 결과 무시 (낙관 상태 보호).

### L5. "돈 보호중" 레이어 = Retention Core (제거 금지)
- 다음 6개는 어떤 명목으로도 v1.0에서 제거·축소 불가:
  - heartbeat / safe-checking 카피 / grace checking / copy verification / realtime degraded banner / timeline.
- 제거 시 "사이트 먹튀 느낌" + CS 폭증 + 재입금률 하락 직결.

---

## 16. 비포함
- 결제 PG / Stripe / 카카오 SDK 자동연동 (mem 제약)
- 신규 DB / RPC / 트리거
- 출금 흐름 변경
- 백엔드 rate limit (no-backend-rate-limiting directive)

## 17. 실행 순서 (4-Day Plan)

**Day 1 — Foundation**
- glossary 키 일괄 추가 (Sections 11+12+13+14)
- `useDeposit` core state machine (step / method / draft resume / funnel id / beforeBalance / soft-freeze / processedIntentIds / ownership check)
- realtime 채널 + polling fallback (`useRealtimeChannel` 재사용)
- `sanitize.ts` 유틸 + `visibilitychange` drift correction

**Day 2 — Modal UX**
- DepositModal Step 1/2/3 + 3카드 그리드
- USDT QR + copy verification (끝 6자리 칩)
- regenerate + grace UI + soft-freeze lock + nav guard(confirm/beforeunload/useBlocker)

**Day 3 — History & Ops**
- DepositHistory (pending top + `updated_at DESC` + Warm Gold active badge + 3-step timeline)
- Telemetry 6 이벤트 + `session_funnel_id` + abandon `reason` 분류
- Realtime disconnect banner + voucher fraud soft limit + safe-checking + heartbeat
- Step3 balance delta 카드

**Day 4 — QA Gate**
- 360px 모바일 QA (한 손, 44px+ 터치, 18px+ 텍스트)
- `g()` 100% grep 검증 (하드코딩 0)
- Race QA: filled vs expired grace, 더블탭 idempotency, 새로고침 resume, replay duplicate, drift recovery
- Duplicate QA: 같은 amount/메모 중복 차단, paste sanitize round-trip, nav guard 분기 5종

## 17. 의미
입금 모달이 아니라 **Production Deposit Operating Layer**. 출금만 쉬우면 빠져나가고, 입금까지 쉬워야 다시 들어온다. State machine / realtime / recoverability / telemetry / senior UX / fraud soft / draft resume / grace / safe-checking / balance snapshot / timeline / sanitizer / heartbeat / soft-freeze / ownership / replay protection / drift correction / abandon reason / nav guard — "내 돈이 안전하게 처리되고 있다"는 확신을 끝까지 지키는 시스템.
