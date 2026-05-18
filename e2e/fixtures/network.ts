import { Page } from "@playwright/test";

/** Worker 강제 OFF — main-thread fallback 검증용 */
export async function disableWorkers(page: Page) {
  await page.addInitScript(() => {
    // @ts-expect-error overwrite
    window.Worker = undefined;
  });
}

/** 네트워크 오프라인 */
export async function goOffline(page: Page) {
  await page.context().setOffline(true);
}
export async function goOnline(page: Page) {
  await page.context().setOffline(false);
}

/** CPU throttle (low-end 시뮬레이션) */
export async function throttleCPU(page: Page, rate = 4) {
  const client = await page.context().newCDPSession(page);
  await client.send("Emulation.setCPUThrottlingRate", { rate });
}

/** Slow 3G */
export async function slow3G(page: Page) {
  const client = await page.context().newCDPSession(page);
  await client.send("Network.enable");
  await client.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 400,
    downloadThroughput: (400 * 1024) / 8,
    uploadThroughput: (400 * 1024) / 8,
  });
}
