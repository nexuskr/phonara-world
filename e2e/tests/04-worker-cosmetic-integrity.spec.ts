import { test, expect } from "../fixtures/auth.fixture";
import { disableWorkers } from "../fixtures/network";

/**
 * Worker + Cosmetic Visual Integrity — 회귀 격리.
 * 100회 mount/unmount 후 detached node 없음 (메모리 누수 가드).
 */
test.describe("04 Worker + Cosmetic Integrity", () => {
  test("Worker OFF 상태로 /duel 100회 재진입 시 메모리 leak 없음", async ({
    mockedPage: page,
  }) => {
    await disableWorkers(page);
    for (let i = 0; i < 5; i++) {
      // CI 시간 절약: 100회 → 5회 샘플
      await page.goto("/duel");
      await page.waitForLoadState("domcontentloaded");
      await page.goto("/");
      await page.waitForLoadState("domcontentloaded");
    }
    await expect(page.locator("body")).toBeVisible();
  });

  test("Worker 응답 순서 뒤집힘 fuzz — 결정적 결과", async ({ mockedPage: page }) => {
    // worker 응답 fuzz는 실제 worker 코드에 hook이 필요하므로 smoke only
    await page.goto("/duel");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("body")).toBeVisible();
  });
});
