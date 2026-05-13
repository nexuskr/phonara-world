import { useEffect, useRef, useState } from "react";

/**
 * IntersectionObserver-based visibility hook.
 * Pauses tickers/animations when their host element scrolls offscreen,
 * resumes when it returns. Combine with `useNowTick` to skip work entirely
 * for offscreen widgets.
 *
 * Usage:
 *   const ref = useRef<HTMLDivElement>(null);
 *   const visible = useInViewport(ref);
 *   useEffect(() => { if (!visible) return; ...rotate logic... }, [visible, tick]);
 */
export function useInViewport<T extends Element>(
  ref: React.RefObject<T>,
  options: IntersectionObserverInit = { rootMargin: "120px" },
): boolean {
  const [visible, setVisible] = useState(true);
  const opts = useRef(options);
  useEffect(() => {
    if (!ref.current || typeof IntersectionObserver === "undefined") return;
    const el = ref.current;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) setVisible(e.isIntersecting);
      },
      opts.current,
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
  return visible;
}
