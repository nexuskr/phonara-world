# Sprint 2 — Wallet & Withdraw UX

## 목표
Earn으로 모은 PHON을 5분 안에 실제 출금까지 끝낼 수 있다는 신뢰를 50–70대에게 5초 안에 전달한다. `/wallet` 진입 → 잔액 인지 → 3스텝 출금 → ProcessingBanner → History 갱신까지 한 손, Zero lag.

## 재사용 (변경 금지)
- RPC `request_withdrawal` (AAL2 / PIN / frozen / OTP 내장)
- `withdrawal_requests` 테이블, `wallet_balances` 뷰
- `fetchWallet`, `requestWithdrawal` (`src/lib/wallet.ts`)
- `useWithdrawQueue`, `WithdrawQueueStatus` (`src/lib/withdrawal/`)
- `TIER_CFG` 최소 출금액
- `displayCurrency.ts` (PHON ↔ ₩ 표시 환산)

## 신규 파일 (모두 `@pkg/wallet/*`)

```text
src/packages/wallet/
  hooks/
    useWalletSnapshot.ts     # 잔액 + 오늘/이번주 Earn + min/avail + realtime
    useWithdraw.ts           # 3스텝 상태머신 + 낙관적 + 에러 매핑
  components/
    WalletDashboard.tsx      # 상단 잔액 헤더 + KPI 3종 + ProcessingBanner
    WithdrawCard.tsx         # 초대형 CTA + 평균 4분 30초 배지
    WithdrawModal.tsx        # 3스텝 (Amount / Method / Confirm+PIN)
    WithdrawHistory.tsx      # 최근 5건 (status pill)
    ProcessingBanner.tsx     # 진행중 1건 표시 (큐 연동)
```

`src/pages/Wallet.tsx`는 상단 영역만 `<WalletDashboard />` + `<WithdrawCard />` + `<WithdrawHistory />`로 교체. 기존 입금/광고/PracticeModeGate/MultiCurrencyBalance 등 하위 섹션은 그대로 보존.

## 컴포넌트 트리

```text
Wallet (page)
└─ PracticeModeGate
   ├─ WalletDashboard
   │  ├─ 잔액 (text-7xl amber-300, ≈₩ 보조)
   │  ├─ KPI 3종 (오늘 Earn / 이번주 Earn / 출금가능)
   │  └─ ProcessingBanner (큐 1건 이상일 때)
   ├─ WithdrawCard ──▶ opens WithdrawModal
   ├─ WithdrawHistory (최근 5건)
   └─ (기존 deposit / 광고 / 기타 섹션 유지)
```

## 3스텝 출금 흐름

```text
Step 1 Amount
  - Quick chips: 5,000 / 10,000 / 50,000 / 전액
  - 직접 입력 (text-3xl tabular-nums, ≈₩ 라이브)
  - Client 검증: min(tier) ≤ amount ≤ available
  - 실패 시 inline hint (Hot Pink)

Step 2 Method
  - 계좌이체 (기본 선택, bank)
  - 코인 출금 (coin)
  - 상품권 (disabled + "준비중" 칩)

Step 3 Confirm + PIN
  - 요약 카드: 금액 / 수단 / 예상 도착 ≤ 5분
  - 6자리 PIN (text-2xl tracking-[0.4em], numeric inputMode)
  - "출금 신청" CTA (min-h-[56px], Warm Gold)
  - 호출: requestWithdrawal({ amount, method, pin })
```

## useWithdraw 상태머신
- `step`: 1 | 2 | 3
- `amount`, `method`, `pin`
- `submit()`:
  1. 낙관적: snapshot.available -= amount
  2. `request_withdrawal` 호출
  3. 성공 → ProcessingBanner 표시, History invalidate, 토스트 `withdrawSuccess`, modal close
  4. 실패 → 잔액 롤백, 에러코드 매핑 토스트

### 에러 매핑
| 코드 | 토스트(Glossary) | 추가 액션 |
|---|---|---|
| `account_frozen` | `withdrawErrFrozen` | `/trust` 링크 |
| `step_up_required` | `withdrawErrStepUp` | `/security/totp` 링크 |
| `invalid_pin` | `withdrawErrPin` | Step 3 머무름, PIN 초기화 |
| `amount_below_min` | `withdrawErrMin` | Step 1로 back |
| `insufficient_funds` | `withdrawErrFunds` | Step 1로 back |
| 그 외 | `withdrawErrGeneric` | — |

## 50–70대 가독성 규칙
- 잔액: `text-6xl md:text-7xl font-black tabular-nums text-amber-300`
- 모든 CTA: `min-h-[56px] text-lg font-black`
- PIN 입력: `text-2xl tracking-[0.4em] text-center`
- PHON 옆에 항상 `≈ ₩{원화}` 보조 (text-base text-muted-foreground)
- 성공/CTA = Warm Gold `#FFD700` 계열, 경고/오류 = Hot Pink `#FF00AA`
- 모바일 360px: 카드 패딩 `px-4 py-5`, 그리드 `grid-cols-3 gap-2` (KPI)

## Glossary 추가 키 (모두 `g()`만 사용)
walletHeader, walletBalance, walletKrwApprox, walletTodayEarn, walletWeekEarn, walletAvailable, walletMin, processingBannerTitle, processingBannerSub, historyTitle, historyEmpty, historyStatusPending, historyStatusProcessing, historyStatusCompleted, historyStatusFailed, withdrawNow, withdrawCtaSub, withdrawAvgTime, withdrawStep1Title, withdrawStep2Title, withdrawStep3Title, withdrawAmountLabel, withdrawAllChip, withdrawMethodBank, withdrawMethodCoin, withdrawMethodGift, withdrawMethodSoon, withdrawPinLabel, withdrawPinHint, withdrawConfirmEta, withdrawSubmit, withdrawSuccess, withdrawProcessing, withdrawErrFrozen, withdrawErrStepUp, withdrawErrPin, withdrawErrMin, withdrawErrFunds, withdrawErrGeneric

## 검증 체크리스트
- [ ] `/wallet` 5초 이내 잔액 + KPI + CTA 렌더
- [ ] 3스텝 한 손 흐름, 모든 버튼 ≥56px
- [ ] 360px viewport 잘림 없음
- [ ] 성공 → ProcessingBanner + History 즉시 갱신
- [ ] frozen/step_up/PIN/min/funds 5종 에러 친절 안내
- [ ] 모든 텍스트 `g()` 100%
- [ ] 기존 deposit/광고 섹션 그대로 동작

## 비포함
- 카카오 SDK / 추가 결제 PG (제약 메모 준수)
- DB 스키마 변경 / RPC 신규 (없음)
- 출금 정책/한도 로직 변경 (서버 그대로)

## Sprint 3 후보
Slot/Trade 통합 또는 입금(코인/계좌) UX 강화 중 택1.
