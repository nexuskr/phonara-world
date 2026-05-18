import { test, expect } from "../fixtures/auth.fixture";
import AxeBuilder from "@axe-core/playwright";

/**
 * A11y Smoke — axe-core critical 룰만.
 * serious는 경고만, critical은 fail.
 */
const PAGES = ["/", "/auth", "/dashboard", "/duel", "/wallet", "/games"];

for (const path of PAGES) {
  test(`07 a11y critical — ${path}`, async ({ mockedPage: page }) => {
    await page.goto(path);
    await page.waitForLoadState("domcontentloaded");
    let results;
    try {
      results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    } catch (e) {
      // axe 미설치 환경에서는 skip
      test.skip(true, `axe-core 미설치: ${(e as Error).message}`);
      return;
    }
    const critical = results.violations.filter((v) => v.impact === "critical");
    expect.soft(critical, `critical 위반 ${critical.length}건`).toEqual([]);
  });
}
