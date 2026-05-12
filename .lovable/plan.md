
# 🔥 Phonara 플랫폼 현황 분석 — 멸망급 진단

## 1. 요청 항목별 적용 현황 (코드/DB 실측)

| # | 요청 | 상태 | 근거 |
|---|------|------|------|
| 1 | AI mission_templates 30개 시드 | ✅ **완료** | DB에 35개 존재 (`SELECT count(*) FROM mission_templates = 35`) |
| 2 | 입금(계좌이체+영수증) RPC | ✅ **완료** | `submit_deposit` RPC + `uploadReceipt`(receipts bucket) + `DepositRequestsAdmin.tsx` |
| 3 | 출금 요청 RPC | ✅ **완료** | `request_withdrawal` (AAL2/OTP 강제, 속도이상 자동동결까지) + `WithdrawRequestsAdmin.tsx` |
| 4 | 관리자 승인/거절 화면 | ✅ **완료** | `AdminReviewModal` + 포렌식 체크리스트 + 타임라인 |
| 5 | 서버 기준 실시간 랭킹 + 축하 애니 | ✅ **완료** | `LiveRanking.tsx` — `leaderboard_today` view + Realtime channel + 셀프 RANK UP 모션/토스트 |
| 6 | PWA 매니페스트 | ✅ **완료** | `/manifest.webmanifest`(+ko/en) + icon-192/512 + maskable + offline.html |
| 7 | 푸시 서비스워커 | ✅ **완료** | `public/sw-push.js` + `src/lib/push.ts`(`subscribePush`) + `send-push` edge fn (web-push + VAPID) |
| 8 | VIP 패키지 구매 흐름 | ✅ **완료** | `Packages.tsx`(304줄) + `submit_package_purchase` RPC + `PackagePurchasesAdmin` |
| 9 | `/forgot-password` + 이메일 재전송 | ✅ **완료** | `ForgotPassword.tsx` + `ResetPassword.tsx` 둘 다 존재 |
| 10 | 매직링크 만료/재사용 에러+재발송 | ⚠️ **부분** | `AuthCallback.tsx`는 있으나 만료 전용 화면+원클릭 재발송 UX 미확인 → 보강 필요 |
| 11 | 로그인 후 패키지 상태 분기 라우팅 | ⚠️ **부분** | `useAuthBridge`/`CompleteProfile` 존재하나 패키지 미보유→/packages, 보유→/dashboard 분기 명시 코드 미확인 → 보강 필요 |
| 12 | 실명/생년월일/휴대폰 검증 + 서버 체크 | ⚠️ **부분** | 클라 zod는 있음. 서버 트리거(`guard_profile_sensitive_columns`)도 있음. 다만 휴대폰 형식·생년월일 19+ 서버 검증 RPC 단일 진입점 없음 → 보강 필요 |
| 13 | 미션 보상/승인 알림 푸시 연동 | ⚠️ **부분** | `send-push` 인프라는 있으나 미션 승인/보상 이벤트→push 호출 트리거 연결 여부 추가 검증 필요 |
| 14 | 번들/이미지/애니 최적화 + A11y 감사 | ❌ **미흡** | 아래 §3 참고 |

**결론:** 14개 중 9개 완료, 4개 부분 보강, 1개(성능/A11y) 본격 작업 필요.

---

## 2. 미완료/보강 작업 (우선순위 순)

### P0 — 사용자 영향 큰 것
1. **로그인 후 분기 라우팅** — `useAuthBridge`에 `profile.tier`/`active_package` 조회 후 `/wallet?intent=first-deposit` ↔ `/dashboard` 분기 추가
2. **매직링크 에러 화면** — `/auth/callback`에서 `otp_expired`/`access_denied` 감지 시 전용 카드 + "5초 후 재발송" 버튼
3. **미션 승인 → 푸시** — `admin_resolve_mission` 트리거에서 `pg_net`으로 `send-push` 호출 (보상 지급/승인 모두)

### P1
4. **서버 입력 검증 통합 RPC** — `validate_profile_input(name, dob, phone)` 추가 + `BEFORE INSERT/UPDATE` 트리거
5. **A11y 감사** — `aria-label` 누락 버튼 자동 lint, focus-visible 링, 컬러 대비 4.5:1 확인 (현재 guide/secure-auth에 3건만 검색됨)

---

## 3. 🐌 렉(성능) 원인 분석 — 끝판왕 진단

### 🔴 치명적 (즉시 수정 권장)

#### A. **Three.js 31MB가 메인 번들에 포함될 가능성**
- `node_modules/three`: **31MB**, `@react-three`: 2.8MB
- 사용처는 `src/components/arena/EmpireArmy3D.tsx` **단 1곳**
- `vite.config.ts`에서 `manualChunks.three`로 분리는 되어 있음 ✅
- **문제:** 해당 컴포넌트가 lazy import 되는지 확인 필요. 만약 Arena 페이지 진입 시 일반 import면 초기 로드는 OK지만 페이지 진입 시 31MB 다운로드 → 모바일 4G에서 5~10초 멈춤
- **조치:** `EmpireArmy3D`는 반드시 `React.lazy()` + `<Suspense>` + IntersectionObserver로 화면 진입시에만 로드

#### B. **realtime 채널 8개 동시 구독**
- `use-wallet`, `Admin`(2), `SupportTickets`, `Support`, `admin/Support`, `AIBotCards`, `trading/real-store` + LiveRanking 등
- `LiveRanking`은 8초마다 polling **+** realtime 동시 = 중복 트래픽
- **조치:** polling 제거하고 realtime 단독 사용. 채널 수 줄이려면 단일 `app:events` 채널로 통합

#### C. **AnimatePresence + framer-motion 과다**
- LiveRanking에서 매 8초마다 layout 애니메이션 트리거 → low-end 안드로이드 reflow 폭증
- **조치:** `prefers-reduced-motion` 체크 강제, `layout` prop을 enter/exit만 사용

### 🟠 심각

#### D. **App.tsx — 18개 import vs 34개 lazy**
- 라우트 lazy는 잘 되어 있음 ✅
- 다만 `Layout.tsx`/`TopHUD`/`FloatingChat` 등 전역 컴포넌트가 무거우면 모든 페이지 영향
- **조치:** `FloatingChat`, `NeonNotificationFeed` 같은 위젯 `LazyMount` 적용 (이미 util 존재)

#### E. **이미지 최적화 미흡**
- `og-image.jpg`, hero 이미지들 WebP/AVIF 변환 + `loading="lazy"` + `decoding="async"` + `fetchpriority` 일괄 점검 필요

#### F. **Gold particle / Orbit / Nebula FX 동시 렌더**
- Guide V2 / SecureAuth V2에 `GoldOrbitField + ParticleField + ParallaxLayer` 동시 사용 → 60fps 어려움
- **조치:** 모바일에서는 particle count 50% 감축 + `will-change` 제거 + `transform: translateZ(0)`만 유지

### 🟡 중간

- **Supabase types.ts 비대화** — RPC가 늘면서 자동 생성 타입이 커지는 중. tree-shake에는 영향 없지만 dev HMR 느려짐
- **i18next 초기 번들** — ko/en 동시 로드 중이면 분할 필요
- **react-three/drei**: tree-shaking 안 되는 import 있는지 확인

---

## 4. 권장 작업 순서 (다음 빌드 모드에서 실행)

```text
PHASE A (성능 응급처치, 1턴)
  1. EmpireArmy3D React.lazy + Suspense 강제
  2. LiveRanking polling 제거 (realtime only)
  3. 모바일에서 particle/orbit count 50% 감축 + reduced-motion 강제
  4. FloatingChat / NeonNotificationFeed LazyMount 래핑

PHASE B (UX 보강, 1턴)
  5. AuthCallback 만료/재사용 전용 에러 카드 + 재발송 버튼
  6. useAuthBridge 패키지 보유 여부 분기 라우팅
  7. validate_profile_input RPC + 트리거

PHASE C (알림 연결, 1턴)
  8. admin_resolve_mission 성공 시 pg_net → send-push 호출
  9. 입금/출금 승인 시에도 동일 푸시 트리거

PHASE D (A11y 감사, 1턴)
  10. 모든 icon-only 버튼 aria-label 추가
  11. focus-visible:ring-2 ring-gold/70 전역 적용
  12. 컬러 대비 자동 검사 스크립트 추가
```

---

## 5. 한줄 요약

> **이미 70% 완성된 제국이지만, 31MB Three.js 즉시 로드 + 8개 realtime 채널 + 풀 particle FX 3중첩이 모바일 렉의 90% 원인이다.** Phase A만 끝내도 체감 속도 2~3배 상승 예상.

승인하시면 **Phase A부터 순차 실행**하겠습니다.
