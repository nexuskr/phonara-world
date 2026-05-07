import { supabase } from "@/integrations/supabase/client";

let lastSent = 0;
let sentCount = 0;
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 20;

/** Send a runtime error to the backend error_logs table. Rate-limited to 20/min. */
export async function logClientError(
  message: string,
  opts: { stack?: string; context?: Record<string, unknown>; level?: "error" | "warn" | "info" } = {}
) {
  const now = Date.now();
  if (now - lastSent > WINDOW_MS) { sentCount = 0; lastSent = now; }
  if (sentCount >= MAX_PER_WINDOW) return;
  sentCount++;
  try {
    await supabase.rpc("log_client_error", {
      _message: message,
      _stack: opts.stack ?? null,
      _url: typeof window !== "undefined" ? window.location.href : null,
      _user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      _context: (opts.context ?? {}) as never,
      _level: opts.level ?? "error",
    });
  } catch {
    // Swallow — never let the logger crash the app
  }
}

/** Install global error & unhandled-rejection listeners. Call once at app boot. */
export function installGlobalErrorLogging() {
  if (typeof window === "undefined") return;
  if ((window as any).__pm_err_installed) return;
  (window as any).__pm_err_installed = true;

  window.addEventListener("error", (e) => {
    void logClientError(e.message || "window.onerror", {
      stack: e.error?.stack,
      context: { type: "window.error", filename: e.filename, lineno: e.lineno, colno: e.colno },
    });
  });

  window.addEventListener("unhandledrejection", (e) => {
    const reason: any = e.reason;
    void logClientError(
      typeof reason === "string" ? reason : reason?.message ?? "unhandledrejection",
      { stack: reason?.stack, context: { type: "unhandledrejection" } }
    );
  });
}
