// LINE Messaging API push dispatcher
// Called by notifications AFTER INSERT trigger via pg_net (service_role auth).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LINE_TOKEN = Deno.env.get("LINE_CHANNEL_ACCESS_TOKEN") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let m = 0;
  for (let i = 0; i < a.length; i++) m |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return m === 0;
}
function isInternal(req: Request): boolean {
  if (!SERVICE_KEY) return false;
  const t = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  return !!t && timingSafeEqual(t, SERVICE_KEY);
}
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    if (!isInternal(req)) return json({ ok: false, error: "forbidden" }, 403);
    if (!LINE_TOKEN) return json({ ok: true, skipped: "no_token" });

    const body = await req.json().catch(() => ({}));
    const userId = String(body.user_id ?? "");
    if (!userId) return json({ ok: false, error: "user_id required" }, 400);
    const title = String(body.title ?? "Phonara").slice(0, 100);
    const message = String(body.body ?? "").slice(0, 280);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: sub } = await admin
      .from("line_subscriptions")
      .select("line_user_id")
      .eq("user_id", userId)
      .is("unlinked_at", null)
      .maybeSingle();
    if (!sub?.line_user_id) return json({ ok: true, sent: 0 });

    const text = title ? `【${title}】\n${message}` : message;
    const r = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LINE_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: sub.line_user_id,
        messages: [{ type: "text", text }],
      }),
    });
    if (!r.ok) {
      const err = await r.text();
      return json({ ok: false, status: r.status, error: err.slice(0, 200) }, 200);
    }
    return json({ ok: true, sent: 1 });
  } catch (e: any) {
    return json({ ok: false, error: String(e?.message ?? e) }, 200);
  }
});
