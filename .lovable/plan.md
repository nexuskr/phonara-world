# 출금 UX 개선 — TOTP 스텝업 / 친절한 한국어 에러 / 한국 은행 20종

## 1. TOTP 등록자에게도 "등록해주세요"가 뜨는 문제

원인: 새 출금 모달(`useWithdraw`)은 서버가 `step_up_required`를 반환하면 무조건 "/security/totp 에서 등록해주세요" 토스트를 띄움. 실제로는 TOTP가 등록돼 있어도 **이번 세션 AAL2가 아닌 경우** 같은 코드가 반환됨.

해결:
- 기존 자산 `StepUpGate` + `useStepUp` 훅을 출금 모달 흐름에 그대로 연결.
- 서버가 `step_up_required`를 던지면 → 인라인 스텝업 다이얼로그(TOTP 6자리 또는 이메일 OTP)를 띄우고, 인증 성공 시 같은 출금 요청을 1회 자동 재시도.
- TOTP 등록 자체가 없는 사용자에게만 "인증 앱 등록" CTA를 노출(StepUpGate 내부 이미 처리됨).

연결 지점:
- `src/packages/wallet/hooks/useWithdraw.ts` 시그니처에 `requireStepUp?: (label?: string) => Promise<boolean>` 옵션 추가.
- `src/pages/Wallet.tsx`(또는 `WalletDashboard`)에서 `useStepUp()` 결과를 `useWithdraw`에 주입하고 `<StepUpGate {...stepUpProps} />` 마운트 보장.

## 2. 에러 알림을 "서비스 톤"으로 한국어화

현재 토스트 description에 `step_up_required`, `account_frozen`, `below_min:5000` 같은 개발자 코드 또는 영문 메시지가 그대로 노출됨.

해결:
- `useWithdraw` 내부에 `mapWithdrawError(msg)` 헬퍼 추가 → 모든 알려진 서버 에러를 다음 톤으로 매핑하고, 어떤 경우에도 원문 코드를 화면에 노출하지 않음. 알 수 없는 에러만 일반 안내 문구로 폴백.

| 서버 코드 | 표시 제목 | 표시 설명 |
|---|---|---|
| step_up_required | 추가 인증이 필요해요 | 잠시 후 인증 창이 열립니다. 등록한 인증 앱 코드를 입력해 주세요. |
| account_frozen | 계정이 일시 보호 중입니다 | 이상 활동이 감지되어 24시간 자동 보호가 적용됐어요. 자세한 사항은 고객센터로 문의해 주세요. |
| pin mismatch / invalid pin | 출금 비밀번호가 일치하지 않습니다 | 6자리 비밀번호를 다시 입력해 주세요. |
| below_min:* | 최소 출금 금액 미만입니다 | 최소 {min} PHON부터 출금이 가능합니다. |
| insufficient_funds | 출금 가능 잔액이 부족합니다 | 현재 사용 가능 잔액을 확인해 주세요. |
| daily_withdraw_limit | 오늘 출금 한도를 모두 사용하셨어요 | 자정에 한도가 초기화됩니다. |
| rate_limited | 잠시 후 다시 시도해 주세요 | 짧은 시간에 요청이 너무 많아요. |
| 그 외 | 출금을 처리하지 못했어요 | 잠시 후 다시 시도해 주세요. 문제가 지속되면 고객센터로 문의해 주세요. |

추가:
- `StepUpGate`의 `notify.error("인증 실패", { description: e?.message })` 도 동일 톤으로 정리(영문 message 직접 노출 금지, "코드가 일치하지 않거나 만료됐어요").
- 알림은 기존 `notify.error`(글래스 톤, 도장형 카드)를 그대로 사용 — 추가 디자인 변경 없음.

## 3. 한국 은행 20종 전면 등록

현재: `WithdrawModal.tsx`에 7개 은행 문자열 배열만 존재. 기본값 `"KB"` 와 표시명이 어긋남.

해결:
- 신규 파일 `src/lib/koreanBanks.ts` — 사용자가 명시한 20개 은행을 `{ code, name, display }` 형태로 그대로 export.
- `WithdrawModal.tsx`의 `BANKS` 상수 제거 → 새 목록으로 교체. 표시는 `display`, 저장값은 `display`(서버는 문자열만 보관) 사용.
- `useWithdraw`의 폼 기본값 `bankName: "KB"` → `"KB국민은행"`.
- `<select>` 드롭다운 그대로 사용하되 옵션 수가 늘어났으니 폰트/높이는 유지(min-h-[52px]). 변경 시 디자인 토큰만 사용.

은행 목록(20종, 그대로 적용):
KB국민, 우리, 신한, 하나, NH농협, 카카오뱅크, 토스뱅크, 케이뱅크, SC제일, 한국씨티, 산업, 기업, 대구, 부산, 광주, 제주, 전북, 경남, 새마을금고, 수협.

## 절대 변경 금지(재확인)

- money-flow 8경로, Operator Isolation, Realtime Partition, Active Governor, Bundle Budget, sound 시스템, `request_withdrawal` RPC 시그니처 — 단 1바이트도 건드리지 않음.
- 이번 작업은 100% 클라이언트 프론트엔드(컴포넌트/훅/표시 카피)만 수정.

## 변경 파일

- 신규: `src/lib/koreanBanks.ts`
- 수정: `src/packages/wallet/hooks/useWithdraw.ts` (에러 매핑 + 스텝업 콜백 옵션 + 자동 재시도 + 기본 은행)
- 수정: `src/packages/wallet/components/WithdrawModal.tsx` (BANKS 교체)
- 수정: `src/pages/Wallet.tsx` (useStepUp → useWithdraw 주입; StepUpGate는 이미 마운트됨)
- 수정: `src/components/security/StepUpGate.tsx` (인증 실패 description 한국어화)
