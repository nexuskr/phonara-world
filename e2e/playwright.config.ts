import { defineConfig, devices } from "@playwright/test";

/**
 * Phonara E2E — Sovereign Defense Protocol (Phase 0)
 *
 * Imperial Empire 불변 원칙:
 * - Operator Isolation: src/**, supabase/**, vitest 영역 완전 차단
 * - Money-flow guard: mock-supabase.ts 의 MONEY_FLOW_RPCS 8경로 호출 시 즉시 fail
 * - Mobile-first: 기본 프로젝트 = iPhone 13 단일 (8 specs × 1 project = 8 tests)
 * - 1인 운영자 5분 점검: `bun run e2e` 한 줄
 *
 * 추가 프로젝트는 옵트인:
 *   bun run e2e -- --project=mobile-android
 *   bun run e2e -- --project=mobile-lowend
 *   bun run e2e -- --project=mobile-reduced-motion
 *   bun run e2e -- --project=desktop
 */

const BASE_URL =
  process.env.PHONARA_E2E_BASE_URL ||
  "https://id-preview--c7a12cd6-13f6-4ce6-bf31-cc578b215a4b.lovable.app";

export default defineConfig({
  testDir: "./tests",
  testMatch: /.*\.spec\.ts$/,
  testIgnore: [
    "**/node_modules/**",
    "**/src/**",
    "**/supabase/**",
    "**/*.disabled.*",
  ],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 4 : 2,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-report" }],
    ["./reporters/ko-reporter.ts"],
    ...(process.env.SLACK_WEBHOOK_E2E
      ? ([["./reporters/slack-notify.ts"]] as const)
      : []),
  ],
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    video: "retain-on-failure",
    screenshot: "only-on-failure",
    actionTimeout: 8_000,
    navigationTimeout: 15_000,
    locale: "ko-KR",
    timezoneId: "Asia/Seoul",
  },
  projects: [
    // 기본: iPhone 13 (mobile-first). bun run e2e 시 이것만 실행됨.
    {
      name: "mobile-ios",
      use: { ...devices["iPhone 13"], hasTouch: true },
    },
    // 옵트인 프로젝트들
    {
      name: "mobile-android",
      use: { ...devices["Pixel 7"], hasTouch: true },
    },
    {
      name: "mobile-lowend",
      use: {
        ...devices["Pixel 5"],
        viewport: { width: 360, height: 640 },
        hasTouch: true,
      },
    },
    {
      name: "mobile-reduced-motion",
      use: {
        ...devices["iPhone 13"],
        hasTouch: true,
        reducedMotion: "reduce",
      },
    },
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 720 },
      },
    },
  ],
});
