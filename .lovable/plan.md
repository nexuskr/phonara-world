# Phonara.world 최종 폴리싱 로드맵

현재 코어(Cloud, RLS, 권한 baseline, 결제 3채널, 포렌식 검수, 타임라인, CI)는 안정적. 이제 "최후 1%"를 채우는 작업입니다. 우선순위 P0(무조건) → P3(여유) 순.

---

## 🔴 P0 — 출시 전 필수 (1~2일)

### 1. 입금 폼 클라이언트 측 검증 통합 (구멍 발견)
- `validate_deposit_input` RPC가 이미 존재하지만 `src/pages/Wallet.tsx` / `Packages.tsx`의 폼이 **호출하지 않음** → 관리자만 검증하는 단방향 구조.
- **할 일**: Wallet `submitDeposit()`, Packages `submitPackagePurchase()` 호출 직전에 RPC 실행 → 중복/네트워크 불일치/계좌 형식 오류 즉시 토스트.
- **추가**: 코인 주소 prefix별 정규식(`0x`/`T`/`bc1`) 클라이언트 1차 가드.

### 2. SMS·푸시 알림 실 연동
- `notification_preferences`로 사용자 동의는 받지만 SMS/푸시 채널이 **DB 플래그만 존재 — 실제 발송 코드 없음**.
- **선택**: 
  - SMS: 알리고(국내 저렴) 또는 Twilio
  - 푸시: Web Push (VAPID) — 서버리스로 충분
- **할 일**: `send-transactional-email` 패턴 그대로 `send-sms` / `send-push` Edge Function 추가 + `tg_*_status_change` 트리거에서 채널 분기.

### 3. AdminReviewModal 처리 결과 → 사용자 모달 동기화 점검
- DepositRequestsAdmin/Packages는 사용자 측 history 컴포넌트가 미흡.
- **할 일**: 사용자 Wallet의 deposit 탭에 `DepositHistoryList`(WithdrawalHistoryList와 동급) 신설, RequestTimeline 임베드.

### 4. Edge Function 보안 감사
- `verify-submission`, `ai-mission-generator` 등 9개 함수의 입력 zod 검증·rate limit 일치 여부 일괄 점검.
- 미검증 함수 발견 시 즉시 패치.

---

## 🟠 P1 — 운영 안정성 (3~5일)

### 5. 어드민 대시보드 KPI 시각화 보강
- ObservabilityCockpit이 있지만 "오늘 입금/출금/패키지 매출/순이익" 카드형 일일 위젯 부재.
- **할 일**: `daily_treasury_snapshot` 머티리얼라이즈드 뷰 + Admin 첫 페이지 카드 4개.

### 6. Anomaly 자동 대응
- `anomaly_events`는 기록만 함. Critical 이벤트(예: 1분 내 5회 실패) 발생 시 **자동 계정 동결**(`account_freezes` 인서트) 트리거 추가.

### 7. Rate Limiting 표준화
- `submit_deposit`, `request_withdrawal` 등 핵심 RPC에 `pg_throttle` 패턴(분당 N회) 적용. 현재 미구현이면 봇 공격에 취약.

### 8. AML Gate UX 개선
- AMLGate 차단 시 "어떤 서류가 필요한가"를 명시한 단계별 가이드 카드 + 업로드 진행도. 현재는 메시지만.

### 9. PIN 보안 강화
- 출금 PIN 5회 오입력 시 24h 락아웃 + 이메일 통지. 현재 무제한 시도 가능 추정.

### 10. Receipt 이미지 OCR 자동 검증
- Lovable AI Gateway(`google/gemini-2.5-flash`)로 영수증 금액·시간 자동 추출 → 신청 금액과 일치 여부 보조 체크 → 어드민 검수 1초 → 0초.

---

## 🟡 P2 — 사용자 경험 폴리싱 (1주)

### 11. i18n 누락 점검
- 새로 추가된 "포렌식 승인", "타임라인", "관리자 검수 메모" 등이 한글 하드코딩. ko/en 양방향 정리.

### 12. 모바일 첫 로드 성능
- 라이트하우스 측정 → 코드스플릿(특히 Admin/UGC), 이미지 lazy, font-display: swap 확인.

### 13. 접근성(a11y)
- 현재 `aria-label` 18개뿐. Modal trap focus, ESC 닫기, 색대비, 폼 라벨 연결을 위한 일괄 패스.

### 14. ErrorBoundary 세분화 + Sentry
- 페이지별 fallback + 운영용 에러 수집(Sentry/Logtail).

### 15. 빈 상태(Empty State) 일관화
- "아직 신청 내역이 없습니다" 문구·아이콘 통일 컴포넌트.

### 16. 로딩 스켈레톤
- Dashboard/Wallet/Packages/Empire 첫 진입 시 깜빡임 → shadcn Skeleton 통일.

### 17. Real-time 재연결 처리
- 네트워크 끊김 시 채널 자동 reconnect 토스트 + retry.

---

## 🟢 P3 — 장기 가치 (선택)

### 18. 관리자 감사 로그 검색 UI
- `admin_audit_log` 키워드/날짜/관리자별 필터.

### 19. 사용자 데이터 다운로드(GDPR/PIPA)
- 프로필 탭에 "내 데이터 받기" 버튼 → ZIP(JSON+CSV) 생성 Edge Function.

### 20. 2FA(TOTP) 어드민 강제
- has_role('admin') 사용자 로그인 후 TOTP 검증 단계.

### 21. CI 확장
- 현재 RLS+권한 drift만 검사. E2E(Playwright) 핵심 플로우(가입→충전→미션→출금) 추가.

### 22. 백업·복원 리허설
- 주 1회 PITR 복원 테스트 워크플로우.

### 23. SEO·OG 카드
- 메타 태그·OG 이미지·sitemap.xml·robots.txt 마지막 점검.

### 24. Storybook 도입
- LuxButton, Disclaimer, RequestTimeline 등 핵심 UI 시각 회귀 방지.

---

## 추천 실행 순서
```
Day 1-2:  P0 #1, #3, #4   (코드 구멍 마감)
Day 3-4:  P0 #2 SMS/푸시
Day 5-7:  P1 #5~#10
Week 2:   P2 (UX 폴리싱)
Week 3+:  P3 (선택적 가치)
```

## 가장 임팩트 큰 Top 3 (시간 부족 시)
1. **#1 폼 검증 통합** — 어드민 부담을 즉시 줄임
2. **#2 SMS/푸시** — 사용자 신뢰도 급상승
3. **#10 OCR 자동검증** — 운영 인건비 -70%

---

어떤 묶음부터 진행할지 알려주세요. 추천: **P0 전체(#1~#4)를 한 번에** 끝내는 것을 권장합니다.
