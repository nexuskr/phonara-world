/**
 * Legacy radix-toaster — replaced by the unified Sonner toaster.
 * Kept as a no-op so existing imports (`<Toaster />` from `@/components/ui/toaster`)
 * keep working without any visual side effects. All toasts now render via
 * `@/components/ui/sonner` styled with lux glass tokens.
 */
export function Toaster() {
  return null;
}
