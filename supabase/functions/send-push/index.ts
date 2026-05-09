// Web Push dispatcher — called from `notifications` AFTER INSERT trigger via pg_net
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
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

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: subs, error } = await admin
      .from("push_subscriptions")
      .select("id,endpoint,p256dh,auth")
      .eq("user_id", userId);
    if (error) return json({ ok: false, error: error.message }, 500);
    if (!subs || subs.length === 0) return json({ ok: true, sent: 0 });

    const payload = JSON.stringify({
      title, body: message, kind, notification_id: notifId,
      url: payloadUrl(kind),
    });

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

function payloadUrl(kind: string): string {
  if (kind.startsWith("withdraw")) return "/wallet";
  if (kind.startsWith("deposit") || kind.startsWith("package")) return "/wallet";
  return "/dashboard";
}
