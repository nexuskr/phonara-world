/**
 * Sprint 4 — Client Metrics adapter
 * Routes web-vitals + FPS + haptic/swipe success to the `imperial-metrics-batch`
 * edge function. Never writes to the DB directly.
 *
 * Graceful off: kill switch `client_metrics` OFF, saveData, prefers-reduced-motion,
 * hardwareConcurrency <= 2.
 */
import { supabase } from "@/integrations/supabase/client";

type Metric =
  | "inp" | "lcp" | "cls" | "fps_sample"
  | "haptic_ok" | "haptic_fail" | "swipe_ok" | "swipe_fail";

interface Event {
  route: string;
  metric: Metric;
  value: number;
  meta?: Record<string, string | number | boolean>;
}

const QUEUE: Event[] = [];
let FLUSH_TIMER: number | null = null;
let LAST_FLUSH = 0;
const FLUSH_INTERVAL_MS = 10_000;
const MAX_QUEUE = 50;

let DISABLED = false;
let BOOTED = false;

function shouldDisable(): boolean {
  try {
    if (typeof navigator === "undefined") return true;
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (conn?.saveData) return true;
    if (typeof window !== "undefined") {
      if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) return true;
    }
    const cores = (navigator as Navigator & { hardwareConcurrency?: number }).hardwareConcurrency;
    if (typeof cores === "number" && cores <= 2) return true;
  } catch { /* noop */ }
  return false;
}

function deviceMeta(): Record<string, string | number | boolean> {
  const meta: Record<string, string | number | boolean> = {};
  try {
    const cores = (navigator as Navigator & { hardwareConcurrency?: number }).hardwareConcurrency;
    if (typeof cores === "number") {
      meta.hw_concurrency = cores;
      meta.device_tier = cores <= 4 ? "low" : cores <= 8 ? "mid" : "high";
    }
    meta.reduced_motion = !!window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  } catch { /* noop */ }
  return meta;
}

function currentRoute(): string {
  try {
    const p = window.location.pathname || "/";
    return /^\/[a-z0-9/_-]{0,80}$/i.test(p) ? p : "/";
  } catch { return "/"; }
}

function scheduleFlush() {
  if (FLUSH_TIMER != null) return;
  FLUSH_TIMER = window.setTimeout(flush, FLUSH_INTERVAL_MS);
}

async function flush() {
  FLUSH_TIMER = null;
  if (DISABLED) { QUEUE.length = 0; return; }
  if (QUEUE.length === 0) return;
  const now = Date.now();
  if (now - LAST_FLUSH < 8_000) { scheduleFlush(); return; }
  LAST_FLUSH = now;
  const events = QUEUE.splice(0, MAX_QUEUE);
  try {
    await supabase.functions.invoke("imperial-metrics-batch", { body: { events } });
  } catch {
    // best-effort; drop on failure to avoid memory growth
  }
}

export function recordMetric(metric: Metric, value: number, extra?: Record<string, string | number | boolean>) {
  if (DISABLED) return;
  if (!Number.isFinite(value)) return;
  QUEUE.push({
    route: currentRoute(),
    metric,
    value,
    meta: { ...deviceMeta(), ...(extra ?? {}) },
  });
  if (QUEUE.length >= MAX_QUEUE) flush();
  else scheduleFlush();
}

let FPS_TIMER: number | null = null;
function startFpsSampler() {
  if (FPS_TIMER != null) return;
  const sampleOnce = () => {
    if (DISABLED) return;
    if (currentRoute() !== "/duel") return;
    let frames = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      frames++;
      if (t - t0 < 5000) requestAnimationFrame(tick);
      else {
        const fps = Math.round((frames * 1000) / (t - t0));
        recordMetric("fps_sample", fps);
      }
    };
    requestAnimationFrame(tick);
  };
  FPS_TIMER = window.setInterval(sampleOnce, 30_000);
  sampleOnce();
}

async function bootWebVitals() {
  try {
    const wv = await import("web-vitals");
    wv.onINP?.((m: { value: number }) => recordMetric("inp", m.value));
    wv.onLCP?.((m: { value: number }) => recordMetric("lcp", m.value));
    wv.onCLS?.((m: { value: number }) => recordMetric("cls", m.value));
  } catch { /* web-vitals optional */ }
}

async function checkKillSwitch(): Promise<boolean> {
  try {
    const { data } = await supabase
      .from("platform_kill_switches")
      .select("enabled")
      .eq("key", "client_metrics")
      .maybeSingle();
    // Default ON when row missing or enabled=true. OFF only when explicit enabled=false.
    if (data && data.enabled === false) return false;
    return true;
  } catch {
    return true;
  }
}

export async function bootClientMetrics() {
  if (BOOTED) return;
  BOOTED = true;
  if (shouldDisable()) { DISABLED = true; return; }
  const on = await checkKillSwitch();
  if (!on) { DISABLED = true; return; }

  bootWebVitals();
  startFpsSampler();

  // flush on page hide
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush();
  });
}

// Wrappers for haptic / swipe success/failure are exposed for the lobby code to import.
export function noteHaptic(ok: boolean) {
  recordMetric(ok ? "haptic_ok" : "haptic_fail", 1);
}
export function noteSwipe(ok: boolean) {
  recordMetric(ok ? "swipe_ok" : "swipe_fail", 1);
}
