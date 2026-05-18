import { Page, expect } from "@playwright/test";

/** rAF 기반 FPS 측정 (5초 평균) */
export async function measureFps(page: Page, durationMs = 2000): Promise<number> {
  return page.evaluate(async (d) => {
    return new Promise<number>((resolve) => {
      let frames = 0;
      const start = performance.now();
      function tick() {
        frames++;
        if (performance.now() - start < d) requestAnimationFrame(tick);
        else resolve((frames / (performance.now() - start)) * 1000);
      }
      requestAnimationFrame(tick);
    });
  }, durationMs);
}

export async function expectFps(page: Page, min: number, durationMs = 2000) {
  const fps = await measureFps(page, durationMs);
  expect.soft(fps, `FPS ${fps.toFixed(1)} < ${min}`).toBeGreaterThanOrEqual(min);
}
