import { Page, Locator, expect } from "@playwright/test";

/**
 * Accessible-name 우선 + 한국어 텍스트 fallback selector.
 * 소스 코드 0 변경 정책.
 */
export function findCta(page: Page, names: (string | RegExp)[]): Locator {
  for (const n of names) {
    const byRole = page.getByRole("button", { name: n }).first();
    return byRole;
  }
  return page.locator("button").first();
}

/** 터치 타깃 최소 사이즈 검증 (Apple HIG 44pt) */
export async function expectTouchTarget(locator: Locator, min = 44) {
  const box = await locator.boundingBox();
  expect(box, "터치 타깃 boundingBox 없음").not.toBeNull();
  if (box) {
    expect.soft(box.width, "터치 타깃 너비 < 44px").toBeGreaterThanOrEqual(min);
    expect.soft(box.height, "터치 타깃 높이 < 44px").toBeGreaterThanOrEqual(min);
  }
}
