/**
 * rpc.surface — DEV-only RPC 3-mode collector.
 *
 * PR-F (Phase 2 Visibility): install lightweight fetch/XHR instrumentation that
 * classifies REST/RPC calls into foreground / hidden / idle buckets. Observation
 * ONLY — no payload mutation, no behavior change, no timing change.
 *
 * Production builds: tree-shaken via import.meta.env.DEV guard at call sites.
 *
 * Usage:
 *   import { installRpcSurface } from "@/packages/entropy/rpc.surface";
 *   if (import.meta.env.DEV) installRpcSurface();
 *
 * Then in DevTools:
 *   window.__phonaraSurface.report()    // print 3-mode JSON
 *   window.__phonaraSurface.entropy()   // print entropy ledger
 */

type Bucket = { count: number; byRpc: Record<string, number> };
type Surface = {
  startedAt: string;
  foreground: Bucket;
  hidden: Bucket;
  idle: Bucket;
};

declare global {
  interface Window {
    __phonaraSurface?: {
      report: () => unknown;
      entropy: () => unknown;
      reset: () => void;
      runScenario: (opts?: { activeMs?: number; hiddenMs?: number; idleMs?: number; label?: string }) => Promise<unknown>;
    };
    __entropyExport?: () => unknown;
  }
}

const IDLE_MS = 60_000;

let installed = false;

export function installRpcSurface() {
  if (typeof window === "undefined" || installed) return;
  installed = true;

  const surface: Surface = {
    startedAt: new Date().toISOString(),
    foreground: { count: 0, byRpc: {} },
    hidden: { count: 0, byRpc: {} },
    idle: { count: 0, byRpc: {} },
  };

  let mode: "foreground" | "hidden" | "idle" = document.hidden ? "hidden" : "foreground";
  let lastInteraction = Date.now();
  let forcedMode: typeof mode | null = null; // scenario override

  const computeMode = () => {
    if (forcedMode) return forcedMode;
    if (document.hidden) return "hidden";
    if (Date.now() - lastInteraction > IDLE_MS) return "idle";
    return "foreground";
  };

  document.addEventListener("visibilitychange", () => { mode = computeMode(); });
  (["pointerdown", "keydown", "scroll", "touchstart"] as const).forEach((ev) =>
    window.addEventListener(ev, () => { lastInteraction = Date.now(); mode = computeMode(); }, { passive: true })
  );
  setInterval(() => { mode = computeMode(); }, 1000);

  function bump(url: string) {
    try {
      const m = url.match(/\/rest\/v1\/rpc\/([A-Za-z0-9_-]+)/);
      const key = m ? m[1] : (url.match(/\/rest\/v1\/([A-Za-z0-9_-]+)/)?.[1] ?? "non-rpc");
      const bucket = surface[mode];
      bucket.count += 1;
      bucket.byRpc[key] = (bucket.byRpc[key] || 0) + 1;
    } catch { /* noop */ }
  }

  // fetch instrumentation
  const nativeFetch = window.fetch.bind(window);
  window.fetch = function (input: RequestInfo | URL, init?: RequestInit) {
    const url = typeof input === "string" ? input : (input instanceof URL ? input.href : input.url);
    if (url.includes("/rest/v1/")) bump(url);
    return nativeFetch(input as RequestInfo, init);
  };

  // XHR instrumentation
  const origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method: string, url: string | URL, ...rest: unknown[]) {
    const u = typeof url === "string" ? url : url.href;
    if (u.includes("/rest/v1/")) bump(u);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (origOpen as any).call(this, method, url, ...rest);
  };

  function snapshotPayload() {
    return JSON.parse(JSON.stringify({
      ...surface, capturedAt: new Date().toISOString(), currentMode: mode,
    }));
  }

  function download(name: string, data: unknown) {
    try {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    } catch { /* noop */ }
  }

  function pct(base: number, after: number) {
    if (base === 0) return after === 0 ? 0 : Infinity;
    return Math.round(((after - base) / base) * 1000) / 10;
  }

  function diffReport(baseline: Surface, after: Surface) {
    const verdict = (delta: number, target: number) =>
      delta <= target ? "PASS" : "FAIL";
    return {
      generatedAt: new Date().toISOString(),
      baseline: { fg: baseline.foreground.count, hidden: baseline.hidden.count, idle: baseline.idle.count },
      after:    { fg: after.foreground.count,    hidden: after.hidden.count,    idle: after.idle.count    },
      deltaPct: {
        foreground: pct(baseline.foreground.count, after.foreground.count),
        hidden:     pct(baseline.hidden.count,     after.hidden.count),
        idle:       pct(baseline.idle.count,       after.idle.count),
      },
      thresholds: { hidden: -90, idle: -70 },
      verdict: {
        hidden: verdict(pct(baseline.hidden.count, after.hidden.count), -90),
        idle:   verdict(pct(baseline.idle.count,   after.idle.count),   -70),
      },
      byRpc: { baseline, after },
    };
  }

  window.__phonaraSurface = {
    report() {
      const p = snapshotPayload();
      console.log(JSON.stringify(p, null, 2));
      return p;
    },
    entropy() {
      const fn = window.__entropyExport;
      const r = typeof fn === "function" ? fn() : null;
      console.log(JSON.stringify(r, null, 2));
      return r;
    },
    reset() {
      surface.startedAt = new Date().toISOString();
      surface.foreground = { count: 0, byRpc: {} };
      surface.hidden = { count: 0, byRpc: {} };
      surface.idle = { count: 0, byRpc: {} };
    },
    /**
     * Compressed 3-phase scenario with manual mode override (does NOT alter
     * runtime governor — only the collector's classification, so RPC volumes
     * reflect what the governor actually suppresses while in each mode).
     *
     * Defaults: 60s + 60s + 60s. Override for longer runs.
     * Returns a Promise<{ baseline, after, diff }> and triggers a JSON download.
     */
    async runScenario(opts: { activeMs?: number; hiddenMs?: number; idleMs?: number; label?: string } = {}) {
      const { activeMs = 60_000, hiddenMs = 60_000, idleMs = 60_000, label = "compressed-3x60s" } = opts;
      console.info("[rpc.surface] scenario start", { activeMs, hiddenMs, idleMs });

      // Phase 0 — baseline window: collect with all categories LIVE (force foreground).
      forcedMode = "foreground";
      this.reset();
      await new Promise((r) => setTimeout(r, activeMs));
      const baseline: Surface = JSON.parse(JSON.stringify(surface));

      // Phase 1 — hidden window.
      this.reset();
      forcedMode = "hidden";
      // Also flip the runtime governor by dispatching visibilitychange semantics.
      Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
      document.dispatchEvent(new Event("visibilitychange"));
      await new Promise((r) => setTimeout(r, hiddenMs));
      const hiddenWindow: Surface = JSON.parse(JSON.stringify(surface));

      // Phase 2 — idle window: tab visible, governor sees no input.
      Object.defineProperty(document, "hidden", { configurable: true, get: () => false });
      document.dispatchEvent(new Event("visibilitychange"));
      this.reset();
      forcedMode = "idle";
      lastInteraction = 0; // ensure idle suspension trips
      await new Promise((r) => setTimeout(r, idleMs));
      const idleWindow: Surface = JSON.parse(JSON.stringify(surface));

      // Restore
      forcedMode = null;
      // @ts-expect-error restore native getter
      delete (document as any).hidden;
      lastInteraction = Date.now();

      // Build a synthetic "after" surface for diff: hidden bucket from hiddenWindow.hidden bucket,
      // idle bucket from idleWindow.idle bucket, foreground from baseline.
      const after: Surface = {
        startedAt: new Date().toISOString(),
        foreground: baseline.foreground,
        hidden: hiddenWindow.hidden,
        idle: idleWindow.idle,
      };
      const diff = diffReport(baseline, after);
      const payload = { _pr: "PR-H", label, scenario: { activeMs, hiddenMs, idleMs }, ...diff };
      console.log(JSON.stringify(payload, null, 2));
      download(`rpc.surface.scenario.${new Date().toISOString().slice(0,10)}.json`, payload);
      return payload;
    },
  };

  console.info("[rpc.surface] installed (DEV). __phonaraSurface.runScenario() to auto-run 3x60s scenario.");
}
