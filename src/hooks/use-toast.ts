/**
 * use-toast — legacy compatibility shim.
 *
 * The project standardized on a single Sonner-powered toaster styled with
 * lux glass tokens (see `@/components/ui/sonner.tsx`). All toast calls,
 * including legacy radix-style `toast({ title, description, variant })`
 * usages across ~45 files, are routed through `@/lib/notify` so every
 * notification gets the same look-and-feel automatically.
 *
 * Do NOT add new code that imports from this file. Use `notify` directly:
 *   import { notify } from "@/lib/notify";
 *   notify.error("제목", { description: "설명" });
 */
import * as React from "react";
import { notify } from "@/lib/notify";

type Variant = "default" | "destructive" | "success" | "warning" | "info";

type ToastInput = {
  title?: React.ReactNode;
  description?: React.ReactNode;
  variant?: Variant;
  action?: React.ReactNode;
  duration?: number;
};

type ToastReturn = { id: string | number; dismiss: () => void; update: () => void };

function classify(variant?: Variant) {
  if (variant === "destructive") return "error" as const;
  if (variant === "success") return "success" as const;
  if (variant === "warning") return "warning" as const;
  if (variant === "info") return "info" as const;
  return "message" as const;
}

function toast({ title, description, variant, duration }: ToastInput = {}): ToastReturn {
  const kind = classify(variant);
  const message = title ?? description ?? "";
  const id = notify[kind](message as React.ReactNode, {
    description: title ? description : undefined,
    duration,
  });
  return {
    id: id as string | number,
    dismiss: () => notify.dismiss(id as string | number),
    update: () => {},
  };
}

function useToast() {
  return {
    toast,
    dismiss: (toastId?: string | number) => notify.dismiss(toastId),
    toasts: [] as Array<{ id: string }>, // legacy <Toaster /> renders nothing now
  };
}

export { useToast, toast };
