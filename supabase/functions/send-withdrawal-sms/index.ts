// Sends SMS for withdrawal status changes via Twilio gateway.
// Invoked by DB trigger via pg_net.http_post.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/twilio";

interface Payload {
  user_id: string;
  status: string;
  amount?: number;
  request_id?: string;
}

const STATUS_MSG: Record<string, string> = {
  reviewing: "🔍 출금 검수 중입니다.",
  approved: "✅ 출금이 승인되었습니다. 곧 지급됩니다.",
  completed: "💸 출금 지급이 완료되었습니다.",
  rejected: "⛔ 출금 신청이 거절되었습니다.",
  cancelled: "🚫 출금 요청이 취소되었습니다.",
};

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let m = 0;
  for (let i = 0; i < a.length; i++) m |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return m === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY");
    const TWILIO_FROM = Deno.env.get("TWILIO_FROM_NUMBER");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // AUTH GUARD: only callers presenting the service-role key (DB trigger via pg_net) are allowed.
    const auth = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
    if (!auth || !timingSafeEqual(auth, SERVICE_KEY)) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!LOVABLE_API_KEY || !TWILIO_API_KEY || !TWILIO_FROM) {
      return new Response(JSON.stringify({ error: "twilio_not_configured" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as Payload;
    const msg = STATUS_MSG[body.status];
    if (!msg || !body.user_id) {
      return new Response(JSON.stringify({ skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: profile } = await sb
      .from("profiles")
      .select("phone")
      .eq("id", body.user_id)
      .maybeSingle();
    const phone = profile?.phone?.trim();
    if (!phone) {
      return new Response(JSON.stringify({ skipped: "no_phone" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const text = `[Phonara] ${msg}${body.amount ? ` 금액: ${body.amount}` : ""}`;
    const tw = await fetch(`${GATEWAY_URL}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": TWILIO_API_KEY,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: phone, From: TWILIO_FROM, Body: text }),
    });
    const data = await tw.json();
    if (!tw.ok) {
      console.error("Twilio error", tw.status, data);
      return new Response(JSON.stringify({ error: "twilio_failed", status: tw.status, data }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ ok: true, sid: data.sid }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
