/**
 * P3-E — Capacitor native bridge with graceful web fallback.
 * If @capacitor/core is not installed (web build), all calls no-op safely.
 */
export interface NativeCaps {
  isNative: boolean;
  platform: "ios" | "android" | "web";
}

let cached: NativeCaps | null = null;

export async function detectNative(): Promise<NativeCaps> {
  if (cached) return cached;
  try {
    // @ts-expect-error optional capacitor dep
    const mod = await import(/* @vite-ignore */ "@capacitor/core").catch(() => null);
    if (!mod) return (cached = { isNative: false, platform: "web" });
    const Capacitor = (mod as { Capacitor?: { isNativePlatform: () => boolean; getPlatform: () => string } }).Capacitor;
    if (!Capacitor?.isNativePlatform?.()) return (cached = { isNative: false, platform: "web" });
    return (cached = { isNative: true, platform: Capacitor.getPlatform() as "ios" | "android" });
  } catch {
    return (cached = { isNative: false, platform: "web" });
  }
}

export async function setStatusBarStyle(_dark = true): Promise<void> {
  try {
    // @ts-expect-error optional capacitor dep
    const mod = await import(/* @vite-ignore */ "@capacitor/status-bar").catch(() => null);
    if (!mod) return;
    const { StatusBar, Style } = mod as { StatusBar: { setStyle: (opts: { style: unknown }) => Promise<void> }; Style: { Dark: unknown; Light: unknown } };
    await StatusBar.setStyle({ style: _dark ? Style.Dark : Style.Light });
  } catch { /* noop */ }
}
