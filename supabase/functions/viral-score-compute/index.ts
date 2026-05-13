// Computes viral_score per video from feed_events in the last 24h.
// viral_score = watch_3s_rate*0.3 + completion_rate*0.4 + share_rate*0.3
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let m = 0;
  for (let i = 0; i < a.length; i++) m |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return m === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!token || !key || !timingSafeEqual(token, key)) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const sb = createClient(url, key);

  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { data: events, error } = await sb
    .from("feed_events")
    .select("video_id, event_type")
    .gte("created_at", since)
    .limit(50000);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const agg = new Map<string, { v: number; w3: number; c: number; s: number }>();
  for (const e of events ?? []) {
    const a = agg.get(e.video_id) ?? { v: 0, w3: 0, c: 0, s: 0 };
    if (e.event_type === "view") a.v++;
    else if (e.event_type === "3s") a.w3++;
    else if (e.event_type === "complete") a.c++;
    else if (e.event_type === "share") a.s++;
    agg.set(e.video_id, a);
  }

  const rows = [...agg.entries()].map(([video_id, a]) => {
    const v = Math.max(a.v, 1);
    const w3 = a.w3 / v;
    const cr = a.c / v;
    const sr = a.s / v;
    return {
      video_id,
      watch_3s_rate: w3,
      completion_rate: cr,
      share_rate: sr,
      viral_score: w3 * 0.3 + cr * 0.4 + sr * 0.3,
      updated_at: new Date().toISOString(),
    };
  });

  let upserted = 0;
  if (rows.length) {
    const { error: upErr } = await sb.from("viral_metrics").upsert(rows, { onConflict: "video_id" });
    if (upErr) {
      return new Response(JSON.stringify({ error: upErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    upserted = rows.length;
  }

  return new Response(JSON.stringify({ ok: true, upserted, window_hours: 24 }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
