// empire-og-card: dynamic Empire share card. /og/empire/:uid
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
function esc(s: string) {
  return String(s ?? "").replace(/[<>&"']/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;" })[c] as string);
}
function maskNick(n?: string | null) {
  if (!n) return "Empire●●●";
  if (n.length <= 2) return n[0] + "●●";
  return n[0] + "●".repeat(Math.max(1, n.length - 2)) + n[n.length - 1];
}

const TIER_HEX: Record<number, string> = {
  1: "#a1a1aa", 2: "#10b981", 3: "#0ea5e9", 4: "#6366f1", 5: "#a855f7",
  6: "#f59e0b", 7: "#ec4899", 8: "#d946ef", 9: "#38bdf8", 10: "#fbbf24",
};
const TIER_NAME: Record<number, string> = {
  1: "Citizen", 2: "Squire", 3: "Knight", 4: "Guardian", 5: "Lord",
  6: "Earl", 7: "Baron", 8: "Viscount", 9: "Marquis", 10: "Emperor",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const url = new URL(req.url);
  const uid = url.searchParams.get("uid") ?? "";
  if (!uid) return new Response("missing uid", { status: 400, headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const { data: prof } = await admin
    .from("profiles")
    .select("nickname, empire_level, crown_score")
    .eq("id", uid).maybeSingle();

  const nick = esc(maskNick((prof as any)?.nickname));
  const lv = Math.max(1, Math.min(10, Number((prof as any)?.empire_level ?? 1)));
  const score = Number((prof as any)?.crown_score ?? 0);
  const tierName = TIER_NAME[lv];
  const tierColor = TIER_HEX[lv];

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#06050b"/>
      <stop offset="100%" stop-color="#1a1207"/>
    </linearGradient>
    <linearGradient id="tier" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${tierColor}"/>
      <stop offset="100%" stop-color="#fce8a1"/>
    </linearGradient>
    <radialGradient id="halo" cx="0.5" cy="0.45" r="0.6">
      <stop offset="0%" stop-color="${tierColor}" stop-opacity="0.55"/>
      <stop offset="60%" stop-color="${tierColor}" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="#000" stop-opacity="0"/>
    </radialGradient>
    <filter id="glow"><feGaussianBlur stdDeviation="6"/></filter>
  </defs>

  <rect width="1200" height="630" fill="url(#bg)"/>
  <ellipse cx="600" cy="300" rx="540" ry="280" fill="url(#halo)">
    <animate attributeName="opacity" values="0.6;1;0.6" dur="3s" repeatCount="indefinite"/>
  </ellipse>

  <text x="60" y="80" font-family="Inter, ui-sans-serif" font-size="22" fill="#d4af37" letter-spacing="6" font-weight="900">PHONARA · EMPIRE HALL</text>

  <!-- Castle silhouette -->
  <g transform="translate(600 360)" opacity="0.9">
    <rect x="-160" y="-100" width="320" height="100" fill="#2b2519"/>
    <rect x="-60" y="-30" width="40" height="70" fill="#0c0905"/>
    <polygon points="-200,-100 -160,-150 -120,-100" fill="#181208"/>
    <polygon points="120,-100 160,-150 200,-100" fill="#181208"/>
    <rect x="-12" y="-180" width="6" height="80" fill="${tierColor}"/>
    <polygon points="-6,-180 60,-160 -6,-140" fill="${tierColor}"/>
  </g>

  <text x="600" y="200" text-anchor="middle" font-family="Inter, ui-sans-serif" font-weight="900" font-size="64" fill="url(#tier)" filter="url(#glow)">
    ${nick}의 제국
  </text>
  <text x="600" y="200" text-anchor="middle" font-family="Inter, ui-sans-serif" font-weight="900" font-size="64" fill="url(#tier)">
    ${nick}의 제국
  </text>

  <text x="600" y="250" text-anchor="middle" font-family="Inter, ui-sans-serif" font-weight="700" font-size="22" fill="${tierColor}" letter-spacing="8">
    LV.${lv} · ${tierName.toUpperCase()}
  </text>

  <g transform="translate(600 510)">
    <rect x="-200" y="-46" width="400" height="84" rx="42" fill="#000" stroke="${tierColor}" stroke-width="3"/>
    <text x="0" y="14" text-anchor="middle" font-family="Inter, ui-sans-serif" font-weight="900" font-size="46" fill="#fce8a1">
      👑 ${score.toLocaleString()} ₡
    </text>
  </g>

  <text x="600" y="600" text-anchor="middle" font-family="Inter, ui-sans-serif" font-size="18" fill="#9b8038" letter-spacing="6" font-weight="600">
    JOIN THE EMPIRE — phonara.world
  </text>
</svg>`;

  return new Response(svg, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=600",
    },
  });
});
