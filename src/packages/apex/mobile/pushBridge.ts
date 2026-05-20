/**
 * P3-E — Native push token registration → push_subscriptions table.
 * Reuses the existing web push_subscriptions schema (endpoint = "native:<token>").
 */
import { supabase } from "@/integrations/supabase/client";
import { detectNative } from "./nativeBridge";

export async function registerNativePush(): Promise<{ ok: boolean; reason?: string }> {
  const caps = await detectNative();
  if (!caps.isNative) return { ok: false, reason: "web" };
  try {
    // @ts-expect-error optional capacitor dep
    const mod = await import(/* @vite-ignore */ "@capacitor/push-notifications").catch(() => null);
    if (!mod) return { ok: false, reason: "plugin_missing" };
    const PushNotifications = (mod as { PushNotifications: {
      requestPermissions: () => Promise<{ receive: string }>;
      register: () => Promise<void>;
      addListener: (event: string, cb: (data: { value?: string; error?: string }) => void) => Promise<unknown>;
    } }).PushNotifications;

    const perm = await PushNotifications.requestPermissions();
    if (perm.receive !== "granted") return { ok: false, reason: "denied" };
    await PushNotifications.register();

    return new Promise((resolve) => {
      let resolved = false;
      PushNotifications.addListener("registration", async (token) => {
        if (resolved || !token.value) return;
        resolved = true;
        const { data: u } = await supabase.auth.getUser();
        if (!u.user) return resolve({ ok: false, reason: "no_auth" });
        await supabase.from("push_subscriptions").upsert(
          {
            user_id: u.user.id,
            endpoint: `native:${caps.platform}:${token.value}`,
            p256dh: "native",
            auth: "native",
            user_agent: `Capacitor/${caps.platform}`,
            last_seen_at: new Date().toISOString(),
          },
          { onConflict: "user_id,endpoint" },
        );
        resolve({ ok: true });
      });
      PushNotifications.addListener("registrationError", (err) => {
        if (resolved) return;
        resolved = true;
        resolve({ ok: false, reason: err.error ?? "register_error" });
      });
      setTimeout(() => { if (!resolved) { resolved = true; resolve({ ok: false, reason: "timeout" }); } }, 8000);
    });
  } catch (e) {
    return { ok: false, reason: (e as Error).message };
  }
}
