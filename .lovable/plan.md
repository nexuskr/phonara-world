# Hybrid Prerender — Phonara v15.2

React SPA(Vite) 위에 **공개 라우트 정적 HTML 프리렌더** 레이어를 얹어 SEO·LCP·AI 크롤러 친화성을 끌어올린다. 보호 라우트(지갑/출금/관리자 등)는 CSR 그대로 유지하여 머니플로 8경로 / Operator Isolation / Bundle Budget / Realtime Partition / Active Governor를 **단 1바이트도 변경하지 않는다.**

## 적용 범위

### Prerender (정적 HTML 생성)
- `/` (랜딩)
- `/trust`
- `/legal/terms`, `/legal/privacy`
- `/status`
- `/vip`
- `/empire` (공개 카운트만, 좌석 RPC 호출 X)
- `/founding-seat` (있다면 공개 부분만)
- `/about` (없으면 신규 만들지 않음 — 기존 라우트만 대상)

### CSR 유지 (절대 prerender 금지)
- `/wallet`, `/deposit`, `/withdraw`, `/pay`
- `/crash`, `/live`, `/trading-*`, `/casino/*` (실시간/세션 의존)
- `/admin/*`, `/cockpit*`, `/dev/*`
- `/auth`, `/auth/*`, `/security/*`, `/dashboard`, `/empire/my-seat`, `/empire/collection`
- 로그인 이후 모든 페이지

### 보안 룰
- Prerender 단계에서는 **공개 RPC만** 호출 가능 (anon key, RLS public). 호출 실패 시 placeholder로 빌드 통과.
- 응답 본문에 `auth.uid`, JWT, 출금 내역, 관리자 데이터 절대 포함 금지 → 빌드 후 `scripts/check-prerender-leak.mjs`가 grep 검사 (실패 시 빌드 실패).
- `window.__INITIAL_DATA__`는 **공개 데이터에 한해서만** 임베드.

## 구현 (기술 섹션)

### 1. 패키지 선택
`react-snap` 또는 `vite-plugin-prerender-spa` 같은 무거운 SSR 프레임 도입은 React Router v6 + HelmetProvider 구조를 깨뜨릴 위험이 큼. 대신:

- **`vite-plugin-prerender`** (puppeteer 기반, 라우트별 정적 HTML 후처리) 채택.
  - 기존 `vite build` 산출물을 그대로 두고 라우트별 `dist/<route>/index.html`만 추가 생성.
  - SPA 진입점(`dist/index.html`)은 변경되지 않음 → SPA fallback / Vercel rewrites 무손상.
  - React Helmet Async는 클라이언트 mount 시점에 head를 채우므로 puppeteer가 그대로 캡처 가능.

### 2. 새 파일
- `scripts/prerender.mjs` — puppeteer로 PUBLIC_ROUTES 순회, `dist/<route>/index.html` 저장.
- `scripts/check-prerender-leak.mjs` — 생성된 HTML에 금칙어(`access_token`, `refresh_token`, `withdraw`, `admin_`, `service_role` 등) grep.
- `src/lib/prerender.ts` — `isPrerender()` 헬퍼 (`navigator.userAgent.includes("phonara-prerender")`). 컴포넌트가 호출하여 prerender 단계에서는 인증/실시간/머니플로 훅 스킵.

### 3. 수정 파일 (최소)
- `package.json`
  - `"build:prerender": "vite build && node scripts/prerender.mjs && node scripts/check-prerender-leak.mjs"` 스크립트 추가.
  - puppeteer를 `devDependencies`에 추가.
- `vercel.json`
  - 기존 SPA rewrite 규칙 앞에 prerender된 라우트들이 자연스럽게 매칭되도록 정적 파일 우선순위 확인(이미 `.*\..*` 제외 규칙 있어서 추가 변경 불필요 — 확인만).
- `.github/workflows/bundle-budget.yml`
  - 기존 `npm run build` 뒤에 `build:prerender` 잡 추가 (별도 job, fail-fast).
- `src/main.tsx`
  - 변경 없음 — prerender 중에도 동일 진입점 사용. `isPrerender()`로 분기는 *훅 내부에서만* 수행.

### 4. 절대 변경 금지
- `src/packages/wallet/**`, `src/packages/risk/**`, money-flow 8경로
- `src/packages/operator/**`, `src/pages/admin/**`, vite `manualChunks` operator 룰
- `src/packages/realtime/**`
- `src/lib/sounds/**`, `src/lib/sound/**`
- `size-limit.config.json` 예산값

### 5. 검증
1. `npm run build:prerender` → `dist/index.html`, `dist/trust/index.html`, `dist/legal/terms/index.html` 등 생성 확인.
2. `scripts/check-prerender-leak.mjs` PASS.
3. `scripts/check-operator-isolation.mjs` PASS (불변).
4. `scripts/check-money-flow-freeze.mjs` git diff = 0줄.
5. JS OFF 상태에서 `/`·`/trust` 정적 콘텐츠 풀-렌더 확인.
6. Lighthouse `/` 모바일 Performance ≥ 90, LCP ≤ 1.2s 목표 (현재 lighthouserc warn threshold 유지).
7. 로그인 후 `/wallet`, `/admin` 동작 회귀 없음.

### 6. 롤백
`build:prerender`만 안 돌리면 기존과 100% 동일. 신규 파일 3개 + package.json script 1줄 + workflow job 1개만 제거하면 완전 원복.

## 배포

별도 인프라 변경 없음. Vercel은 `dist/` 그대로 서빙하며 prerender된 경로는 정적 HTML이, 나머지는 SPA fallback이 처리.

## 비고

- "build:prerender → 메인 build 대체"는 1단계에서는 하지 않는다. **opt-in 빌드 스크립트**로 시작 → CI에서 1주 안정성 확인 후 다음 PR에서 기본 `npm run build`에 통합.
- 신규 라우트(`/about` 등)는 만들지 않는다 — 사용자가 명시한 "있다면"에 한정.
