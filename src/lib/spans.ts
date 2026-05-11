// Auto-instrumentation: capture route changes, fetch calls, and web-vitals
// → batched record_span RPC writes, with retry, dedup, and quality metrics.
import { supabase } from "@/integrations/supabase/client";

type SpanInput = {
  trace_id: string;
  parent?: string | null;
  op: string;
  started_at: string;
  ended_at: string;
  status?: string;
  metadata?: Record<string, any>;
  _key?: string;       // dedup key (internal)
  _attempts?: number;  // retry counter (internal)
};

type Metrics = {
  enqueued: number;
  flushed_ok: number;
  flushed_fail: number;
  retried: number;
  dropped: number;
  deduped: number;
  in_flight: boolean;
  queue_size: number;
  last_flush_at: number | null;
  last_error: string | null;
};

const QUEUE: SpanInput[] = [];
const SEEN = new Set<string>();           // dedup window
const SEEN_LIMIT = 500;
let FLUSH_TIMER: number | null = null;
let FLUSHING = false;
let RETRY_BACKOFF = 0;                    // ms current backoff
const FLUSH_INTERVAL = 5_000;
const MAX_QUEUE = 50;
const MAX_BATCH = 25;
const MAX_RETRIES = 3;
const MAX_QUEUE_HARD = 500;               // hard cap; oldest dropped past this

// --- Persistence (IndexedDB w/ localStorage fallback) -----------------------
const DB_NAME = "phonara-spans";
const STORE = "queue";
const LS_KEY = "phonara_spans_queue_v1";
let DB: IDBDatabase | null = null;
let DB_READY: Promise<IDBDatabase | null> | null = null;

function openDB(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  if (DB_READY) return DB_READY;
  DB_READY = new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "_key" });
      };
      req.onsuccess = () => { DB = req.result; resolve(DB); };
      req.onerror = () => resolve(null);
    } catch { resolve(null); }
  });
  return DB_READY;
}

async function persistAdd(s: SpanInput) {
  const db = await openDB();
  if (!db) {
    try {
      const arr = JSON.parse(localStorage.getItem(LS_KEY) || "[]");
      arr.push(s);
      localStorage.setItem(LS_KEY, JSON.stringify(arr.slice(-MAX_QUEUE_HARD)));
    } catch {}
    return;
  }
  try { db.transaction(STORE, "readwrite").objectStore(STORE).put(s); } catch {}
}

async function persistRemove(keys: string[]) {
  if (keys.length === 0) return;
  const db = await openDB();
  if (!db) {
    try {
      const arr: SpanInput[] = JSON.parse(localStorage.getItem(LS_KEY) || "[]");
      const next = arr.filter(s => !keys.includes(s._key ?? ""));
      localStorage.setItem(LS_KEY, JSON.stringify(next));
    } catch {}
    return;
  }
  try {
    const tx = db.transaction(STORE, "readwrite");
    const st = tx.objectStore(STORE);
    keys.forEach(k => st.delete(k));
  } catch {}
}

async function restoreQueue() {
  const db = await openDB();
  if (!db) {
    try {
      const arr: SpanInput[] = JSON.parse(localStorage.getItem(LS_KEY) || "[]");
      for (const s of arr) if (s._key && !SEEN.has(s._key)) { SEEN.add(s._key); QUEUE.push(s); }
      if (QUEUE.length) scheduleFlush();
    } catch {}
    return;
  }
  try {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => {
      const rows = (req.result as SpanInput[]) || [];
      for (const s of rows) if (s._key && !SEEN.has(s._key)) { SEEN.add(s._key); QUEUE.push(s); }
      if (QUEUE.length) scheduleFlush();
    };
  } catch {}
}

const M: Metrics = {
  enqueued: 0, flushed_ok: 0, flushed_fail: 0, retried: 0,
  dropped: 0, deduped: 0, in_flight: false, queue_size: 0,
  last_flush_at: null, last_error: null,
};

// --- Quality threshold alerting ---------------------------------------------
const ALERT_COOLDOWN_MS = 5 * 60_000;
let lastAlertAt = 0;
let lastAlertReason: string | null = null;
function maybeAlert(reason: string, detail: Record<string, any> = {}) {
  const now = Date.now();
  if (now - lastAlertAt < ALERT_COOLDOWN_MS) return;
  const total = M.flushed_ok + M.flushed_fail;
  if (total < 20) return;
  const lossRate = total > 0 ? M.flushed_fail / total : 0;
  if (lossRate < 0.2 && M.dropped < 25) return;
  lastAlertAt = now;
  lastAlertReason = reason;
  try {
    void (supabase as any).rpc("ingest_span_quality_alert", {
      _reason: reason,
      _metrics: { ...M, queue_size: QUEUE.length, loss_rate: lossRate, ...detail },
    });
  } catch {}
}

export function getLastAlert() {
  return { at: lastAlertAt || null, reason: lastAlertReason };
}

export async function getPersistedQueueSize(): Promise<number> {
  const db = await openDB();
  if (!db) {
    try { return (JSON.parse(localStorage.getItem(LS_KEY) || "[]") as any[]).length; } catch { return 0; }
  }
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).count();
      req.onsuccess = () => resolve(req.result || 0);
      req.onerror = () => resolve(0);
    } catch { resolve(0); }
  });
}

function uuid() {
  return (crypto as any)?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

let CURRENT_TRACE = uuid();
export function setTrace(id?: string) { CURRENT_TRACE = id ?? uuid(); }

export function getSpanMetrics(): Metrics {
  return { ...M, queue_size: QUEUE.length, in_flight: FLUSHING };
}

function dedupKey(s: SpanInput) {
  return `${s.trace_id}|${s.op}|${s.started_at}`;
}

export function recordSpan(input: Omit<SpanInput, "trace_id"> & { trace_id?: string }) {
  const span: SpanInput = { trace_id: input.trace_id ?? CURRENT_TRACE, ...input };
  const key = dedupKey(span);
  if (SEEN.has(key)) { M.deduped++; return; }
  SEEN.add(key);
  if (SEEN.size > SEEN_LIMIT) {
    // simple FIFO trim
    const it = SEEN.values();
    for (let i = 0; i < SEEN.size - SEEN_LIMIT; i++) SEEN.delete(it.next().value as string);
  }
  span._key = key;
  span._attempts = 0;
  if (QUEUE.length >= MAX_QUEUE_HARD) {
    QUEUE.splice(0, QUEUE.length - MAX_QUEUE_HARD + 1);
    M.dropped++;
  }
  QUEUE.push(span);
  M.enqueued++;
  void persistAdd(span);
  if (QUEUE.length >= MAX_QUEUE) void flush();
  else scheduleFlush();
}

function scheduleFlush() {
  if (FLUSH_TIMER != null || FLUSHING) return;
  const delay = FLUSH_INTERVAL + RETRY_BACKOFF;
  FLUSH_TIMER = window.setTimeout(() => { FLUSH_TIMER = null; void flush(); }, delay);
}

async function flush() {
  if (FLUSHING || QUEUE.length === 0) return;
  // Gate on auth session — record_span RPC is granted to `authenticated` only.
  // Before session restore, calls return 401 and pollute the console. Defer.
  try {
    const { data } = await supabase.auth.getSession();
    if (!data?.session) {
      // No session yet — retry later, do not call the RPC.
      RETRY_BACKOFF = Math.min(30_000, (RETRY_BACKOFF || 2_000) * 2);
      scheduleFlush();
      return;
    }
  } catch {
    // auth lookup failure → also defer silently
    return;
  }
  FLUSHING = true;
  try {
    const batch = QUEUE.splice(0, MAX_BATCH);
    const failed: SpanInput[] = [];
    const succeededKeys: string[] = [];
    const droppedKeys: string[] = [];
    let lastErr: string | null = null;

    await Promise.all(batch.map(async (s) => {
      try {
        const { error } = await (supabase as any).rpc("record_span", {
          _trace_id: s.trace_id,
          _parent: s.parent ?? null,
          _op: s.op,
          _started_at: s.started_at,
          _ended_at: s.ended_at,
          _status: s.status ?? "ok",
          _metadata: s.metadata ?? {},
        });
        if (error) throw error;
        M.flushed_ok++;
        if (s._key) succeededKeys.push(s._key);
      } catch (e: any) {
        lastErr = e?.message ?? String(e);
        // 401 / auth errors → drop immediately, do not retry (avoids console flood).
        const code = String(e?.code ?? "");
        const msg = String(e?.message ?? "");
        const isAuthErr = code === "401" || code === "PGRST301" || /401|JWT|jwt|unauthor/i.test(msg);
        s._attempts = (s._attempts ?? 0) + 1;
        if (!isAuthErr && s._attempts < MAX_RETRIES) {
          M.retried++;
          failed.push(s);
        } else {
          M.flushed_fail++;
          M.dropped++;
          if (s._key) { SEEN.delete(s._key); droppedKeys.push(s._key); }
        }
      }
    }));

    M.last_flush_at = Date.now();
    M.last_error = lastErr;
    void persistRemove([...succeededKeys, ...droppedKeys]);

    if (failed.length > 0) {
      QUEUE.unshift(...failed);
      RETRY_BACKOFF = Math.min(60_000, (RETRY_BACKOFF || 1_000) * 2);
      maybeAlert("flush_failures", { last_error: lastErr });
    } else {
      RETRY_BACKOFF = 0;
    }
    if (M.dropped >= 25) maybeAlert("drop_threshold", {});
  } finally {
    FLUSHING = false;
    if (QUEUE.length > 0) scheduleFlush();
  }
}

// Force flush on page hide / unload (best-effort) + restore from disk
if (typeof window !== "undefined") {
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") void flush(); });
  window.addEventListener("beforeunload", () => { void flush(); });
  void restoreQueue();
}

// fetch instrumentation — guards against re-patching and self-loops
export function installFetchInstrument() {
  if (typeof window === "undefined" || (window as any).__phonaraFetchPatched) return;
  (window as any).__phonaraFetchPatched = true;
  const orig = window.fetch.bind(window);
  window.fetch = async (...args: Parameters<typeof fetch>) => {
    const url = typeof args[0] === "string" ? args[0] : (args[0] as Request).url;
    // Skip telemetry calls (record_span RPC + analytics) — prevent loops
    if (url.includes("record_span") || url.includes("/rpc/record_span")) return orig(...args);
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
      const dur = performance.now() - t0;
      if (dur >= 5) {
        recordSpan({
          op: `fetch ${shortenUrl(url)}`,
          started_at: started.toISOString(),
          ended_at: new Date().toISOString(),
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
    return url.pathname.slice(0, 120);
  } catch { return u.slice(0, 120); }
}

// Route change instrumentation
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

// Web-vitals (LCP / longtask) lightweight observer
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
