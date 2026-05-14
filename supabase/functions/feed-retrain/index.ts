// V17 feed-retrain: recompute persona/mode for active users from last 7d feed_events.
// Heuristic personas based on share/completion/like ratios.
// Service role bypasses RLS to upsert any user's profile.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

function isAuthorizedCron(req: Request): boolean {
  const expected = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!expected) return false;
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return false;
  return timingSafeEqual(token, expected);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  if (!isAuthorizedCron(req)) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
  const { data: events, error } = await sb
    .from("feed_events")
    .select("user_id, event_type, region")
    .gte("created_at", since)
    .not("user_id", "is", null)
    .limit(50000);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  type Agg = { v: number; c: number; s: number; l: number; sk: number; region?: string };
  const byUser = new Map<string, Agg>();
  for (const e of (events ?? []) as Array<{ user_id: string; event_type: string; region: string | null }>) {
    const a = byUser.get(e.user_id) ?? { v: 0, c: 0, s: 0, l: 0, sk: 0 };
    if (e.event_type === "view") a.v++;
    else if (e.event_type === "complete") a.c++;
    else if (e.event_type === "share") a.s++;
    else if (e.event_type === "like") a.l++;
    else if (e.event_type === "skip") a.sk++;
    if (e.region && !a.region) a.region = e.region;
    byUser.set(e.user_id, a);
  }

  const rows = [...byUser.entries()]
    .filter(([, a]) => a.v >= 5) // need signal
    .map(([user_id, a]) => {
      const v = Math.max(a.v, 1);
      const cr = a.c / v;
      const sr = a.s / v;
      const lr = a.l / v;
      const skr = a.sk / v;

      let persona = "general";
      let mode = "general";
      if (sr >= 0.15) { persona = "amplifier"; mode = "viral"; }
      else if (cr >= 0.55) { persona = "binger"; mode = "deep"; }
      else if (lr >= 0.20) { persona = "supporter"; mode = "social"; }
      else if (skr >= 0.50) { persona = "skimmer"; mode = "snack"; }

      return { user_id, persona, mode, region: a.region ?? null, updated_at: new Date().toISOString() };
    });

  let upserted = 0;
  if (rows.length) {
    const { error: upErr } = await sb.from("user_feed_profile").upsert(rows, { onConflict: "user_id" });
    if (upErr) {
      return new Response(JSON.stringify({ error: upErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    upserted = rows.length;
  }

  return new Response(JSON.stringify({ ok: true, upserted, window_days: 7 }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
