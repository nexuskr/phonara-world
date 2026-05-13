import { useEffect, useRef, useState, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** Pixels of root margin (early mount before fully visible). */
  rootMargin?: string;
  /** Min height while not yet mounted (prevents layout jump). */
  minHeight?: number | string;
  /** If true, unmount when scrolled away. Default: keep mounted once visible. */
  unmountOnExit?: boolean;
  /** Optional custom placeholder. Falls back to a premium shimmer card. */
  fallback?: ReactNode;
  /** Hide the default skeleton chrome (use a flat tinted block). */
  bare?: boolean;
}

/**
 * Defers mounting `children` until the host element scrolls near the viewport.
 * Renders a polished shimmer skeleton in place so the first paint never shows
 * a blank gap or causes layout shift.
 */
export default function LazyMount({
  children,
  rootMargin = "200px 0px",
  minHeight = 120,
  unmountOnExit = false,
  fallback,
  bare = false,
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") { setMounted(true); return; }

    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          setMounted(true);
          if (!unmountOnExit) io.disconnect();
        } else if (unmountOnExit) {
          setMounted(false);
        }
      }
    }, { rootMargin });
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin, unmountOnExit]);

  return (
    <div ref={ref} style={!mounted ? { minHeight } : undefined}>
      {mounted ? children : (fallback ?? <LazyMountSkeleton minHeight={minHeight} bare={bare} />)}
    </div>
  );
}

/**
 * Premium shimmer placeholder.
 * - Uses semantic tokens (`--muted`, `--card`, `--primary`) — no hard colors.
 * - Honors `prefers-reduced-motion` (static block, no shimmer).
 * - Shimmer is GPU-only (`transform: translateX`), so it costs ~nothing.
 */
function LazyMountSkeleton({ minHeight, bare }: { minHeight: number | string; bare: boolean }) {
  const h = typeof minHeight === "number" ? `${minHeight}px` : minHeight;
  if (bare) {
    return (
      <div
        aria-hidden
        className="lazy-skel-bare rounded-xl bg-muted/30"
        style={{ minHeight: h }}
      />
    );
  }
  return (
    <div
      aria-hidden
      className="lazy-skel relative overflow-hidden rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm"
      style={{ minHeight: h }}
    >
      <div className="absolute inset-0 lazy-skel-shimmer pointer-events-none" />
      <div className="relative p-4 space-y-3">
        <div className="h-3 w-1/3 rounded-md bg-muted/50" />
        <div className="h-2.5 w-2/3 rounded-md bg-muted/40" />
        <div className="h-2.5 w-1/2 rounded-md bg-muted/30" />
      </div>
    </div>
  );
}
