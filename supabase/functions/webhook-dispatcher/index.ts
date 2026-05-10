// Webhook dispatcher — invoked by pg cron (or manually).
// Picks unack anomaly_events / fresh account_freezes and POSTs to active webhook_subscriptions.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function hmacSha256Hex(key: string, msg: string): Promise<string> {
  const enc = new TextEncoder();
  const ck = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", ck, enc.encode(msg));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Authorization: accept either (a) service-role bearer (cron), or (b) authenticated admin user.
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const isServiceRole = SERVICE_KEY ? timingSafeEqual(token, SERVICE_KEY) : false;
  const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  if (!isServiceRole) {
    // Validate JWT via service-role client (supabase-js 2.45.0 compatible)
    const { data: userData, error: userErr } = await sb.auth.getUser(token);
    const uid = userData?.user?.id;
    if (userErr || !uid) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: isAdmin } = await sb.rpc("has_role", { _user_id: uid, _role: "admin" });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  // Pull active subscriptions
  const { data: subs } = await sb.from("webhook_subscriptions").select("*").eq("active", true);
  if (!subs || subs.length === 0) {
    return new Response(JSON.stringify({ ok: true, delivered: 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Build event batch from last 5 minutes
  const since = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const [{ data: anomalies }, { data: freezes }] = await Promise.all([
    sb.from("anomaly_events").select("id,user_id,rule,severity,created_at").gte("created_at", since).eq("acknowledged", false),
    sb.from("account_freezes").select("id,user_id,reason,severity,frozen_at,expires_at").gte("frozen_at", since),
  ]);

  const events: Array<{ event: string; data: any }> = [
    ...(anomalies ?? []).map(a => ({ event: "anomaly", data: a })),
    ...(freezes ?? []).map(f => ({ event: "freeze", data: f })),
  ];
  if (events.length === 0) {
    return new Response(JSON.stringify({ ok: true, delivered: 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let delivered = 0;
  for (const sub of subs) {
    const subscribed = events.filter(e => (sub.events ?? []).includes(e.event));
    if (subscribed.length === 0) continue;
    const body = JSON.stringify({ events: subscribed, generated_at: new Date().toISOString() });
    const ts = Math.floor(Date.now() / 1000).toString();
    const signature = await hmacSha256Hex(sub.secret, `${ts}.${body}`);

    let status = 0; let errMsg: string | null = null;
    try {
      const r = await fetch(sub.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Phonara-Timestamp": ts,
          "X-Phonara-Signature": `sha256=${signature}`,
        },
        body,
      });
      status = r.status;
    } catch (e) {
      errMsg = (e as Error).message;
    }

    await sb.from("webhook_deliveries").insert({
      subscription_id: sub.id,
      event: subscribed.map(e => e.event).join(","),
      payload: JSON.parse(body),
      http_status: status || null,
      error: errMsg,
    });
    await sb.from("webhook_subscriptions").update({
      last_delivered_at: new Date().toISOString(),
      last_status: status || null,
    }).eq("id", sub.id);

    if (status >= 200 && status < 300) delivered++;
  }

  return new Response(JSON.stringify({ ok: true, delivered, total_subs: subs.length, events: events.length }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
