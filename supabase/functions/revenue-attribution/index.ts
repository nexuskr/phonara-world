// V17 revenue-attribution: links a revenue_event to its driving video + referrer.
// Admin-only invocation (uses record_revenue_event RPC which gates on admin).
// Body: { user_id?, source, amount_krw, attribution_video_id?, attribution_referrer?, meta? }
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

interface Body {
  user_id?: string | null;
  source: "subscription" | "ad" | "fee" | "other";
  amount_krw: number;
  attribution_video_id?: string | null;
  attribution_referrer?: string | null;
  meta?: Record<string, unknown>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const auth = req.headers.get("Authorization") ?? "";
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: auth } },
  });

  let body: Body;
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!body?.source || typeof body.amount_krw !== "number") {
    return new Response(JSON.stringify({ error: "missing_fields" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Best-effort attribution enrichment: if video_id present, fetch viral_score for meta context.
  let viral_score: number | null = null;
  if (body.attribution_video_id) {
    const { data } = await sb.from("viral_metrics")
      .select("viral_score").eq("video_id", body.attribution_video_id).maybeSingle();
    viral_score = (data as any)?.viral_score ?? null;
  }

  const { data, error } = await (sb as any).rpc("record_revenue_event", {
    _user_id: body.user_id ?? null,
    _source: body.source,
    _amount_krw: body.amount_krw,
    _attribution_video_id: body.attribution_video_id ?? null,
    _attribution_referrer: body.attribution_referrer ?? null,
    _meta: { ...(body.meta ?? {}), viral_score, attributed_at: new Date().toISOString() },
  });
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  return new Response(JSON.stringify({ ok: true, id: data, viral_score }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
