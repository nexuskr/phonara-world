// Phase D Week 1: Trump×Musk tone daily headline generator
// Runs hourly via cron. Pulls live stats and asks Lovable AI Gateway for 5 headlines.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let m = 0;
  for (let i = 0; i < a.length; i++) m |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return m === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
    if (!SERVICE_KEY || !token || token.length !== SERVICE_KEY.length || !timingSafeEqual(token, SERVICE_KEY)) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = createClient(SUPABASE_URL, SERVICE_KEY);

    // 1) live stats
    const { data: stats } = await sb.rpc("get_world_domination_stats");
    const { data: topEmp } = await sb.rpc("get_top_emperor_24h");

    const ctx = {
      gmv_24h: stats?.gmv_24h ?? 0,
      payout_total: stats?.payout_total ?? 0,
      active_emperors: stats?.active_emperors ?? 0,
      max_crown_24h: stats?.max_crown_24h ?? 0,
      signed_up_today: stats?.signed_up_today ?? 0,
      top_emperor: topEmp?.[0] ?? null,
    };

    const sys = `You are PHONARA's headline writer. Produce SHORT, PUNCHY one-line headlines mixing Donald Trump's bombastic certainty ("WE ARE #1", "EVERYONE IS WATCHING", "BIGGEST EVER") with Elon Musk's first-principles tech swagger ("Physics says", "100x faster", "rate-limited only by oracles"). Reference the live numbers when impressive. Keep each ≤ 70 chars. NO emojis except 👑 sparingly. NO hashtags. Output exactly 5 lines, language alternating: ko, en, ko, en, ko.`;

    const usr = `Live stats:\n${JSON.stringify(ctx, null, 2)}\n\nGenerate 5 headlines (alternating ko/en/ko/en/ko).`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: usr },
        ],
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI gateway error", aiResp.status, t);
      return new Response(JSON.stringify({ error: "ai_failed", status: aiResp.status }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiResp.json();
    const content: string = aiJson?.choices?.[0]?.message?.content ?? "";

    const lines = content
      .split("\n")
      .map((l) => l.replace(/^[\s\-\*\d\.\)]+/, "").trim())
      .filter((l) => l.length > 4 && l.length <= 120)
      .slice(0, 5);

    if (lines.length === 0) {
      return new Response(JSON.stringify({ error: "no_lines", raw: content }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rows = lines.map((text, i) => ({
      text,
      tone: i % 2 === 0 ? "trump" : "musk",
      locale: i % 2 === 0 ? "ko" : "en",
      source_stats: ctx,
    }));

    const { error: insErr } = await sb.from("daily_headlines").insert(rows);
    if (insErr) throw insErr;

    return new Response(JSON.stringify({ ok: true, inserted: rows.length, lines }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
