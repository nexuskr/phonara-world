// Auto-instrumentation: capture route changes, fetch calls, and web-vitals
// → batched record_span RPC writes.
import { supabase } from "@/integrations/supabase/client";

type SpanInput = {
  trace_id: string;
  parent?: string | null;
  op: string;
  started_at: string;
  ended_at: string;
  status?: string;
  metadata?: Record<string, any>;
};

const QUEUE: SpanInput[] = [];
let FLUSH_TIMER: number | null = null;
const FLUSH_INTERVAL = 5_000;
const MAX_QUEUE = 50;

function uuid() {
  return (crypto as any)?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

let CURRENT_TRACE = uuid();

export function setTrace(id?: string) {
  CURRENT_TRACE = id ?? uuid();
}

export function recordSpan(input: Omit<SpanInput, "trace_id"> & { trace_id?: string }) {
  QUEUE.push({ trace_id: input.trace_id ?? CURRENT_TRACE, ...input });
  if (QUEUE.length >= MAX_QUEUE) flush();
  else scheduleFlush();
}

function scheduleFlush() {
  if (FLUSH_TIMER != null) return;
  FLUSH_TIMER = window.setTimeout(() => { FLUSH_TIMER = null; flush(); }, FLUSH_INTERVAL);
}

async function flush() {
  if (QUEUE.length === 0) return;
  const batch = QUEUE.splice(0, QUEUE.length);
  // Best-effort, fire-and-forget. record_span is per-row; do in parallel with cap.
  await Promise.all(batch.slice(0, 30).map((s) =>
    (supabase as any).rpc("record_span", {
      _trace_id: s.trace_id,
      _parent: s.parent ?? null,
      _op: s.op,
      _started_at: s.started_at,
      _ended_at: s.ended_at,
      _status: s.status ?? "ok",
      _metadata: s.metadata ?? {},
    }).then(() => null).catch(() => null)
  ));
}

// Flush on hide
if (typeof window !== "undefined") {
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flush(); });
  window.addEventListener("beforeunload", () => flush());
}

// fetch instrumentation
export function installFetchInstrument() {
  if (typeof window === "undefined" || (window as any).__phonaraFetchPatched) return;
  (window as any).__phonaraFetchPatched = true;
  const orig = window.fetch.bind(window);
  window.fetch = async (...args: Parameters<typeof fetch>) => {
    const url = typeof args[0] === "string" ? args[0] : (args[0] as Request).url;
    // Skip our own span writes to prevent loops
    if (url.includes("record_span") || url.includes("/rest/v1/rpc/record_span")) return orig(...args);
    const started = new Date();
    const t0 = performance.now();
    let status = "ok";
    let httpStatus = 0;
    try {
      const res = await orig(...args);
      httpStatus = res.status;
      if (!res.ok) status = "error";
      return res;
    } catch (e) {
      status = "error";
      throw e;
    } finally {
      const ended = new Date();
      const dur = performance.now() - t0;
      // Only record meaningful (skip < 5ms noise) and same-origin/api calls
      if (dur >= 5) {
        recordSpan({
          op: `fetch ${shortenUrl(url)}`,
          started_at: started.toISOString(),
          ended_at: ended.toISOString(),
          status,
          metadata: { url: shortenUrl(url), http_status: httpStatus, duration_ms: Math.round(dur) },
        });
      }
    }
  };
}

function shortenUrl(u: string) {
  try {
    const url = new URL(u, window.location.origin);
    return `${url.pathname}`.slice(0, 120);
  } catch { return u.slice(0, 120); }
}

// Route change instrumentation hook (call from app)
let lastRouteAt = 0;
let lastPath = typeof window !== "undefined" ? window.location.pathname : "";
export function recordRouteChange(pathname: string) {
  const now = Date.now();
  if (lastRouteAt > 0 && pathname !== lastPath) {
    recordSpan({
      op: `route ${pathname}`,
      started_at: new Date(lastRouteAt).toISOString(),
      ended_at: new Date(now).toISOString(),
      metadata: { from: lastPath, to: pathname, duration_ms: now - lastRouteAt },
    });
  }
  lastRouteAt = now;
  lastPath = pathname;
}

// Web-vitals (LCP) lightweight observer
export function installWebVitals() {
  if (typeof PerformanceObserver === "undefined") return;
  try {
    const po = new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        const startedAt = new Date(performance.timeOrigin + (e as any).startTime);
        const endedAt = new Date(performance.timeOrigin + (e as any).startTime + ((e as any).duration ?? 0));
        recordSpan({
          op: `vital ${e.entryType}`,
          started_at: startedAt.toISOString(),
          ended_at: endedAt.toISOString(),
          metadata: { name: (e as any).name, duration_ms: Math.round((e as any).duration ?? 0), value: (e as any).value },
        });
      }
    });
    po.observe({ type: "largest-contentful-paint", buffered: true } as any);
    po.observe({ type: "longtask", buffered: true } as any);
  } catch {}
}
