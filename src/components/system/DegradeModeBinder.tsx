/**
 * DegradeModeBinder — effect-only.
 * Toggles body[data-degrade="1"] and hard-kills cosmetic intervals when degraded=true.
 * Surfaces a single warm toast on transitions.
 */
import { useEffect, useRef } from "react";
import { useDegradeMode } from "@/hooks/use-degrade-mode";
import { notify } from "@/lib/notify";
import { g } from "@pkg/core/i18n/glossary";

export function DegradeModeBinder() {
  const { degraded, loaded } = useDegradeMode();
  const prev = useRef<boolean | null>(null);

  useEffect(() => {
    if (typeof document === "undefined" || !loaded) return;
    if (degraded) {
      document.body.dataset.degrade = "1";
      // Hard-kill cosmetic on entry — money_flow is structurally guarded inside governor.
      import("@pkg/runtime")
        .then((m) => {
          const n = m.killCategory("cosmetic");
          if ((import.meta as { env?: { DEV?: boolean } }).env?.DEV) {
            console.warn(`[runtime.governor] degrade-on → cosmetic cleared ${n}`);
          }
        })
        .catch(() => {});
      // PR-K — Degrade Mode ON: cancel any pre-warmed operator chunk preload
      // links so the user bundle stays as light as possible under stress.
      try {
        const links = document.querySelectorAll<HTMLLinkElement>(
          'link[rel="modulepreload"][href*="/operator"]',
        );
        links.forEach((l) => l.parentNode?.removeChild(l));
      } catch {
        /* noop */
      }
      if (prev.current === false) notify.important(g("degradeBannerOn"));
    } else {
      delete document.body.dataset.degrade;
      if (prev.current === true) notify.passive(g("degradeBannerOff"));
    }
    prev.current = degraded;
  }, [degraded, loaded]);

  return null;
}

export default DegradeModeBinder;
