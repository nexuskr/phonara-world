# Track 3 — 버튼 / 인터랙션 전수 검증

작성: 2026-05-14 (P5 직후)
범위: 금융 critical · 게임 critical · 어드민 critical
원칙: useRealtimeChannel · AdminAal2Gate · GodModePanel · withdrawal_requests 아키텍처는 변경 금지.

---

## 매트릭스 (라우트 × 버튼)

| # | 라우트 | 버튼 / 액션 | RPC / 핸들러 | disabled 정확성 | 중복클릭 가드 | 토스트(notify) | 한국어 에러매핑 | 모바일 ≥44px | 결과 | 비고 |
|---|--------|-------------|-------------|------------------|----------------|-----------------|-----------------|---------------|------|------|
| **금융 critical** | | | | | | | | | | |
| 1 | `/wallet` (deposit) | 입금 신청 | `submit_deposit` | ⚠ before patch | ❌ → ✅ patched (`submitting`) | ✅ toast | ✅ | ✅ 56px | **PASS (after C1)** | 다중 탭 시 multi-RPC 가능했음. `setSubmitting` 가드 추가. |
| 2 | `/wallet` (withdraw) | 출금 신청 | `request_withdrawal` | ⚠ before patch | ❌ → ✅ patched | ✅ toast | ✅ (aml/step_up/frozen 매핑) | ✅ 56px | **PASS (after C1)** | 동일. step_up·frozen·aml 메시지는 이미 잘 매핑되어 있음. |
| 3 | `/wallet` (withdraw) | 인증코드 전송 | `gen6` 클라 | ✅ | ✅ idempotent | ✅ | n/a | ✅ 48px | PASS | |
| 4 | `/pay` Phonara Pay | 입금 요청 생성 | `create_crypto_deposit_intent` | ✅ `disabled={busy ‖ amount<1 ‖ !addr}` | ✅ `setBusy` | ✅ notify | ⚠ raw e.message | ✅ lg | PASS | 한국어 매핑 약함 — Medium. |
| 5 | `/pay` Phonara Pay | 주소/금액 복사 | `clipboard.writeText` | n/a | ✅ 1.5s lock | inline check | n/a | ✅ | PASS | |
| 6 | `/pay` Phonara Pay | 새 입금/취소 | reset() | n/a | n/a | n/a | n/a | ✅ | PASS | |
| 7 | `RefundRequestPanel` | 환불 요청 | `request_refund` | ✅ `busy ‖ reason<5` | ✅ `setBusy` | ✅ notify | ✅ `refundErrorMessage` | ✅ default | PASS | |
| 8 | `LossProtectionGate` | 70% 손실보호 청구 | `claim_loss_protection` | ✅ `busy ‖ netLoss≤0` | ✅ `setBusy` | ✅ notify | ✅ `lossProtectionErrorMessage` | ✅ default | PASS | |
| 9 | `/admin` Withdraw queue | 승인 / 지급완료 / 거절 | `admin_resolve_withdrawal` (modal) | ✅ `disabled={busy}` (modal) | ✅ `setBusy` | ✅ toast | ⚠ raw e.message | ✅ ≥44px | PASS | 모달 단건 처리. **Bulk approve/reject 미구현** — 별도 기능 요청. |
| 10 | `/admin` Deposit queue | 승인 / 거절 | `admin_resolve_deposit` (modal) | ✅ | ✅ | ✅ + AI OCR | ⚠ raw | ✅ | PASS | |
| **게임 critical** | | | | | | | | | | |
| 11 | `/packages` 패키지 구매 | `purchase_package` | (별도 패널) | — | — | — | — | — | DEFER | 본 트랙 추출 단계 미적용. 다음 패스에서 점검. |
| 12 | `/dashboard` 베팅 진입 | `<DashboardBetPanel.focusAmount>` | 클라 이벤트 | ✅ | n/a | n/a | n/a | ✅ | PASS | PR-12 burst 흐름. |
| 13 | `<FoundingSeasonHall>` 좌석 클레임 | `claim_founding_season_seat` | ✅ `busy` | ✅ `setBusy` | ✅ notify | ✅ `errMap` | ✅ | PASS | godmode 게이트 명확. |
| 14 | Crown Trigger (auto, in-game) | `award_crown` | RPE 토스트 | ✅ idempotent | n/a | ✅ | ✅ | ✅ | PASS | `src/lib/crown.ts` |
| **어드민 critical (GodModePanel 5섹션)** | | | | | | | | | | |
| 15 | GodMode · LiveKpi | (read-only) | `useAdminPending` | n/a | n/a | n/a | n/a | n/a | PASS | |
| 16 | GodMode · Manual Crown link | `/admin/game/crown-trigger` | `<Link>` | n/a | n/a | n/a | n/a | ✅ | PASS | |
| 17 | `/admin/game/crown-trigger` | Crown 발행 | `admin_trigger_crown` | ⚠ before patch (range check 없음) | ⚠ → ✅ patched | ✅ notify | ❌ → ✅ patched | ✅ size=lg | **PASS (after C2)** | not_admin/aal2/user_not_found/rate_limited 매핑 추가. |
| 18 | GodMode · RRM Toggle | `toggle-rrm` edge fn | ✅ `busy ‖ enabled===null` | ✅ `setBusy` | ✅ notify | ⚠ raw e.message | ✅ ≥44px | PASS | step-up gate 정상. |
| 19 | GodMode · Anomaly Live | (read-only feed) | `useRealtimeChannel` | n/a | n/a | n/a | n/a | n/a | PASS | |
| 20 | GodMode · Flash Event | `<Link>` | n/a | n/a | n/a | n/a | ✅ | PASS | |

---

## 우선순위별 이슈

### Critical (즉시 패치 — 본 PR 적용 완료)

- **C1 — `src/pages/Wallet.tsx` 입금/출금 버튼 중복 클릭 방지 부재** ✅ 패치
  - 증상: `submitDeposit` / `submitWithdraw`에 in-flight guard 없음. 빠른 더블탭 시 같은 RPC 두 번 호출 가능 (request_withdrawal 멱등성은 서버측에 있지만 클라 토스트가 두 번 표시되어 UX 혼란).
  - 패치: `submitting` 상태 추가, 함수 진입 시 early return + try/finally로 토글, 버튼에 `disabled={submitting}` + `aria-busy` + opacity 스타일 + 라벨 "처리 중…".

- **C2 — `src/components/admin/game/ManualCrownTrigger.tsx` 한국어 에러 매핑 부재** ✅ 패치
  - 증상: `notify.error(error.message)` 그대로 노출 (영문 PG 에러 코드). 어드민이 원인 파악 어려움.
  - 패치: `not_admin / aal2_required / invalid_uid / user_not_found / rate_limited` 매핑. 추가로 Base/Multiplier 범위 클라 검증, busy 진입 가드.

### High

- **H1 — `src/components/empire/PhonaraPayPanel.tsx` 한국어 에러 매핑 약함**
  - `handleCreate` catch에서 `e?.message` 그대로 표시. `intent_already_exists / amount_out_of_range / address_not_set` 등은 한글로 매핑 권장.

- **H2 — `src/components/admin/AdminReviewModal.tsx` 처리 결과 raw 에러**
  - `submit()` catch에서 `e.message` 그대로. 출금/입금/패키지 공용이므로 `pending_only / already_resolved / not_admin` 등 공용 매핑 추가 권장.

- **H3 — Bulk approve/reject 미구현 (어드민 출금 큐)**
  - 사양에 명시되었으나 현 UI는 단건 모달만 지원. 신규 기능이므로 별도 트랙(P6 등)으로 분리 추천.
   서버측 `admin_resolve_withdrawal_bulk` RPC도 부재 — 도입 시 멱등키/감사로그/AAL2 게이트 동일 적용 필요.

### Medium

- **M1 — `src/components/admin/GodModePanel.tsx` RRM 토글 raw 에러** 
  - `toggle-rrm` invoke 실패 시 영문 메시지 노출. `forbidden / not_authenticated / network` 매핑 권장.
- **M2 — Wallet `handleClick` 중 `WithdrawIntentInterceptor` 가 `e.preventDefault()` 호출 시 사용자에게 명확한 토스트 부재**
  - 인터셉트로 인한 미진행 케이스에서 침묵. `notify.info("결제 의도 점검 중")` 등 가벼운 안내 권장.
- **M3 — `RefundRequestPanel` / `LossProtectionGate` 새로고침 시 깜빡임**
  - 로딩 시 동일 카드 슬롯 보존을 위해 skeleton 적용 권장 (UX 통합 프리미티브 `LoadingList`).

### Low

- **L1 — Wallet `sendCode` 토스트가 사용자에게 코드 노출** (`tw("codeSentDesc", { code })`)
  - 데모/시뮬레이션 모드용으로 유지 가능. 실제 SMS/이메일 OTP 전환 시 제거 필요.
- **L2 — `ManualCrownTrigger.fire` `confirm()` 사용** — 모바일 UX 약함. 디자인 시스템의 `<Dialog>`로 교체 권장.
- **L3 — PhonaraPayPanel의 외부 QR 서비스 의존** (`api.qrserver.com`) — 오프라인/CSP 환경 깨짐. 로컬 QR 라이브러리(`qrcode.react` 등)로 교체 권장.

---

## 검증 절차

- 모든 critical 버튼은 코드 리뷰 + 정적 패턴 검색(`rg "onClick"`)으로 catalog. 
- 모바일 터치타깃은 className의 `min-h-[44px|48px|56px]` 또는 `size="lg"` (Button 변형 h-11=44px) 기준으로 확인.
- 실 RPC 호출은 본 트랙 범위 외(시뮬 mode + 실서버 분리). 서버 응답 매핑은 `humanizeError`(wallet.ts) / `errMap`(FoundingSeasonHall) / `refundErrorMessage`/`lossProtectionErrorMessage`(trustV2)에 이미 표준화되어 있음.

---

## 다음 단계 제안

- **P6**: 어드민 출금 큐 bulk approve/reject (서버 RPC 신설 + AAL2 + 멱등 + 감사로그).
- **P7**: H1/H2/M1 한국어 에러 매핑 일괄 정리 (공용 `mapAdminError(msg)` 헬퍼).
- **P8**: 모바일 라우트별 viewport 360x800 실 캡처 회귀(브라우저 자동화).
