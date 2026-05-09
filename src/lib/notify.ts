/**
 * notify — single source of truth for toast notifications.
 *
 * All app code should import from here instead of calling sonner.toast directly,
 * so we can:
 *  - guarantee consistent visual style (design tokens)
 *  - centralize copy ("문제가 발생했습니다" 등)
 *  - normalize unknown errors into user-friendly Korean messages
 */
import { toast as sonner, type ExternalToast } from "sonner";

type Opts = ExternalToast & { description?: React.ReactNode };

const baseClass =
  "border border-border/60 bg-card/95 text-foreground backdrop-blur-xl shadow-[0_8px_32px_hsl(240_50%_1%/0.7)]";

const variantClass = {
  success: "border-primary/40",
  error: "border-destructive/50",
  info: "border-secondary/40",
  warning: "border-accent/40",
  default: "",
} as const;

function fmt(message: React.ReactNode, variant: keyof typeof variantClass, opts?: Opts) {
  return {
    ...opts,
    className: [baseClass, variantClass[variant], opts?.className ?? ""].filter(Boolean).join(" "),
  };
}

/** Normalize unknown errors (Error, Supabase PostgrestError, string, unknown). */
export function describeError(err: unknown, fallback = "잠시 후 다시 시도해 주세요."): string {
  if (!err) return fallback;
  if (typeof err === "string") return err;
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === "object") {
    const anyErr = err as { message?: string; error_description?: string; hint?: string };
    return anyErr.message || anyErr.error_description || anyErr.hint || fallback;
  }
  return fallback;
}

export const notify = {
  success: (message: React.ReactNode, opts?: Opts) =>
    sonner.success(message, fmt(message, "success", opts)),
  error: (message: React.ReactNode, opts?: Opts) =>
    sonner.error(message, fmt(message, "error", opts)),
  info: (message: React.ReactNode, opts?: Opts) =>
    sonner.info?.(message, fmt(message, "info", opts)) ?? sonner(message, fmt(message, "info", opts)),
  warning: (message: React.ReactNode, opts?: Opts) =>
    sonner.warning?.(message, fmt(message, "warning", opts)) ??
    sonner(message, fmt(message, "warning", opts)),
  message: (message: React.ReactNode, opts?: Opts) => sonner(message, fmt(message, "default", opts)),
  /** Convenience: report an unknown error with a Korean fallback. */
  fail: (title: string, err?: unknown, opts?: Opts) =>
    sonner.error(title, fmt(title, "error", { description: describeError(err), ...opts })),
  promise: sonner.promise.bind(sonner),
  dismiss: sonner.dismiss.bind(sonner),
};

export type Notify = typeof notify;
