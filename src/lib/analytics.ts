/**
 * Lightweight analytics shim — sends events to whichever provider is loaded
 * (gtag, plausible, posthog, umami). Falls back to console in dev.
 * Always safe to call; no-ops if nothing is configured.
 */
type Props = Record<string, string | number | boolean | null | undefined>;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    plausible?: (event: string, opts?: { props?: Props }) => void;
    posthog?: { capture: (event: string, props?: Props) => void };
    umami?: { track: (event: string, props?: Props) => void };
  }
}

export function track(event: string, props: Props = {}) {
  try {
    if (typeof window === "undefined") return;
    window.gtag?.("event", event, props);
    window.plausible?.(event, { props });
    window.posthog?.capture(event, props);
    window.umami?.track(event, props);
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.debug("[analytics]", event, props);
    }
  } catch {
    /* never throw from analytics */
  }
}
