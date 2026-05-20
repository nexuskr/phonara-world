# PROJECT X-RAY — Phonara / ApexForge CTO 감사 보고서

> 수집 범위: 코드베이스 + Supabase DB(읽기) + 최신 bundle/entropy/security 리포트 + git 히스토리(메모리).
> 수집 불가: Vercel 배포 메트릭(외부 호스팅 미사용, Lovable Cloud 호스팅) — **추가 접근 권한 필요**. 운영 RUM/Sentry 데이터 부재.

---

## A. 프로젝트 구조 요약

| 항목 | 수치 |
|---|---|
| 스택 | Vite 5 + React 18 + TS5 + Tailwind3 + shadcn + Framer Motion + Zustand + TanStack Query |
| 페이지 (pages/) | **132** |
| 컴포넌트 (components/) | **561** |
| 훅 (hooks/) | **84** |
| App.tsx 라우트 | **152** |
| Supabase 마이그레이션 | **312** |
| public.테이블 | **331** |
| RLS 정책 | **492** (RLS 비활성 테이블: 0) |
| SECURITY DEFINER 함수 | **657** |
| Edge Functions | **75+** |
| 패키지 모노레포 | `@pkg/*` 10개 (core/ui/wallet/earn/game-engine/trade/live/avatar-nft/referral/analytics + operator/realtime/performance/telemetry/runtime) |
| i18n | ko/en/ja/vi/es/pt/zh — locale chunk split |
| 호스팅 | Lovable Cloud (Supabase managed) — Vercel 미사용 |

**아키텍처 등급(구조만):** 상위 0.1%. 일반 Lovable 프로젝트와 비교 자체가 무의미한 수준.

핵심 가드레일이 이미 가동 중:
- `manualChunks`로 operator 청크 완전 격리, `modulePreload.resolveDependencies`로 Layer 1 차단
- `bundle-budget.mjs` + `size-limit` CI (index 180KB / operator 400KB / slots 120KB)
- ESLint: `no-direct-sonner`, `no-raw-channel`, dependency-cruiser 레이어 경계
- `check-money-flow-freeze.mjs` — 머니플로 8경로 git diff=0 강제
- `check-operator-isolation.mjs` — user 번들에 admin 코드 누출 검출
- 5축 realtime 파티션(`region:partition:resource`) + 단일 진입점

---

## B. 위험도 TOP 20

| # | 위험 | 영역 | 심각도 | 즉시성 |
|---|---|---|---|---|
| 1 | `/lounge` framer-motion 무한 애니메이션 누적 (Layout 525ms / Recalc 200ms / 9s) | 성능 | 🔴 High | 즉시 |
| 2 | 30+ `setInterval` 중 visibility 가드 누락 다수(`LiveStats`, `Cockpit`, `admin/*`) — 백그라운드 탭 RPC 폭주 → Supabase 비용 직격 | 비용/성능 | 🔴 High | 즉시 |
| 3 | `GodModePanel` 이중 채널 구독(빈 useRealtimeChannel + raw supabase.channel) | 안정성 | 🟠 Mid | 즉시 |
| 4 | 657개 SECURITY DEFINER 함수 — `function_permissions_baseline` + `check_permission_drift()`로 통제 중이나 단일 함수 오버로딩 1개 누락시 권한상승 가능 | 보안 | 🟠 Mid | 모니터 |
| 5 | 백엔드 rate limit 부재(메모리 `no-backend-rate-limiting`로 의도적 보류) — 봇 공격/RPC 스팸 무방비 | 보안/비용 | 🔴 High | 출시 전 필수 |
| 6 | 312개 마이그레이션 누적 — 신규 인스턴스 부트스트랩 시간/실패 위험 | 운영 | 🟡 Low | 분기별 squash |
| 7 | i18n.ts dev 빌드 120KB(prod는 locale-chunk split됨) — dev 환경 LCP 7.6s | DX | 🟡 Low | 선택 |
| 8 | Lounge에 동시 마운트된 마키류(`LiveRankingMarquee`/`FomoNotificationStrip`/`WhaleStrikeRail`/`CrownAura`) 4종 GPU 누적 | UX/배터리 | 🟠 Mid | 즉시 |
| 9 | Edge Function 75+ 콜드 스타트 — 한국 트래픽 + 다중 cron(1m/5m/15m) 동시 기상 시 동시성 한도 | 운영 | 🟠 Mid | 측정 후 |
| 10 | Realtime 채널 수 — 사용자당 4파티션 × 5리전 → 동접 1만 시 채널 수 폭증 가능 | 인프라 | 🟠 Mid | 부하 테스트 필요 |
| 11 | `imperial_treasury_ledger` 등 머니플로 8경로 git diff=0 정책 — 보호장치는 강력하나 한 번의 실수가 자금 사고로 직결 | 자금 | 🔴 High | 영구 |
| 12 | 132개 페이지 — IA 인지부하 / SEO 사이트맵 비대 (오늘 IA 재설계 진행 중) | UX/SEO | 🟠 Mid | 진행중 |
| 13 | Push VAPID 키 — `.env.example`에만 (선택) — 미설정 시 postMessage fallback. 운영 환경 설정 확인 필요 | 운영 | 🟡 Low | 확인 |
| 14 | 게임/사행성 요소 다수(`apex/`, `casino/`, `imperial-duel`) — 법규 리스크(KR/JP/VN 등 시장별) | 컴플라이언스 | 🔴 High | 법무 검토 |
| 15 | `pixi.js@8` + `three@0.160` + `@react-three/*` 동시 탑재 — 게임/아바타 페이지에서 GPU 메모리 부담 | 성능 | 🟠 Mid | 측정 |
| 16 | `apex-vrf-oracle` v1/v3 병존 — 폐기 시점 미정 시 검증 경로 혼선 | 게임 무결성 | 🟠 Mid | v1 deprecate |
| 17 | `triage.2026-05-17.json` 15KB — 미처리 항목 잔존 가능 | 위생 | 🟡 Low | 리뷰 |
| 18 | 312 migrations 중 RLS 정책 변경 이력 — 회귀 위험. `db-permissions` CI는 비차단(`continue-on-error: true`) | CI | 🟠 Mid | 차단 전환 권고 |
| 19 | 5개 kill switch + 다단 freeze — 사용자 페이지에서 freeze 상태 인지 가능성/UX 폴백 점검 필요 | UX | 🟡 Low | UX QA |
| 20 | LCP 이미지 preload 없음(`/index.html`), Pretendard render-blocking | 코어 웹 바이탈 | 🟡 Low | 즉시 가능 |

---

## C. 즉시 수정해야 하는 항목 (이번 주)

1. **GodModePanel 빈 채널 구독 제거** (`src/components/admin/GodModePanel.tsx:80-114`) — 1줄 삭제 + presence 예외 메모리 명시.
2. **공통 헬퍼 `setVisibleInterval` 누락 사이트 일괄 적용**: `LiveStats.tsx:56`, `LiveRanking.tsx:91`, `Trust.tsx:46`, `Cockpit.tsx:98`, `useImperialState:80`, `Empire.tsx:45`, `Whales.tsx:39`, `WarTradingArena:53`, `admin/Cockpit:83`, `admin/Revenue:50`, `admin/Kpi:97`, `admin/CockpitV2:163`. 헬퍼는 이미 `@pkg/runtime`에 있음 — bind만 교체.
3. **Lounge 페이지 IntersectionObserver 기반 애니 일시정지 표준화** + `prefers-reduced-motion` 가드.
4. **`db-permissions` CI `continue-on-error: false` 전환** (적어도 RLS 회귀 테스트만이라도).
5. **LCP 이미지 preload + Pretendard async** — `index.html` 2줄.

---

## D. 성능 개선 TOP 10

| # | 항목 | 예상 효과 |
|---|---|---|
| 1 | Lounge 무한 애니 IntersectionObserver pause | Recalc 200ms → 50ms |
| 2 | `setVisibleInterval` 일괄 적용 | 백그라운드 RPC -70% |
| 3 | LCP 이미지 preload + fetchpriority="high" | LCP -800ms |
| 4 | Pretendard `media="print" onload` | FCP -300ms |
| 5 | three3d 청크 lazy 가드 강화(Avatar/Lobby 외 차단) — 이미 차단 중, 검증 추가 | regression 방지 |
| 6 | Dashboard `Suspense` 분할 (현재 22개 lazy + 6 LazyMount 한 Suspense) | 하나 서스펜드 시 전체 대기 제거 |
| 7 | i18n locale 동적 import(이미 split) 검증 + ja/vi preload 차단(이미 적용) — 모니터링만 | - |
| 8 | `lucide-react` named-only import 검증(CI) | -30~50KB |
| 9 | TanStack Query `staleTime` 글로벌 검토 (현재 RPC 60s 폴링과 중복 가능) | 네트워크 -20% |
| 10 | Edge Function 콜드스타트 핫패스 사전 워밍 (cron 1m으로 keep-alive) | TTFB -200ms |

---

## E. 보안 위험 TOP 10

| # | 항목 | 상태 | 조치 |
|---|---|---|---|
| 1 | RLS 누락 테이블 | **0건** ✅ | 유지 |
| 2 | 인증 없는 SELECT 정책(`USING(true)`) | 최근 4건 제거 ✅ | 유지 |
| 3 | SECURITY DEFINER 권한 상승 | baseline + drift detection ✅ | 신규 함수 추가 시 baseline 갱신 강제 |
| 4 | 백엔드 rate limit | **부재** 🔴 | Edge Function 단에서 IP + auth.uid 기반 토큰버킷(Redis 없으면 KV/postgres) |
| 5 | 출금 스텝업(AAL2 + OTP) | ✅ 강제 | 유지 |
| 6 | 새 디바이스 감지 | ✅ `user_devices` + anomaly | 유지 |
| 7 | 출금 velocity 자동 동결 | ✅ 10분 3건/1시간 5건 | 유지 |
| 8 | XSS — 사용자 입력 렌더 | React 자동 escape, `dangerouslySetInnerHTML` 검사 필요 | grep 권고 |
| 9 | CSRF | Supabase JWT 헤더 기반 — 안전 | - |
| 10 | API 키 노출 | publishable key만 frontend, service role은 edge only ✅ | 유지 |

---

## F. UX 개선 TOP 10

1. **132 페이지의 IA 단순화** (오늘 진행 중 — Mobile 5탭 + PC 사이드바). 끝까지 가야 함.
2. **첫 방문 3초 이해** — `/` Hero가 "무엇을 하는 곳인지" 5단어로 즉시 전달되는지 카피 검토.
3. **CTA 우선순위 1개로 압축** — 현재 ApexForge/대관전/Earn/Trade 다중 CTA 경쟁.
4. **신뢰 시그널 above-the-fold**: 최근 출금 ticker + Trust 배지 + 라이브 카운터.
5. **첫 입금 전 Practice Mode 강제 권유** (이미 PracticeModeBanner 존재 — 노출 시점 강화).
6. **온보딩 60s 플로우** 이미 있음(`@pkg/earn/Onboarding60s`) — 1주 데이터로 step별 이탈 측정 필요.
7. **FOMO 과잉 점검** — Whale rail + VIP arrival + Live counter + Marquee 동시 노출 시 인지 폭주.
8. **모바일 한손 도달 영역**(엄지 zone)에 결제/베팅 CTA 배치 — 현재 Bottom Nav 5탭 재설계로 해결중.
9. **에러/빈상태 통일** — `@/components/ui/empty-state`/`loading-state`/`@/lib/notify` 표준 이미 있음. 잔존 인라인 검사.
10. **다국어 첫방문 자동감지** 적용중 — landing별 카피 톤 점검(KR=강력 FOMO, JP=신뢰, VN=수익률).

---

## G. 비용 폭증 위험

| 트리거 | 메커니즘 | 예상 비용 임팩트 |
|---|---|---|
| 백그라운드 탭 setInterval 누수 | 30+ 사이트 × 30~60s × 활성 탭 | **분당 600+ RPC** (사용자 100명 기준) → Supabase egress + DB CPU |
| 75+ Edge Function | cron 1m/5m/15m 동시 실행 | 동시성 한도 + 시간당 호출 비용 |
| Realtime 5리전 × 4파티션 | 사용자당 채널 수 증가 | 동시연결 한도 도달 시 추가 비용 |
| AI Gateway(emperor-coach 등) | 일일 브리핑/추천 | gpt-5/gemini-2.5-pro 호출 누적 |
| Storage(OG card / receipt OCR) | 자동 생성 누적 | 정리 cron 필요 |
| 312 migrations 백업 | Supabase point-in-time | 인스턴스 사이즈 의존 |

**즉시 대응:** B-2(setVisibleInterval) → 비용 70% 즉시 절감 가능.

---

## H. 예상 장애 시나리오

1. **Supabase 인스턴스 사이즈 부족** → 트레이딩/출금 타임아웃 → 자동 동결 트리거 폭주 → 사용자 패닉.
   - **대응:** Cloud→Overview→Advanced settings 사전 업스케일 + `cloud_status` 모니터링.
2. **Oracle 소스 일제 staleness** → shadow consensus clamp → 베팅 일시 중단. **대응:** 이미 Oracle Fortress 3-source + shadow mode 가동.
3. **Edge Function 콜드 스타트 폭주(cron 동시 기상)** → 일부 cron 실패 → idempotent 재시도 의존. **대응:** cron 시각 분산(1m/5m/15m 충돌 회피).
4. **Realtime WS 한도 초과** → 신규 연결 실패 → 사용자 "실시간 안됨". **대응:** 부하 테스트로 동접 한도 확인 후 region sharding 강화.
5. **머니플로 8경로 회귀** → 자금 사고. **대응:** `check-money-flow-freeze.mjs` 차단 PR 머지 금지 강제.
6. **법규 차단** (한국 사행성/암호화폐) → 도메인 차단. **대응:** 지역별 Practice Mode 강제 + 법무 사전 검토.
7. **DDoS / 봇 RPC 스팸** → 백엔드 rate limit 부재로 직격. **대응:** 최우선 — Cloudflare/Edge rate limit 도입.

---

## I. 동접 1k / 10k / 100k 예상 병목

| 동접 | 주요 병목 | 대응 |
|---|---|---|
| **1,000** | 거의 무난. Supabase 기본 인스턴스 한도 내. Realtime 채널 ~4k. | 현재 구조 유지 |
| **10,000** | (1) Realtime 채널 수 40k → 사이즈 업 필수. (2) Edge cron 동시성 한도. (3) 백그라운드 탭 RPC가 누적되면 DB CPU. (4) 75+ edge function 콜드스타트. | 인스턴스 ×4 업, setVisibleInterval 일괄, cron 분산, edge 핫패스 keep-alive |
| **100,000** | (1) PostgREST 단일 인스턴스 한계 → read replica 필요. (2) Realtime 채널 100만 → 자체 WS 게이트웨이 검토. (3) AI Gateway 비용. (4) 법규 다중 관할 동시 대응. (5) 자체 호스팅 분리(`phonara-unicorn/` 스캐폴드 활용). | Phase U 가동, multi-region 분리, AI 캐싱, 컴플라이언스 팀 |

---

## J. 출시 가능 여부

### 종합 점수: **78 / 100**

| 영역 | 점수 | 비고 |
|---|---|---|
| 아키텍처 | 95 | 모노레포 + 가드레일 압도적 |
| 보안 | 82 | RLS/AAL2/anomaly 우수, **rate limit 부재**로 감점 |
| 성능 | 70 | 구조는 훌륭, **setInterval 누수 + Lounge 애니**로 감점 |
| UX | 65 | 132 페이지 IA 단순화 진행 중, FOMO 과잉 위험 |
| 운영/관측 | 80 | telemetry/observability 패키지 + Command Center 구축 |
| 컴플라이언스 | 50 | 사행성/암호화폐 법무 미확인 — **블로커** |
| 비용 통제 | 70 | 즉시 대응 가능 |

### 등급: **MVP → Production 전환 직전**

**출시 가능 조건 (블로커):**
1. ✅ ~~RLS 위반 0~~
2. 🔴 **백엔드 rate limit 도입** (24~48h)
3. 🔴 **법무 검토 통과** (관할별 사행성 / KYC / AML)
4. 🟠 즉시 수정 C-1~C-5 적용 (1~2일)

위 4가지 클리어 시 → **Production** 등급.
부하 테스트(동접 10k) 통과 + 자체 호스팅 분리(`phonara-unicorn/` 실배포) 시 → **Scale Ready**.

---

## 다음 단계 제안

이 감사 결과를 바탕으로 다음 중 어느 것을 먼저 실행할지 선택해 주세요:

1. **C. 즉시 수정 5건 일괄 패치** (1 PR, 2시간 내) — 가장 빠른 ROI
2. **백엔드 Rate Limit 설계 + 도입** (Edge Function 토큰버킷, 4~8시간)
3. **Lounge 성능 단독 수술** (애니 IO pause + setVisibleInterval) — 2시간
4. **부하 테스트 시나리오 작성** (k6/Artillery, 동접 10k 시뮬레이션)
5. **컴플라이언스 체크리스트 문서화** (관할별 차단/허용 매트릭스)

> **접근 불가 항목** (추가 권한 필요):
> - Vercel 메트릭 — 미사용(Lovable Cloud)
> - 운영 RUM/Sentry — 미연결
> - 실 트래픽 분석 — `analytics--read_project_analytics` 호출 시 가능
