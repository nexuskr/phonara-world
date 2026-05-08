/**
 * E2E-style i18n smoke tests for conversion surfaces.
 *
 * Validates that PaywallStarter, ExitIntentModal, and UnlockWall render every
 * required i18n key in both KO and EN with no missing strings or hardcoded
 * Korean leakage. Also verifies the touch-target baseline (min-h-[44px] /
 * min-h-[56px]) on every interactive button.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import i18n from "@/lib/i18n";
import PaywallStarter from "@/components/conversion/PaywallStarter";
import ExitIntentModal from "@/components/conversion/ExitIntentModal";
import UnlockWall from "@/components/conversion/UnlockWall";

// Force every conversion flag on so all branches render.
vi.mock("@/lib/conversion-flags", () => ({
  isFlagOn: () => true,
}));
vi.mock("@/lib/telemetry", () => ({
  track: () => Promise.resolve(),
  useTrackView: () => {},
  trackClick: () => Promise.resolve(),
  trackDismiss: () => Promise.resolve(),
  trackConvert: () => Promise.resolve(),
}));
vi.mock("@/lib/analytics", () => ({ track: () => {} }));
vi.mock("@/hooks/use-toast", () => ({ toast: () => {} }));
vi.mock("@/lib/store", async () => {
  const actual = await vi.importActual<any>("@/lib/store");
  return {
    ...actual,
    useDB: () => [{ user: { xp: 50 } }, () => {}],
    formatKRW: (n: number) => `₩${n.toLocaleString("ko-KR")}`,
  };
});

const samplePkg = {
  id: "starter",
  name: "STARTER",
  tagline: "First-time tagline",
  price: 9900,
  totalReturn: 13000,
  seatsLeft: 23,
} as any;

const renderWithRouter = (ui: React.ReactElement) =>
  render(<MemoryRouter>{ui}</MemoryRouter>);

const KOREAN_RE = /[가-힣]/;

async function setLang(lng: "ko" | "en") {
  await i18n.changeLanguage(lng);
}

describe("conversion surfaces i18n + touch targets", () => {
  beforeEach(() => {
    cleanup();
    sessionStorage.clear();
  });

  for (const lng of ["ko", "en"] as const) {
    describe(`[${lng}]`, () => {
      it(`PaywallStarter renders every required key`, async () => {
        await setLang(lng);
        renderWithRouter(<PaywallStarter pkg={samplePkg} onClose={() => {}} />);
        const t = i18n.getFixedT(lng, "convert");
        for (const k of [
          "firstOnly",
          "thirtyDay",
          "myScore",
          "scoreUnlock",
          "refund7",
          "bonusExpire",
          "seatsToday",
        ]) {
          expect(screen.queryAllByText(new RegExp(escapeRe(t(k as any)), "i")).length).toBeGreaterThan(0);
        }
        // payNow should be present with currency interpolation
        expect(screen.getByText(new RegExp(escapeRe(t("payNow", { val: "₩9,900" }) as string)))).toBeTruthy();
        // No raw missingKey markers
        expect(document.body.textContent ?? "").not.toMatch(/convert:[a-zA-Z]+/);
        // EN must not contain Korean characters
        if (lng === "en") {
          expect(KOREAN_RE.test(document.body.textContent ?? "")).toBe(false);
        }
      });

      it(`ExitIntentModal renders bonus copy`, async () => {
        await setLang(lng);
        // Render directly in "open" state by dispatching trigger right after mount.
        const { container } = renderWithRouter(<ExitIntentModal bonus={2000} />);
        fireEvent(window, new Event("phonara:exit-intent"));
        const t = i18n.getFixedT(lng, "convert");
        expect(screen.getByText(new RegExp(escapeRe(t("exitWait") as string)))).toBeTruthy();
        expect(screen.getByText(new RegExp(escapeRe(t("exitClaim") as string)))).toBeTruthy();
        expect(screen.getByText(new RegExp(escapeRe(t("exitDecline") as string)))).toBeTruthy();
        if (lng === "en") {
          expect(KOREAN_RE.test(container.textContent ?? "")).toBe(false);
        }
      });

      it(`UnlockWall renders all 3 paths`, async () => {
        await setLang(lng);
        const { container } = renderWithRouter(
          <UnlockWall amount={50_000} onClose={() => {}} />,
        );
        const t = i18n.getFixedT(lng, "convert");
        for (const k of [
          "step1",
          "lastStep",
          "pathATitle",
          "pathBTitle",
          "pathCTitle",
          "footnote",
        ]) {
          expect(screen.getByText(new RegExp(escapeRe(t(k as any) as string)))).toBeTruthy();
        }
        if (lng === "en") {
          expect(KOREAN_RE.test(container.textContent ?? "")).toBe(false);
        }
      });

      it(`all interactive buttons satisfy min-h-[44px] / min-h-[56px] touch target`, async () => {
        await setLang(lng);
        const { container } = renderWithRouter(
          <>
            <PaywallStarter pkg={samplePkg} onClose={() => {}} />
            <UnlockWall amount={50_000} onClose={() => {}} />
          </>,
        );
        fireEvent(window, new Event("phonara:exit-intent"));
        const interactives = container.querySelectorAll<HTMLElement>(
          'button, a[href], [role="button"]',
        );
        expect(interactives.length).toBeGreaterThan(0);
        for (const el of Array.from(interactives)) {
          const cls = el.className;
          const ok = /min-h-\[(44|56)px\]/.test(cls);
          expect(ok, `Element missing min-h-[44px]/[56px]: ${cls}`).toBe(true);
        }
      });
    });
  }
});

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
