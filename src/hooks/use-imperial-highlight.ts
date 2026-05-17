/**
 * Phase F — Imperial deep-link arrival highlight.
 *
 * Reads `?from=push&focus=...&campaign=...&highlight=true` from URL on mount,
 * dispatches a single `phonara:imperial-focus` CustomEvent so any page can
 * react (e.g. add a pulse-halo to the streak card, scroll to mission row).
 *
 * Stateless, zero deps, mounted once at App root via <ImperialDeepLinkListener/>.
 * Money-flow neutral.
 */
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export type ImperialFocusDetail = {
  focus: string | null;
  campaign: string | null;
  highlight: boolean;
  tab: string | null;
};

export function useImperialHighlight(): void {
  const loc = useLocation();
  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(loc.search);
    if (sp.get("from") !== "push") return;
    const detail: ImperialFocusDetail = {
      focus: sp.get("focus"),
      campaign: sp.get("campaign"),
      highlight: sp.get("highlight") === "true",
      tab: sp.get("tab"),
    };
    // Defer one frame so the target page has mounted its listeners.
    const id = window.setTimeout(() => {
      try {
        window.dispatchEvent(new CustomEvent("phonara:imperial-focus", { detail }));
      } catch { /* noop */ }
    }, 80);
    return () => window.clearTimeout(id);
  }, [loc.pathname, loc.search]);
}

export default function ImperialDeepLinkListener() {
  useImperialHighlight();
  return null;
}
