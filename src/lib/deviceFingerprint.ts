import { supabase } from "@/integrations/supabase/client";
import { getVerifiedUser } from "@/lib/auth-recovery";

const STORAGE_KEY = "phonara.device.fp.v1";
const SESSION_FLAG = "phonara.device.registered";
const DISABLED_FLAG = "phonara_disable_register_device_rpc";

async function sha256Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function collectSignals(): string {
  const nav: any = navigator;
  const parts = [
    nav.userAgent ?? "",
    nav.language ?? "",
    (nav.languages ?? []).join(","),
    nav.platform ?? "",
    String(nav.hardwareConcurrency ?? ""),
    String(nav.deviceMemory ?? ""),
    `${screen.width}x${screen.height}x${screen.colorDepth}`,
    String(new Date().getTimezoneOffset()),
    Intl.DateTimeFormat().resolvedOptions().timeZone ?? "",
  ];
  // Add a stable random salt persisted in localStorage so the fingerprint is
  // stable across sessions but distinct per browser profile.
  let salt = "";
  try {
    salt = localStorage.getItem(STORAGE_KEY) ?? "";
    if (!salt) {
      salt = crypto.randomUUID();
      localStorage.setItem(STORAGE_KEY, salt);
    }
  } catch {}
  parts.push(salt);
  return parts.join("|");
}

export async function getFingerprint(): Promise<string> {
  return sha256Hex(collectSignals());
}

/**
 * Register the current device with the backend.
 * Logs `anomaly_events.new_device` automatically when a previously-unseen
 * fingerprint appears for an account that already has registered devices.
 * Safe to call repeatedly — once per session is enough.
 */
export async function registerCurrentDevice(): Promise<void> {
  try {
    if (sessionStorage.getItem(DISABLED_FLAG) === "1") return;
    if (sessionStorage.getItem(SESSION_FLAG) === "1") return;
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session?.access_token) return;
    const user = await getVerifiedUser();
    if (!user) return;
    const fp = await getFingerprint();
    const { error } = await (supabase as any).rpc("register_device", {
      _fp: fp,
      _ua: (navigator.userAgent ?? "").slice(0, 256),
    });
    if (error) {
      sessionStorage.setItem(DISABLED_FLAG, "1");
      console.warn("[device] register_device disabled:", error.message ?? error);
      return;
    }
    sessionStorage.setItem(SESSION_FLAG, "1");
  } catch (err) {
    // Silent — device registration must never break the app.
    console.warn("[device] register failed:", err);
  }
}
