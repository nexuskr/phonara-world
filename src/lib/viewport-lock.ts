/**
 * Viewport height lock — prevents mobile address-bar collapse jitter.
 *
 * Sets a CSS custom property `--app-vh` to a STABLE pixel height that only
 * recomputes when:
 *   - the window WIDTH changes (real device rotation / desktop resize), or
 *   - orientation changes
 *
 * The mobile browser chrome (URL bar) collapsing/expanding on scroll changes
 * `window.innerHeight` continuously — we deliberately ignore that to keep
 * full-bleed sections (`min-h-[var(--app-vh)]`) from bouncing.
 *
 * Use in CSS:
 *   min-height: var(--app-vh, 100svh);
 */

let lastWidth = 0;

function measure(): number {
  // Prefer the largest stable dimension we can get.
  // visualViewport.height tracks the visible area excluding the keyboard,
  // but its initial value is a good baseline.
  const vv = (window as any).visualViewport?.height as number | undefined;
  const ih = window.innerHeight;
  // Use the larger of the two on first measure to capture pre-collapse height.
  return Math.max(ih || 0, vv || 0);
}

function apply(force = false) {
  const w = window.innerWidth;
  if (!force && w === lastWidth) return;
  lastWidth = w;
  const h = measure();
  if (h > 0) {
    document.documentElement.style.setProperty("--app-vh", `${h}px`);
  }
}

export function installViewportLock() {
  if (typeof window === "undefined") return;
  apply(true);
  // Re-measure only on width change (true resize / rotation), NOT on every
  // resize event (mobile address bar fires resize on scroll).
  window.addEventListener("resize", () => apply(false), { passive: true });
  window.addEventListener("orientationchange", () => {
    // Wait one frame for the new layout, then force.
    requestAnimationFrame(() => apply(true));
  });
}
