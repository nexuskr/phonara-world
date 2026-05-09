// Receipt OCR — admin auto-verification helper.
// Sends a receipt image URL to Lovable AI Gateway (gemini-2.5-flash) and asks
// it to extract { amount, datetime, sender, receiver, currency, confidence }.
// Returns a structured JSON the admin UI can compare against the deposit_request.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const ANON = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

const SYSTEM = `You are a strict OCR engine for Korean bank-transfer / payment receipts.
Return ONLY valid JSON (no prose) with this schema:
{"amount": number|null, "currency": "KRW"|"USD"|null,
 "datetime_iso": string|null, "sender": string|null, "receiver": string|null,
 "memo": string|null, "confidence": 0..1}
Numbers must NOT contain commas. If unreadable return all nulls and confidence 0.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    if (!LOVABLE_API_KEY) return json({ ok: false, error: "LOVABLE_API_KEY missing" }, 500);

    // require an authenticated admin
    const auth = req.headers.get("Authorization") ?? "";
    if (!auth) return json({ ok: false, error: "auth required" }, 401);
    const sb = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: auth } } });
    const { data: u } = await sb.auth.getUser();
    if (!u?.user) return json({ ok: false, error: "auth required" }, 401);
    const { data: isAdmin } = await sb.rpc("has_role" as any, {
      _user_id: u.user.id, _role: "admin",
    });
    if (!isAdmin) return json({ ok: false, error: "admin only" }, 403);

    const { image_url, expected_amount } = await req.json().catch(() => ({}));
    if (!image_url || typeof image_url !== "string") return json({ ok: false, error: "image_url required" }, 400);

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM },
          {
            role: "user",
            content: [
              { type: "text", text: "Extract the structured fields from this receipt image." },
              { type: "image_url", image_url: { url: image_url } },
            ],
          },
        ],
      }),
    });

    if (r.status === 429) return json({ ok: false, error: "rate_limited" }, 429);
    if (r.status === 402) return json({ ok: false, error: "credits_exhausted" }, 402);
    if (!r.ok) {
      const txt = await r.text();
      return json({ ok: false, error: `ai_gateway_error: ${txt.slice(0, 200)}` }, 500);
    }
    const j = await r.json();
    const raw = j?.choices?.[0]?.message?.content ?? "";
    let parsed: any = null;
    try {
      const cleaned = String(raw).replace(/```json|```/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch (_) {
      parsed = { amount: null, confidence: 0, parse_error: true, raw: String(raw).slice(0, 400) };
    }

    let match: null | "exact" | "near" | "mismatch" = null;
    if (typeof expected_amount === "number" && typeof parsed?.amount === "number") {
      const diff = Math.abs(parsed.amount - expected_amount);
      match = diff === 0 ? "exact" : diff / expected_amount <= 0.01 ? "near" : "mismatch";
    }

    return json({ ok: true, ocr: parsed, expected_amount: expected_amount ?? null, match });
  } catch (e: any) {
    return json({ ok: false, error: String(e?.message ?? e) }, 500);
  }
});

function json(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
