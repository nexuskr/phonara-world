# Phonara.world — Deployment Checklist (Phase 4 / Launch Ready)

본 문서는 phonara.world 실서비스 배포 시 따라야 할 최종 체크리스트.
Vercel / Cloudflare Pages / Lovable Cloud 호스팅 모두 동일하게 적용.

---

## 0. Pre-flight

- [ ] 모든 환경변수 설정 완료 (`.env.example` 참고)
  - `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`
- [ ] Supabase 마이그레이션 전부 적용 (`supabase/migrations/*` Up to date)
- [ ] `npm run sim:all` PASS (7/7 슬롯 RTP 검증)
- [ ] `function_permissions_baseline` drift 0건 (`SELECT check_permission_drift();`)
- [ ] `npm run build` 성공 + bundle size 회귀 없음 (`reports/bundle-*.html`)

---

## 1. PWA

- [ ] `public/manifest.webmanifest` (+ en/ko/ja/vi 4종) 정상
- [ ] icons 192/512 + maskable 192/512 존재
- [ ] `public/sw.js` 배포 — push + cache 통합
- [ ] `public/offline.html` 존재
- [ ] **iframe / 미리보기 호스트에서는 SW 등록 안 됨** (`src/lib/pwa/registerSW.ts` 가드 동작 확인)
- [ ] Lighthouse PWA 카테고리 전 항목 PASS

배포 직후 production 도메인에서 1회 새로고침 → DevTools Application → Service Workers 에 `/sw.js` 가 `activated` 인지 확인.

---

## 2. SEO

- [ ] `index.html` `<title>` < 60자, `<meta name="description">` < 160자
- [ ] `public/sitemap.xml` 최신 (모든 공개 라우트 포함)
- [ ] `public/robots.txt` 가 sitemap 가리킴
- [ ] OG 이미지 (`/og-image.jpg`) 1200×630
- [ ] `<html lang="ko">` + `hreflang` (en/ko/ja/vi)
- [ ] Single H1 per route

---

## 3. Security

- [ ] RLS 정책 baseline drift 0건
- [ ] AAL2 admin 게이트 동작 (`AdminAal2Gate`) — TOTP 미등록 admin은 강제 등록
- [ ] `request_withdrawal` 스텝업 강제 동작 (TOTP or OTP 10분 내)
- [ ] kill-switch 테스트:
  - `trading_halt` ON → 새 베팅 차단
  - `withdrawals_halt` ON → 출금 RPC 차단
  - `maintenance_mode` ON → 비-admin 점검 화면
- [ ] 보안 헤더 적용 확인 (`vercel.json` / `public/_headers`):
  - `X-Frame-Options: SAMEORIGIN`
  - `Strict-Transport-Security`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`

---

## 4. Monitoring

- [ ] `anomaly_events` realtime 구독 동작 (`/admin/perms`, `/admin/ops/errors`)
- [ ] `error_logs` 적재 정상
- [ ] `oracle_source_health` GREEN (Phase 3 fortress)
- [ ] `monitor_lpi_stuck_reserved` cron 매분 실행 확인
- [ ] `/admin/ops/self-heal` healthcheck 전부 GREEN
- [ ] Web Push VAPID (선택) 키 설정 시 admin 알림 수신 테스트

---

## 5. Performance

- [ ] Lighthouse Mobile ≥ 90 / Desktop ≥ 95
- [ ] LCP 후보 hero 이미지 `<link rel="preload">` 존재
- [ ] `/casino/*` 슬롯 청크 각 < 150KB (gzip)
- [ ] `signature-engine` 공통 청크 1회만 다운로드
- [ ] reduced-motion 환경에서 voice/heavy particle skip

---

## 6. Rollback Plan

긴급 상황 발생 시 다음 순서로 대응:

1. **즉시 차단** (< 30s)
   - `/admin/ops/self-heal` → kill-switch:
     - `trading_halt` ON
     - `withdrawals_halt` ON
   - 해당 사용자에게는 `MaintenanceGate` 자동 노출

2. **이전 빌드로 복귀** (< 2min)
   - Vercel: Project → Deployments → 직전 PASS 빌드 "Promote to Production"
   - Cloudflare Pages: Deployments → 직전 빌드 "Rollback"

3. **DB 롤백 (필요 시)**
   - 새 마이그레이션이 원인이면 down migration 작성 후 적용
   - 데이터 손상이면 PITR (Point-In-Time-Recovery) — Supabase 대시보드

4. **사용자 공지**
   - `<MaintenanceGate>` 메시지 변경 또는 status 페이지 (`/status`) 공지 업데이트

---

## 7. Launch Day Runbook

| 시점 | 작업 | 담당 |
|------|------|------|
| T-24h | Sim regression 최종 PASS, bundle size 확인, kill-switch OFF 확인 | FE/QA |
| T-12h | Supabase 마이그레이션 적용 + `check_permission_drift()` 0건 확인 | BE |
| T-2h  | DNS TTL 단축 (5min), Vercel/CF 빌드 트리거 | DevOps |
| T-1h  | Production 도메인 SW 등록 확인, `/admin/ops/self-heal` 전 GREEN | FE/BE |
| T-30m | 최종 smoke test (가입/입금/베팅/출금 1회) | QA |
| T-0   | 공식 발표 + `<WhaleStrikeRail>` 활성, monitoring 화면 상시 노출 | All |
| T+1h  | error_logs / anomaly_events 모니터링, 첫 1시간 KPI 캡처 | Ops |
| T+24h | RTP 실측 vs Sim 비교, 출금 SLA 점검, NPS 피드백 수집 | All |

---

## 8. Post-Launch

- 매주 월요일: Guild 정산 cron 실행 확인 (`settle_guild_weekly`)
- 매일 06:00 KST: AI Coach 브리핑 cron 확인
- 매일 10:00 KST: Reactivation 캠페인 cron 확인
- 매월 1일: function permission baseline 정기 검토

---

**Trump급 완성도 + Musk급 배포 속도. Phonara.world is launch-ready.**
