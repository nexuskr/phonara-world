/**
 * Route prefetch — triggers lazy() chunk fetch ahead of navigation.
 *
 * Strategy:
 *  - On idle (after first paint): prefetch the most-likely next routes for
 *    authenticated dashboard users.
 *  - On hover/focus of a known link: prefetch that route immediately.
 *
 * Why: react-lazy + Suspense waits for the JS chunk on click; prefetching it
 * during idle time turns navigation into an instant transition.
 */

type Loader = () => Promise<unknown>;

const REGISTRY: Record<string, Loader> = {
  "/dashboard": () => import("@/pages/Dashboard.tsx"),
  "/wallet": () => import("@/pages/Wallet.tsx"),
  "/packages": () => import("@/pages/Packages.tsx"),
  "/missions": () => import("@/pages/Missions.tsx"),
  "/profile": () => import("@/pages/Profile.tsx"),
  "/empire": () => import("@/pages/Empire.tsx"),
  "/empire/hall": () => import("@/pages/EmpireHall.tsx"),
  "/empire/arena": () => import("@/pages/EmpireArena.tsx"),
  "/lounge": () => import("@/pages/Lounge.tsx"),
  "/trading": () => import("@/pages/TradingArenaWithArmy.tsx"),
  "/support": () => import("@/pages/Support.tsx"),
  "/guide": () => import("@/pages/Guide.tsx"),
  "/achievements": () => import("@/pages/Achievements.tsx"),
};

const fetched = new Set<string>();
const timings = new Map<string, { startedAt: number; loadedAt?: number; navAt?: number; deltaMs?: number }>();

const isDev = typeof import.meta !== "undefined" && (import.meta as any).env?.DEV;

function log(label: string, payload: Record<string, unknown>) {
  if (!isDev) return;
  // eslint-disable-next-line no-console
  console.info(`%c[prefetch] ${label}`, "color:#a78bfa", payload);
}

export function prefetchRoute(path: string): void {
  if (fetched.has(path)) return;
  const loader = REGISTRY[path];
  if (!loader) return;
  fetched.add(path);
  const startedAt = performance.now();
  timings.set(path, { startedAt });
  loader()
    .then(() => {
      const t = timings.get(path);
      if (!t) return;
      t.loadedAt = performance.now();
      log("chunk-loaded", { path, ms: +(t.loadedAt - t.startedAt).toFixed(1) });
    })
    .catch(() => {
      fetched.delete(path);
      timings.delete(path);
    });
}

/**
 * Schedule prefetch of the most likely next routes once the browser is idle.
 * Called once at app boot.
 */
export function schedulePrefetch(routes: string[] = ["/dashboard", "/wallet", "/packages", "/missions"]): void {
  if (typeof window === "undefined") return;
  const run = () => {
    for (const r of routes) prefetchRoute(r);
  };
  // @ts-ignore — requestIdleCallback may not exist in older browsers
  if (typeof window.requestIdleCallback === "function") {
    // @ts-ignore
    window.requestIdleCallback(run, { timeout: 4000 });
  } else {
    setTimeout(run, 1500);
  }
}

/** Attach onMouseEnter / onFocus prefetch to any element. */
export function prefetchHandlers(path: string) {
  return {
    onMouseEnter: () => prefetchRoute(path),
    onFocus: () => prefetchRoute(path),
    onTouchStart: () => prefetchRoute(path),
  };
}

/**
 * Record an actual navigation to `path` and report perceived transition latency.
 * Called from a global useEffect in App on every route change.
 */
export function recordNavigation(path: string): void {
  const t = timings.get(path);
  const navAt = performance.now();
  if (!t) {
    log("nav-cold", { path, prefetched: false });
    return;
  }
  t.navAt = navAt;
  // If chunk already loaded by hover/idle, perceived JS-ready delta is 0.
  // Otherwise it's the gap until the chunk finished.
  const ready = t.loadedAt ?? navAt;
  t.deltaMs = +(Math.max(0, ready - navAt)).toFixed(1);
  log("nav-hit", {
    path,
    prefetchedMs: t.loadedAt ? +(t.loadedAt - t.startedAt).toFixed(1) : null,
    waitedForChunkMs: t.deltaMs,
    saved: t.loadedAt && t.loadedAt < navAt,
  });
}

/** Read the latest navigation metric for an external panel. */
export function getPrefetchTimings() {
  return Array.from(timings.entries()).map(([path, t]) => ({ path, ...t }));
}
