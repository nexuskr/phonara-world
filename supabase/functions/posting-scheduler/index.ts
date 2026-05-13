// Marks due `pending` posting_schedule_queue rows as `queued` for downstream uploaders.
// Region best-time map: simple heuristic by hour-of-day in UTC.
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

  const now = new Date().toISOString();
  const { data: due, error } = await sb
    .from("posting_schedule_queue")
    .select("id, video_id, region, scheduled_at")
    .eq("status", "pending")
    .lte("scheduled_at", now)
    .order("scheduled_at", { ascending: true })
    .limit(200);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const ids = (due ?? []).map((r) => r.id);
  if (ids.length) {
    const { error: upErr } = await sb
      .from("posting_schedule_queue")
      .update({ status: "queued" })
      .in("id", ids);
    if (upErr) {
      return new Response(JSON.stringify({ error: upErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  return new Response(JSON.stringify({ ok: true, queued: ids.length }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
