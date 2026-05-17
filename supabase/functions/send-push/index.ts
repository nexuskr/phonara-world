// Web Push dispatcher — called from `notifications` AFTER INSERT trigger via pg_net
// SECURITY: requires service_role JWT (verify_jwt=true). Trigger passes service role key.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import webpush from "https://esm.sh/web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@phonara.world";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  try { webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE); } catch (_) {}
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

function isAuthorizedInternal(req: Request): boolean {
  if (!SERVICE_KEY) return false;
  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  if (!token) return false;
  return timingSafeEqual(token, SERVICE_KEY);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    if (!isAuthorizedInternal(req)) {
      return json({ ok: false, error: "forbidden" }, 403);
    }
    if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
      return new Response(JSON.stringify({ ok: false, error: "VAPID keys not configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const body = await req.json().catch(() => ({}));
    const userId = String(body.user_id || "");
    if (!userId) return json({ ok: false, error: "user_id required" }, 400);

    const title = String(body.title || "Phonara").slice(0, 120);
    const message = String(body.body || "").slice(0, 300);
    const kind = String(body.kind || "general");
    const notifId = body.notification_id || null;
    const icon = typeof body.icon === "string" ? body.icon.slice(0, 200) : "/icon-192.png";
    const badge = typeof body.badge === "string" ? body.badge.slice(0, 200) : "/icon-192.png";

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Phase F: kill switch + per-user daily cap (3/day default). Admin override via body.bypass_cap=true.
    if (!body.bypass_cap) {
      const { data: allowed, error: capErr } = await admin
        .rpc("try_log_push_send", { _user_id: userId, _kind: kind, _daily_cap: 3 });
      if (capErr) return json({ ok: false, error: capErr.message }, 500);
      if (!allowed) return json({ ok: true, sent: 0, throttled: true });
    }

    const { data: subs, error } = await admin
      .from("push_subscriptions")
      .select("id,endpoint,p256dh,auth")
      .eq("user_id", userId);
    if (error) return json({ ok: false, error: error.message }, 500);
    if (!subs || subs.length === 0) return json({ ok: true, sent: 0 });

    // SECURITY: Whitelist-only payload. Never include amount/balance/phon/krw/user_id/PII.
    const payload = JSON.stringify(createSecurePayload({
      title,
      body: message,
      icon,
      badge,
      data: {
        url: payloadUrl(kind),
        type: kind,
        timestamp: Date.now(),
        notification_id: notifId,
      },
    }));

    let sent = 0;
    const expired: string[] = [];
    await Promise.all(subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
          { TTL: 60 * 60 * 24 },
        );
        sent++;
      } catch (e: any) {
        const status = e?.statusCode;
        if (status === 404 || status === 410) expired.push(s.id);
      }
    }));
    if (expired.length) {
      await admin.from("push_subscriptions").delete().in("id", expired);
    }
    return json({ ok: true, sent, expired: expired.length });
  } catch (e: any) {
    return json({ ok: false, error: String(e?.message ?? e) }, 500);
  }
});

function json(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

// Imperial Deep Link router — every push lands on the most relevant focused screen.
// All URLs include `from=push` so the client can apply Imperial Glow on the highlighted element.
function payloadUrl(kind: string): string {
  if (kind === "streak_protect" || kind === "streak_break_risk")
    return "/dashboard?focus=streak&from=push";
  if (kind === "personal_mission" || kind === "mission_reward" || kind === "mission")
    return "/dashboard?focus=mission&from=push";
  if (kind === "comeback_3d" || kind === "comeback_7d" || kind === "comeback_14d" || kind === "comeback_30d")
    return `/dashboard?focus=comeback&campaign=${encodeURIComponent(kind)}&from=push`;
  if (kind === "vip_imperial" || kind === "vip_arrival" || kind.startsWith("vip_"))
    return "/vip?from=push";
  if (kind === "phon_staking" || kind === "phon_dividend" || kind.startsWith("phon_"))
    return "/phon?tab=staking&highlight=true&from=push";
  if (kind === "live_fomo" || kind === "lobby_call" || kind === "whale_strike")
    return "/lobby?from=push";
  if (kind === "jackpot_alert") return "/casino?from=push";
  if (kind.startsWith("withdraw")) return "/wallet?tab=withdraw&from=push";
  if (kind.startsWith("deposit") || kind.startsWith("package")) return "/wallet?tab=deposit&from=push";
  return "/dashboard?from=push";
}

// SECURITY: Strict whitelist payload builder. Strips any non-allowed field.
// Prevents leakage of balances, amounts, PII through Web Push payload.
interface SecurePushPayload {
  title?: string;
  body?: string;
  icon?: string;
  badge?: string;
  data?: {
    url?: string;
    type?: string;
    timestamp?: number;
    notification_id?: string | null;
  };
}
function createSecurePayload(input: SecurePushPayload): SecurePushPayload {
  const d = input.data ?? {};
  return {
    title: typeof input.title === "string" ? input.title.slice(0, 120) : "Phonara",
    body: typeof input.body === "string" ? input.body.slice(0, 300) : "",
    icon: typeof input.icon === "string" ? input.icon.slice(0, 200) : "/icon-192.png",
    badge: typeof input.badge === "string" ? input.badge.slice(0, 200) : "/icon-192.png",
    data: {
      url: typeof d.url === "string" ? d.url.slice(0, 300) : "/dashboard",
      type: typeof d.type === "string" ? d.type.slice(0, 64) : "general",
      timestamp: typeof d.timestamp === "number" ? d.timestamp : Date.now(),
      notification_id: typeof d.notification_id === "string" ? d.notification_id : null,
    },
  };
}
