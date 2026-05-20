# PR-P0-4 — 출금/체결 안정화 (Client-Layer Hardening)

머니플로 8경로(`request_withdrawal`, `apex_request_cashout`, `apex_place_bet_v2`, `imperial_place_phon_bet`, `_settle`, `_apply_house_edge_split`, `stake_phon`, `swap_*`) 본문은 **git diff = 0**. 클라이언트 처리 레이어(훅·UI·에러 매핑)만 강화한다.

## 현황 진단

- `src/packages/wallet/hooks/useWithdraw.ts` 내부에 `mapWithdrawError`가 존재하지만 파일-로컬. 다른 출금 경로(`useApexCashout`)는 inline 매핑 사용 → 메시지·코드 누수.
- `account_frozen`은 토스트 한 줄로만 안내. 동결 사유/해제 시점/CS 채널이 없음.
- 멱등 키 hit("이미 처리 중") 안내가 `apex_place_bet_v2` 쪽에만 존재. 출금 경로는 무처리.
- LPI 실패 코드(`lpi_claim_race`, `lpi_terminal_state_immutable`, `crid_param_mismatch` 등)는 `src/lib/trading/errors.ts`에만 있고 출금/체결 공유 미흡.
- 출금 흐름 중 예기치 못한 throw(네트워크/JSON 파싱)는 표면화 안 됨 → 흰 화면 위험.

## 변경 계획

### 1. 공용 에러 매퍼 (신규)
`src/lib/withdrawal/errors.ts`
- `WithdrawErrorCode` union: `account_frozen | step_up_required | pin_mismatch | below_min | insufficient_funds | daily_limit | rate_limited | kill_switch | duplicate_in_flight | aal2_required | velocity | lpi_* | oracle_* | unknown`
- `parseWithdrawError(raw): { code, title, description, actionable }` — `useWithdraw`의 기존 매퍼 + `useApexCashout` inline + `mapTradingError`의 LPI 룰을 단일 RULES 테이블로 통합.
- 라우팅/입력 보정 힌트(`resetPin`, `gotoStep`, `cooldownMs`) 함께 반환.

### 2. `useWithdraw.ts` 리팩터 (시그니처 동일)
- 내부 `mapWithdrawError` 제거 → `parseWithdrawError` 위임.
- `duplicate_in_flight` / `idempotency_hit` 케이스 추가: toast `notify.info("이미 처리 중입니다", { description: "10초 내 결과가 표시돼요." })` + `submitting` 상태 10s 유지.
- `account_frozen` 발생 시 toast 대신 `AccountFrozenDialog` 열기.
- public API 변경 없음.

### 3. `useApexCashout.ts` 통합
- inline 매핑 삭제 → `parseWithdrawError` 사용 (`aal2_required`/`velocity` 포함). 동작 동일, 메시지 일관성 확보.

### 4. UI 컴포넌트 (신규, 모두 lazy)
- `src/components/withdrawal/AccountFrozenDialog.tsx` — 사유 라벨, 자동 보호 안내, "고객센터 문의" 버튼(`/support` 또는 `mailto`), "내 활동 보기" 보조 CTA. shadcn `AlertDialog` + Warm King 톤.
- `src/components/withdrawal/IdempotencyHintBanner.tsx` — 멱등 hit 시 모달 상단에 7s 진행바 + "잠시만요". 자동 닫힘.
- `src/components/withdrawal/WithdrawalErrorBoundary.tsx` — `<Wallet>` 트리 wrap. throw 시 "출금 화면을 다시 불러올게요" + Retry. `App.tsx` 미수정(범위 제한). `Wallet.tsx`에서 출금 다이얼로그 영역만 감쌈.

### 5. 트레이딩 측 일관화
- `src/lib/trading/errors.ts`에 `duplicate_in_flight` → "이미 처리 중인 주문입니다" 메시지는 그대로 유지. `parseWithdrawError`가 같은 룰 테이블 import.

### 6. 문서
- `docs/operations/withdrawal-flow.md` 신규: 8개 에러 코드 → 사용자 메시지 → 권장 액션 매트릭스, 멱등/AAL2/Frozen 시나리오 다이어그램.

## 머니플로 가드

- 변경 파일 grep 검증: `request_withdrawal`, `apex_request_cashout`, `imperial_place_phon_bet`, `apex_place_bet_v2`, `_apply_house_edge_split`, `_settle`, `stake_phon`, `phon_swap_*` 본문 0줄 수정.
- RPC 호출 시그니처 동일. 클라 측 wrapper만 변경.

## 예상 효과

- 출금/체결 에러 메시지 100% 한국어 친화, raw 코드 노출 0.
- `account_frozen` UX: toast → dialog로 격상, CS 채널 명시.
- 멱등 hit 시 사용자 재클릭 → 중복 토스트 폭주 차단.
- LPI/oracle 실패 메시지 동일 룰테이블로 일관화.

## 영향 범위

- 신규: 5 파일 (`errors.ts`, dialog/banner/boundary, 문서).
- 수정: `useWithdraw.ts`, `useApexCashout.ts`, `Wallet.tsx` (boundary 마운트 1줄).
- 미수정: money-flow RPC, AAL2 게이트, `App.tsx`.
- Layer 1 gz 영향: < 1.5KB (다이얼로그/배너 lazy).
