/**
 * Layout-shift diagnostic — installs a PerformanceObserver for
 * `layout-shift` entries and surfaces them so we can debug "screen jitter".
 *
 * - Logs every shift > 0.05 to console with the shifted nodes and current path.
 * - Buffers a rolling window; if cumulative shift in the last 3s exceeds 0.25,
 *   shows a sonner toast (dev or when localStorage `phonara:debug-cls` = "1").
 * - Exposes `window.__phonaraCls()` to dump recent shifts on demand.
 */
import { toast } from "sonner";

interface ShiftLog {
  ts: number;
  value: number;
  path: string;
  sources: string[];
}

const ring: ShiftLog[] = [];
const RING_MAX = 60;
let installed = false;
let lastToastAt = 0;

function nodeLabel(n: Node | null | undefined): string {
  if (!n || !(n as Element).tagName) return "?";
  const el = n as Element;
  const id = (el as HTMLElement).id ? `#${(el as HTMLElement).id}` : "";
  const cls = typeof el.className === "string" && el.className
    ? "." + el.className.split(/\s+/).slice(0, 2).join(".")
    : "";
  return `${el.tagName.toLowerCase()}${id}${cls}`;
}

function debugEnabled(): boolean {
  try {
    if (import.meta.env?.DEV) return true;
    return localStorage.getItem("phonara:debug-cls") === "1";
  } catch { return false; }
}

export function installLayoutShiftMonitor() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  try {
    if (!("PerformanceObserver" in window)) return;
    const supported = (PerformanceObserver as any).supportedEntryTypes ?? [];
    if (!supported.includes("layout-shift")) return;

    const obs = new PerformanceObserver((list) => {
      const now = performance.now();
      let recentSum = 0;
      for (const e of list.getEntries() as any[]) {
        // Skip shifts during user interaction (legitimate)
        if (e.hadRecentInput) continue;
        const entry: ShiftLog = {
          ts: now,
          value: e.value as number,
          path: location.pathname,
          sources: ((e.sources as any[]) || []).map((s) => nodeLabel(s.node)).slice(0, 4),
        };
        ring.push(entry);
        if (ring.length > RING_MAX) ring.shift();
        if (entry.value > 0.05 && debugEnabled()) {
          // eslint-disable-next-line no-console
          console.warn("[CLS]", entry.value.toFixed(3), entry.sources.join(", "), "@", entry.path);
        }
      }
      // Cumulative over last 3s
      const cutoff = now - 3000;
      for (let i = ring.length - 1; i >= 0 && ring[i].ts >= cutoff; i--) {
        recentSum += ring[i].value;
      }
      if (recentSum > 0.25 && debugEnabled() && now - lastToastAt > 5000) {
        lastToastAt = now;
        toast.warning(`레이아웃 흔들림 감지 (CLS ${recentSum.toFixed(2)})`, {
          description: ring.slice(-3).map((r) => r.sources.join(", ")).join(" · "),
          duration: 4000,
        });
      }
    });
    obs.observe({ type: "layout-shift", buffered: true } as any);
    (window as any).__phonaraCls = () => ring.slice();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[CLS] monitor failed to install", err);
  }
}
