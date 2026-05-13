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

  // Admin Mission Control — chunks fetched on hover/focus from sidebar.
  "/admin":                       () => import("@/pages/admin/CockpitV2.tsx"),
  "/admin/funnel":                () => import("@/pages/admin/Kpi.tsx"),
  "/admin/revenue":               () => import("@/pages/admin/Revenue.tsx"),
  "/admin/treasury/deposits":     () => import("@/components/admin/DepositRequestsAdmin.tsx"),
  "/admin/treasury/withdrawals":  () => import("@/components/admin/WithdrawRequestsAdmin.tsx"),
  "/admin/treasury/packages":     () => import("@/components/admin/PackagePurchasesAdmin.tsx"),
  "/admin/treasury/coin":         () => import("@/components/admin/CoinAddressAdmin.tsx"),
  "/admin/treasury/accounting":   () => import("@/components/admin/OperatorAccounting.tsx"),
  "/admin/treasury/insurance":    () => import("@/components/InsuranceFundDashboard.tsx"),
  "/admin/compliance/aml":        () => import("@/components/admin/AMLAdmin.tsx"),
  "/admin/compliance/trust":      () => import("@/components/admin/TrustV2Admin.tsx"),
  "/admin/compliance/payout":     () => import("@/components/admin/LeaderboardPayoutAudit.tsx"),
  "/admin/compliance/viral":      () => import("@/components/admin/ViralForensics.tsx"),
  "/admin/compliance/perms":      () => import("@/components/admin/PermissionsAudit.tsx"),
  "/admin/ops/observability":     () => import("@/components/admin/ObservabilityCockpit.tsx"),
  "/admin/ops/errors":            () => import("@/components/admin/ErrorMonitorAdmin.tsx"),
  "/admin/ops/security":          () => import("@/components/admin/SecurityAuditAdmin.tsx"),
  "/admin/ops/cron":              () => import("@/components/admin/CronJobsCard.tsx"),
  "/admin/ops/report":            () => import("@/pages/admin/OpsReport.tsx"),
  "/admin/growth/ab":             () => import("@/components/admin/AbExperimentsAdmin.tsx"),
  "/admin/growth/bots":           () => import("@/components/admin/BotStrengthAdmin.tsx"),
  "/admin/growth/ev":             () => import("@/components/admin/EvHealthAdmin.tsx"),
  "/admin/growth/ugc":            () => import("@/components/admin/AdminUgc.tsx"),
  "/admin/growth/referrals":      () => import("@/components/admin/ReferralsAdmin.tsx"),
  "/admin/growth/whales":         () => import("@/components/admin/WhaleStrikeFunnelPanel.tsx"),
  "/admin/product/users":         () => import("@/components/admin/ServerUserAdmin.tsx"),
  "/admin/product/support":       () => import("@/pages/admin/Support.tsx"),
  "/admin/product/missions":      () => import("@/components/admin/MissionTemplatesAdmin.tsx"),
  "/admin/product/founding":      () => import("@/components/admin/FoundingSeasonsAdmin.tsx"),
  "/admin/product/beta":          () => import("@/components/admin/BetaInvitesAdmin.tsx"),
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
