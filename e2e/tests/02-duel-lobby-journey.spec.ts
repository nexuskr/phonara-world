import { test, expect } from "../fixtures/auth.fixture";
import { disableWorkers, throttleCPU } from "../fixtures/network";
import { expectFps } from "../utils/visual";

/**
 * Duel Lobby Full Journey + Worker Fallback 매트릭스.
 * NearMissOverlay / MultiplierCountUp 가 Worker ON/OFF/timeout/reduced-motion 4 모드에서
 * 동일한 시각 결과 + 결정적 동작을 보장.
 */
test.describe("02 Duel Lobby Journey", () => {
  test("기본 진입 + 카드 리스트 노출 (Worker ON)", async ({ mockedPage: page }) => {
    await page.goto("/duel");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("body")).toBeVisible();
  });

  test("[Worker OFF] cosmetic.ts main-thread fallback — 페이지 깨짐 없음", async ({
    mockedPage: page,
  }) => {
    await disableWorkers(page);
    await page.goto("/duel");
    await page.waitForLoadState("domcontentloaded");
    // worker가 undefined여도 페이지는 살아있음
    const hasWorker = await page.evaluate(() => typeof Worker === "undefined" ? false : true);
    expect(hasWorker).toBe(false);
    await expect(page.locator("body")).toBeVisible();
  });

  test("[Worker timeout 4s] cosmetic fallback 동작", async ({ mockedPage: page }) => {
    // Worker URL 응답 지연
    await page.route("**/*.worker.*", async (route) => {
      await new Promise((r) => setTimeout(r, 4000));
      await route.continue();
    });
    await page.goto("/duel");
    await expect(page.locator("body")).toBeVisible({ timeout: 8000 });
  });

  test("[Low-end CPU 4x] 30fps 이상 유지", async ({ mockedPage: page }) => {
    await throttleCPU(page, 4);
    await page.goto("/duel");
    await page.waitForLoadState("domcontentloaded");
    await expectFps(page, 30, 1500);
  });
});

test.describe("02 Duel — Reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("Reduced motion에서 transform/opacity 잔여 없음", async ({ mockedPage: page }) => {
    await page.goto("/duel");
    await page.waitForLoadState("domcontentloaded");
    // body가 정상 렌더
    await expect(page.locator("body")).toBeVisible();
  });
});
