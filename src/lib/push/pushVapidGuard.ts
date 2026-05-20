// PR-P0-6: VAPID key rotation guard.
// On VAPID public-key rotation, the old PushSubscription becomes unusable.
// We fingerprint the key in localStorage and, on mismatch, silently
// unsubscribe the stale subscription so the next subscribe() call mints
// a fresh one tied to the new applicationServerKey.

import { supabase } from "@/integrations/supabase/client";

const SW_PATH = "/sw-push.js";
const LS_KEY = "phonara:push:vapid_fp";

async function fingerprint(key: string): Promise<string> {
  try {
    const buf = new TextEncoder().encode(key);
    const hash = await crypto.subtle.digest("SHA-256", buf);
    const bytes = new Uint8Array(hash).slice(0, 8);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    let h = 0;
    for (let i = 0; i < key.length; i++) h = ((h << 5) - h + key.charCodeAt(i)) | 0;
    return `f${(h >>> 0).toString(16)}`;
  }
}

/**
 * Ensure the stored VAPID fingerprint matches the current key.
 * If it differs (rotation), unsubscribe any existing PushSubscription
 * and delete it server-side. Returns `true` if a rotation was handled.
 *
 * Silent: never throws, never toasts. Designed to run on mount.
 */
export async function ensureVapidConsistent(currentKey: string): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;

  let stored: string | null = null;
  try { stored = localStorage.getItem(LS_KEY); } catch {}

  const fp = await fingerprint(currentKey);
  if (stored === fp) return false;

  try {
    const reg = await navigator.serviceWorker.getRegistration(SW_PATH);
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      const endpoint = sub.endpoint;
      try { await sub.unsubscribe(); } catch {}
      try {
        const { data: u } = await supabase.auth.getUser();
        if (u.user) {
          await supabase
            .from("push_subscriptions")
            .delete()
            .eq("user_id", u.user.id)
            .eq("endpoint", endpoint);
        }
      } catch {}
    }
  } catch {
    // best-effort
  }

  try { localStorage.setItem(LS_KEY, fp); } catch {}
  return true;
}

/** Store current key fingerprint after a successful (re)subscribe. */
export async function rememberVapidKey(currentKey: string): Promise<void> {
  try {
    const fp = await fingerprint(currentKey);
    localStorage.setItem(LS_KEY, fp);
  } catch {}
}
