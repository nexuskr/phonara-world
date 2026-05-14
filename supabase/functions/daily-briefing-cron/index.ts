// daily-briefing-cron: every morning 06:00 KST → bulk fill briefings for active users
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const SB_URL = Deno.env.get("SUPABASE_URL")!;
  const SR = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(SB_URL, SR, { auth: { persistSession: false } });

  // Pull a small batch (capped) so we don't blow AI credits in one minute.
  const { data, error } = await admin.rpc("admin_list_briefing_targets", { _limit: 100 });
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }
  const targets = (data as any[]) ?? [];
  let ok = 0, fail = 0;
  for (const t of targets) {
    try {
      const r = await fetch(`${SB_URL}/functions/v1/emperor-coach`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "authorization": `Bearer ${SR}`,
          "apikey": SR,
        },
        body: JSON.stringify({
          target_user_id: t.user_id,
          context: {
            user_id: t.user_id,
            nickname: t.nickname ?? "Emperor",
            phon: Number(t.phon ?? 0),
            level: Number(t.level ?? 1),
            crown_24h: Number(t.crown_24h ?? 0),
            jackpot_24h: 0,
            locale: "ko",
          },
        }),
      });
      if (r.ok) ok++; else fail++;
    } catch { fail++; }
    // gentle pacing — 100 users * 200ms ≈ 20s
    await new Promise((res) => setTimeout(res, 200));
  }
  return new Response(JSON.stringify({ targets: targets.length, ok, fail }), {
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
});
