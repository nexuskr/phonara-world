// Edge cached catalog — public, read-only, aggressive cache.
// Returns a single payload combining catalog tables that rarely change.
// Cached at the CDN for 5 minutes; clients also keep an in-memory copy.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

type Payload = {
  achievements: unknown[];
  badges: unknown[];
  quests: unknown[];
  seasons: unknown[];
  tier_limits: unknown[];
  season_pass_rewards: unknown[];
  generated_at: string;
};

let memCache: { data: Payload; etag: string; ts: number } | null = null;
const TTL_MS = 5 * 60 * 1000;

async function buildPayload(): Promise<Payload> {
  const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });
  const [a, b, q, s, t, r] = await Promise.all([
    sb.from("achievements_catalog").select("*").order("sort_order", { ascending: true }),
    sb.from("badges_catalog").select("*"),
    sb.from("quests_catalog").select("*").eq("active", true),
    sb.from("seasons").select("*"),
    sb.from("tier_limits").select("*"),
    sb.from("season_pass_rewards").select("*"),
  ]);
  return {
    achievements: a.data ?? [],
    badges: b.data ?? [],
    quests: q.data ?? [],
    seasons: s.data ?? [],
    tier_limits: t.data ?? [],
    season_pass_rewards: r.data ?? [],
    generated_at: new Date().toISOString(),
  };
}

async function digest(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 16);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const url = new URL(req.url);
    const force = url.searchParams.get("force") === "1";
    const now = Date.now();

    if (force || !memCache || now - memCache.ts > TTL_MS) {
      const data = await buildPayload();
      const etag = await digest(JSON.stringify(data));
      memCache = { data, etag, ts: now };
    }

    const ifNoneMatch = req.headers.get("if-none-match");
    if (ifNoneMatch && ifNoneMatch === memCache.etag) {
      return new Response(null, {
        status: 304,
        headers: {
          ...corsHeaders,
          ETag: memCache.etag,
          "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
        },
      });
    }

    return new Response(JSON.stringify(memCache.data), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        ETag: memCache.etag,
        "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
