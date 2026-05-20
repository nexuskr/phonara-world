# Phase 3 Final Close-Out

남은 4가지 작업으로 Phase 3를 완전 종료한다. 머니플로 8경로 git diff = 0, House Edge §6 0 터치, Layer 1 gz ≤ 180KB 유지.

## 1. App 라우트 등록 (`src/App.tsx`)
- `const ApexRace = lazy(() => import("./pages/apex/Race.tsx"))`
- `const ApexCashout = lazy(() => import("./pages/apex/Cashout.tsx"))`
- `/apex` 그룹에 `race`, `cashout` Route 2개 추가 (Health 위)

## 2. pg_cron 등록 (supabase--insert)
- `apex-race-settler` — `*/5 * * * *`
- `apex-withdraw-processor` — `*/5 * * * *`
- 각 작업: `net.http_post` → `https://ketlqzfaplppmupaiwft.supabase.co/functions/v1/<fn>`, apikey = anon
- 마이그레이션 아닌 insert 도구 사용 (URL/anon 포함이라 remix 안전)

## 3. Health Perf 탭 (`src/pages/apex/Health.tsx`)
- 기존 "Tier S 60s 벤치마크" 카드 아래에 3 row 카드 추가:
  - Race: 활성 race 수 + 24h 정산 평균 시간
  - Cashout: 24h cashout 처리 + p95 분
  - Mobile: Capacitor present / SW state / cold start
- lazy import 유지, 시각만 (money-flow 무관)

## 4. 최종 검증 + 리포트
- `node scripts/check-money-flow-freeze.mjs` 실행 → 8/8 PASS
- `reports/apex-phase3-final.2026-05-20.json` 업데이트 (라우트/cron/perf row 추가, 최종 지표)
- 최종 선언: `✅ Phase 3 완전 압살 종료. ApexForge 세계 1위 끝판왕 플랫폼 완성`

## 기술 노트
- Route는 ApexShell 자식으로 (`<Route path="race" ...>`, `<Route path="cashout" ...>`)
- cron insert는 자체 SQL 1회 (`cron.schedule(...)` 2건)
- Health 카드의 race/cashout 데이터는 기존 RPC (`apex_get_current_races`, 본인 `apex_withdraw_intents` 집계) 사용, 실패 시 graceful fallback

## Phase 4 시드 (이번 턴 후 제안만)
랜딩 바이럴 / Meta-safe SEO / PWA 강화 / Health Dock 폴리싱 / Tier S 추가 + VRF v2.5 / 글로벌화 — Phase 3 종료 직후 별도 plan으로.
