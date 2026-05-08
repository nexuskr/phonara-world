# 프로젝트 종합 점검 보고서

## ✅ 완료된 7대 트랙 + α (모두 ACTIVE)

| 영역 | 산출물 | 상태 |
|---|---|---|
| 정산 SLO + 자가치유 | `recover_stuck_settlements()` + cron(`5 * * * *`) | ✅ |
| Idempotency | `idempotency_keys` + RLS | ✅ |
| Policy as Code | `policy_assertions` + 일일 cron(`30 3`) | ✅ |
| 이상탐지 + 실시간 | `anomaly_events` + 5분 cron + Realtime LIVE | ✅ |
| Public Trust | `/trust`, JSON-LD, sitemap, robots | ✅ |
| Edge 캐싱 | `catalog-cache` 엣지 + `catalog-cache.ts` | ✅ |
| Chaos Drill | `run-drill.ts` (13/13 PASS) | ✅ |
| Public Status API | `public-status` 엣지 | ✅ |
| Synthetic Canary | `phonara-uptime-canary` 5분 cron | ✅ |
| **A** 자동 freeze | `account_freezes` + 트리거 + 5분/시간 cron 2개 | ✅ |
| **B** 빌드 성능 | brotli/gzip + modulePreload polyfill | ✅ |
| **C** 외부 신뢰성 | `webhook_subscriptions/deliveries` + HMAC 디스패처 + 90일 히트맵 | ✅ |
| **D** Observability | `spans` + `slow_requests_top()` | ✅ |
| **E** Chaos 자동화 | `chaos-probe` 엣지 + 일일 cron(`20 3`) + Trust 타일 | ✅ |

**활성 cron 11개, 엣지 13개, 모두 정상.**

---

## ⚠️ 1000% 완성을 위해 남은 "마지막 1%" 갭

대부분 **백엔드 인프라는 완성**되었으나, 다음 영역은 **운영자가 실제로 보고 활용할 UI/자동화 회로**가 빠져 있습니다.

### Gap 1. 관찰성(D)이 데이터만 쌓이고 UI가 없음
- `spans`, `slow_requests_top()`은 만들어졌지만 호출하는 화면이 없음 → 관리자가 P95 병목을 못 봄
- `record_span()`을 부르는 클라이언트/엣지 인스트루먼테이션이 없어 실제 데이터가 안 들어옴

### Gap 2. 외부 트러스트(C) end-to-end 미실증
- `webhook-dispatcher` 엣지 + cron은 있지만 `webhook_subscriptions`에 등록 1건도 없음 → 실제 외부 통보 한 번도 안 나감
- 관리자 화면에서 webhook 등록/시크릿 회전/최근 전송 결과를 보는 UI 부재

### Gap 3. Chaos(E) 결과의 Trust 페이지 노출 미흡
- `latest_chaos_run` RPC는 있지만 Trust 타일이 "PASS x/y, ms"만 표시 → **실패 시 어느 probe가 깨졌는지** 노출 안 됨
- 실패 시 자동으로 anomaly_events에 적재 → freeze 루프 → 알림으로 이어지는 회로 미연결

### Gap 4. 자동 freeze(A) 사용자 가시성
- 출금 차단 트리거는 작동하지만, 사용자에게 "당신 계정이 24h freeze 상태이며 N시에 자동 해제" 라는 **배너/토스트가 없음**
- 관리자에서 freeze 목록·수동 해제 UI 없음

### Gap 5. Lighthouse 100×4 실측 미보유
- brotli/modulePreload는 적용했지만 **실측 점수 리포트가 없음**
- LCP < 1.0s 목표 검증 안 됨, hero 이미지 AVIF/preload, font-display:swap 미적용

### Gap 6. SEO/메타 강화 여지
- `/trust` 외 메인 페이지들의 OG 이미지·meta description 일관성 점검 필요
- `sitemap.xml`이 정적 — 동적 페이지 미포함

### Gap 7. 보안 회귀 테스트
- `policy_assertions`는 있지만 신규 추가된 `account_freezes`, `webhook_*`, `spans`, `chaos_runs` 테이블에 대한 RLS 어서션이 미등록

---

## 🎯 추천 다음 작업 (우선순위 순)

### F. **Admin Observability Cockpit** (Gap 1+2+4 통합)
- 관리자 페이지에 4개 탭 추가:
  1. **Slow Requests Top 20** (`slow_requests_top()` 호출, P95/Avg/Max 차트)
  2. **Webhook Subscriptions** (등록/회전/최근 전송 로그)
  3. **Account Freezes** (활성 freeze 목록, 수동 해제 버튼 + admin_audit_log 기록)
  4. **Chaos History** (최근 30일 실행 결과 + 실패 probe drill-down)
- 클라이언트 라우팅에 `record_span()` RPC 호출 인스트루먼트 → 실제 데이터 유입

### G. **End-to-End Self-Healing Loop**
- `chaos-probe` 실패 → `anomaly_events`에 critical 적재 → 기존 `auto_freeze_critical_anomalies` 트리거 → freeze
- Trust 페이지 "실패 사유" 공개 (transparency)
- 사용자 freeze 배너 + 카운트다운 (Realtime 구독)

### H. **Policy Assertions 확장**
- 신규 테이블 7종에 대한 RLS 어서션 추가:
  - `account_freezes`: anon SELECT 차단, 본인 SELECT 허용
  - `webhook_subscriptions`/`deliveries`: anon 전 권한 차단
  - `spans`/`chaos_runs`: anon 전 권한 차단
  - `idempotency_keys`: anon 전 권한 차단
- 일일 cron이 자동 검증 → 회귀 발생 시 anomaly로 알림

### I. **Lighthouse 100 실측 + LCP < 1.0s**
- hero 이미지 AVIF + `<link rel="preload" as="image">`
- `font-display: swap` 적용 검증
- 라우트별 코드 스플리팅 (`React.lazy` + `Suspense`)
- CI에 Lighthouse 자동 측정 (선택)

### J. **SEO 끝판왕**
- `sitemap.xml` 동적 생성 엣지(`sitemap-xml`) — Trust, public 페이지 자동 포함
- 페이지별 OG 이미지 (Open Graph)
- 구조화 데이터 (`Organization`, `WebSite`, `BreadcrumbList`) JSON-LD

---

## 결론

지금까지의 A~E 5트랙은 **인프라/백엔드 100% 완성** 상태입니다. 다만 운영자/사용자가 그 가치를 **실제로 보고 쓸 수 있는 UI 회로**가 빠진 부분이 7개 Gap으로 남아 있습니다.

다음 한 턴에 **F + G + H** (관제 콕핏 + 자가치유 회로 + 정책 회귀 테스트)를 묶어서 진행하면 진정한 의미의 "끝판왕" 상태에 도달합니다. I, J는 그 다음 단계로 분리하는 것을 권장합니다.

진행 의향 알려주시면 F+G+H를 한 번에 마감하겠습니다.