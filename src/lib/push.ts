import { supabase } from "@/integrations/supabase/client";

// Public VAPID key — safe to embed in client.
export const VAPID_PUBLIC_KEY =
  "BGqXPodts2tt4ZiOI1tZww8BgisT2_VEJufNW1iIDA8RcEjAYO7JasGuMbrjDBwU6l7KUQEE-4HKP2CQd8DYPqw";

const SW_PATH = "/sw-push.js";

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i);
  return out;
}

async function ensureRegistration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration(SW_PATH);
  if (existing) return existing;
  return navigator.serviceWorker.register(SW_PATH, { scope: "/" });
}

export async function getPushPermission(): Promise<NotificationPermission> {
  if (!isPushSupported()) return "denied";
  return Notification.permission;
}

export async function subscribePush(): Promise<{ ok: boolean; reason?: string }> {
  if (!isPushSupported()) return { ok: false, reason: "이 브라우저는 푸시 알림을 지원하지 않습니다." };
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return { ok: false, reason: "알림 권한이 거부되었습니다." };

  const reg = await ensureRegistration();
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY).buffer as ArrayBuffer,
    }));

  const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    return { ok: false, reason: "구독 정보를 가져오지 못했습니다." };
  }

  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return { ok: false, reason: "로그인이 필요합니다." };

  const { error } = await supabase
    .from("push_subscriptions")
    .upsert(
      {
        user_id: u.user.id,
        endpoint: json.endpoint,
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
        user_agent: navigator.userAgent.slice(0, 200),
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "user_id,endpoint" },
    );
  if (error) return { ok: false, reason: error.message };
  return { ok: true };
}

export async function unsubscribePush(): Promise<{ ok: boolean }> {
  if (!isPushSupported()) return { ok: false };
  const reg = await navigator.serviceWorker.getRegistration(SW_PATH);
  const sub = await reg?.pushManager.getSubscription();
  const endpoint = sub?.endpoint;
  if (sub) await sub.unsubscribe();
  if (endpoint) {
    const { data: u } = await supabase.auth.getUser();
    if (u.user) {
      await supabase.from("push_subscriptions").delete().eq("user_id", u.user.id).eq("endpoint", endpoint);
    }
  }
  return { ok: true };
}

export async function isPushActive(): Promise<boolean> {
  if (!isPushSupported()) return false;
  if (Notification.permission !== "granted") return false;
  const reg = await navigator.serviceWorker.getRegistration(SW_PATH);
  const sub = await reg?.pushManager.getSubscription();
  return !!sub;
}
