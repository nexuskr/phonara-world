# Phase 0 E2E 정리 계획 (v20.4)

## 요청 요약
8개 Playwright spec이 `npx playwright test` 한 줄로 "Running 8 tests" 후 초록 통과되도록 설정 정리.

## ⚠️ 먼저 합의가 필요한 충돌 사항

요청 중 **"vitest 관련 모든 의존성 제거 + tsconfig에서 vitest/globals 제거"** 는 현재 프로젝트에서 파괴적입니다:

- `src/test/` 11개 + `src/__tests__/` (duel/flywheel/integration) 가 vitest로 실행 중
- `.github/workflows/db-permissions.yml` 가 `bunx vitest run src/test/rls-integrity.test.ts ...` 를 PR마다 실행 → 머지 차단
- `vitest.config.ts` + `src/test/setup.ts` 가 활성 — 제거 시 RLS / 권한 drift / 플라이휠 시뮬 회귀가 전부 사라짐

**제안 (안전한 대안):** vitest는 그대로 두고 **Playwright 와 vitest 를 완전히 분리**:
- vitest 는 `src/**/*.{test,spec}.{ts,tsx}` 만 본다 (이미 그렇게 설정됨)
- Playwright 는 `./e2e/tests` 만 본다 (testIgnore 로 src 완전 차단)
- `npx playwright test` 는 정확히 8개 spec 만 수집
- 두 러너가 서로 안 보임 → 요청한 격리 효과 100% 달성, 회귀 0건

요청대로 강제로 vitest 를 제거하려면 db-permissions CI / 머니플로 회귀 / 플라이휠 시뮬을 모두 끊겠다는 의미 — 별도 승인 필요. 아래 계획은 **안전한 대안** 기준으로 작성합니다.

## 실행 항목

### 1. `e2e/playwright.config.ts` 재정비
- `testDir: "./tests"` 유지 (이 파일이 `e2e/` 안이라 정확)
- `testIgnore: ["**/src/**", "**/supabase/**", "**/node_modules/**"]` 명시
- 기본 프로젝트를 `mobile-ios` 하나만 (요청: iPhone 13 기준 mobile-first)
- 나머지 4개 프로젝트는 `--project=...` 로 옵트인 — 기본 실행은 8 tests × 1 project = 8 tests
- 한국어 reporter + html report 유지
- baseURL 은 preview URL 그대로

### 2. 루트 `playwright.config.ts` 1줄 re-export 추가 (없으면)
- `npx playwright test` 가 루트에서 동작하도록 `export { default } from "./e2e/playwright.config";`
- 또는 루트에 두지 않고 README 에 `npx playwright test --config=e2e/playwright.config.ts` 명시 — 더 깔끔. 이쪽 채택.

### 3. `package.json` 스크립트 보강 (의존성은 건드리지 않음)
- 추가:
  - `"e2e": "playwright test --config=e2e/playwright.config.ts"`
  - `"e2e:critical": "playwright test --config=e2e/playwright.config.ts --grep @critical"`
  - `"e2e:report": "playwright show-report"`
- devDependencies 에 `@playwright/test` 없으면 추가 (현재 미설치 가능성 → 확인 후 `bun add -D @playwright/test`)
- **vitest / @testing-library 는 그대로 둠** (위 충돌 사항 참조)

### 4. `tsconfig.app.json`
- `"types": ["vitest/globals"]` 유지 (src/test 가 사용 중)
- `"exclude": ["e2e/**"]` 추가 → Playwright 코드가 app tsconfig 에 안 끌림
- e2e 디렉터리에 자체 `e2e/tsconfig.json` 추가 (`types: ["@playwright/test", "node"]`)

### 5. Deno import 처리
- 현재 `e2e/tests/*.ts` 8개 중 `deno.land` import 사용 0건 확인 완료 → 조치 불필요
- 혹시 모를 supabase functions 의 deno 파일은 testIgnore 로 이미 차단됨

### 6. 검증
- `bunx playwright install --with-deps chromium` (1회)
- `bun run e2e` 실행 → "Running 8 tests using 1 worker" 확인
- 실패 spec 은 fixture/selector 수준에서 최소 수정 (페이지 로드 + body visible 기반이라 통과 가능성 높음)
- ko-reporter 가 `🎉 오늘 모바일에서 죽은 곳 없음` 출력하면 완료

### 7. Imperial 불변 원칙 체크
- Operator Isolation: e2e 는 src/admin 미접근, mock 만 사용 ✅
- Money-flow guard: `mock-supabase.ts` 의 `MONEY_FLOW_RPCS` 8개 이미 차단 ✅
- Mobile OS: iPhone 13 기본, hasTouch ✅
- 5분 점검: `bun run e2e` 한 줄 ✅

## 산출물
수정된 3개 파일 (`e2e/playwright.config.ts`, `package.json`, `tsconfig.app.json`) + 신규 `e2e/tsconfig.json` 전문을 마지막에 출력.

## 결정 필요
- **A.** 안전한 대안 (vitest 유지 + 격리) — 권장
- **B.** 강제 제거 (vitest 완전 삭제, db-permissions CI 끊김 감수)

A 로 진행해도 될지 확인 부탁드립니다.
