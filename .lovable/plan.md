# Hybrid Prerender (Playwright) — Phonara v15.2

React SPA(Vite) 위에 **공개 라우트 정적 HTML 프리렌더** 레이어를 얹어 SEO·LCP·AI 크롤러 친화성을 끌어올린다. 보호 라우트는 CSR 그대로. 머니플로 8경로 / Operator Isolation / Realtime Partition / Active Governor / Bundle Budget / sound 시스템 **단 1바이트도 변경 없음.**

## 라우트 분리

### Prerender (정적 HTML)
- `/`
- `/trust`
- `/legal/terms`, `/legal/privacy`
- `/status`
- `/vip`
- `/empire` (공개 카운트만, 좌석 RPC 호출 X)

### CSR 유지 (절대 prerender 금지)
- `/wallet`, `/deposit`, `/withdraw`, `/pay`
- `/crash`, `/live`, `/casino/*`, 트레이딩 아레나
- `/admin/*`, `/cockpit*`, `/dev/*`
- `/auth*`, `/security/*`, `/dashboard`, `/empire/my-seat`, `/empire/collection`
- 로그인 이후 모든 페이지

## 구현 (기술 섹션)

### 1. 도구
- **Playwright** (`playwright` + `@playwright/test`, devDependencies). puppeteer 대비 headless 안정성·자동 브라우저 다운로드·CI 친화.

### 2. 신규 파일

**`scripts/prerender.mjs`**
- `vite preview` 또는 정적 서버(http-server)를 임시로 띄움 (포트 4173).
- Playwright chromium headless로 PUBLIC_ROUTES 순회.
- 페이지별:
  - User-Agent = `Mozilla/5.0 phonara-prerender/1.0`
  - timeout = 15000ms, retry 최대 2회
  - `page.on("pageerror")` / `console.error` 발생 시 해당 라우트 실패로 기록 → 1건이라도 있으면 exit 1
  - `networkidle` 대기 후 `document.documentElement.outerHTML` 캡처
  - `dist/<route>/index.html` 저장 (`/`는 dist/index.html 덮어쓰기 X, 대신 `dist/index.html`은 SPA fallback용으로 보존하고 prerender는 `dist/__prerender__/index.html` 또는 라우트별 폴더로 저장 — Vercel rewrite 패턴이 정적 파일을 우선 매칭하므로 `dist/trust/index.html` 식으로 폴더 생성)
  - `/`만 예외: `dist/index.html`을 prerender 결과로 덮어쓴다 (SPA fallback은 동일 파일이므로 안전 — 클라이언트 hydration 시 React Router가 정상 동작).
- 종료 시 `reports/prerender-report.json` 생성: `{ generatedAt, routes: [{ path, ms, bytes, status, retries }], summary }`.

**`scripts/check-prerender-leak.mjs`**
- 금칙어: `access_token`, `refresh_token`, `service_role`, `secret`, `password`, `private_key`, `withdraw_pin`, `admin_`, `Bearer `, `eyJ` (JWT prefix 휴리스틱, anon key는 화이트리스트 예외 처리).
- prerender 산출 HTML들만 스캔(추적: `reports/prerender-report.json`의 routes).
- 1건이라도 매칭 시 라인+컨텍스트 출력 후 exit 1.

**`src/lib/prerender.ts`**
```ts
export const isPrerender = () =>
  typeof navigator !== "undefined" &&
  navigator.userAgent.includes("phonara-prerender");
export const isPrerenderBuild = () =>
  typeof window !== "undefined" && (window as any).__PHONARA_PRERENDER__ === true;
```
- 컴포넌트/훅은 자체적으로 `if (isPrerender()) return placeholder;` 분기 — **money-flow/realtime/auth 훅은 직접 수정하지 않는다**. 대신 그것들을 호출하는 *공개 페이지 컴포넌트 진입부*에서만 가드. 머니플로 8경로 파일은 git diff = 0줄 유지.
- 우려되는 호출이 있는 공개 페이지가 있다면 해당 페이지 최상단에서 早期 return으로 정적 마크업만 렌더 (Trust/Empire는 이미 공개 RPC만 사용 → 변경 최소).

### 3. 수정 파일 (최소 surface)

**`package.json`**
- devDependencies: `playwright`, `@playwright/test`, `serve` 추가.
- scripts:
  - `"build:prerender": "vite build && node scripts/prerender.mjs && node scripts/check-prerender-leak.mjs"`
  - `"preview:prerender": "serve dist -s -l 4173"`

**`.github/workflows/bundle-budget.yml`** (또는 별도 `prerender.yml` 신설 — 기존 잡 무변경 우선이면 후자)
- 신규 job `prerender`:
  - `runs-on: ubuntu-latest`
  - needs: `build` (있다면). fail-fast: false.
  - steps: setup-node → `npm ci` → `npx playwright install --with-deps chromium` → `npm run build:prerender` → upload `reports/prerender-report.json` artifact.

### 4. 절대 변경 금지
- `src/packages/wallet/**`, `src/packages/risk/**`, money-flow 8경로 (`scripts/check-money-flow-freeze.mjs` 통과)
- `src/packages/operator/**`, `src/pages/admin/**`, vite `manualChunks` operator 룰
- `src/packages/realtime/**`, `@pkg/realtime` 4-파티션
- `src/lib/sounds/**`, `src/lib/sound/**`
- `size-limit.config.json`
- `src/integrations/supabase/client.ts`, `src/integrations/supabase/types.ts`, `.env`, `supabase/config.toml`

### 5. 검증
1. `npm run build:prerender` 성공 → `dist/trust/index.html` 등 생성.
2. `check-prerender-leak.mjs` PASS (금칙어 0건).
3. `scripts/check-operator-isolation.mjs` PASS.
4. `scripts/check-money-flow-freeze.mjs` git diff = 0.
5. `npm run preview:prerender` → JS OFF로 `/`, `/trust` 풀-렌더 확인.
6. Lighthouse `/` 모바일 ≥ 90, LCP 개선.
7. 로그인 후 `/wallet`, `/admin/*` 정상 동작 (CSR 회귀 0).

### 6. 롤백
신규 파일 3개 + package.json scripts 2줄 + CI job 1개 + `src/lib/prerender.ts` 만 제거하면 100% 원복. 기존 `npm run build`는 그대로 작동(opt-in 스크립트).

## 배포

Vercel `dist/` 그대로 서빙. 정적 HTML이 존재하는 경로는 정적이, 나머지는 SPA fallback. `vercel.json` 변경 없음 (rewrite 정규식이 이미 파일 우선).

## 비고

- 1단계는 opt-in. CI 1주 안정성 확인 후 후속 PR에서 기본 `npm run build`에 합칠지 결정.
- 신규 라우트(`/about` 등)는 만들지 않음 — 기존 공개 라우트만 대상.
- Helmet은 클라이언트 mount 후 head를 갱신하므로 Playwright의 `networkidle` 캡처 시점에 SEO 메타가 정상 반영됨.
