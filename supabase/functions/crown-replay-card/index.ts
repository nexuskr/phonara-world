// crown-replay-card: dynamic animated SVG share card for a Crown replay token.
// Public: no auth required. Returns image/svg+xml so it works as og:image.
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function esc(s: string) {
  return String(s ?? "").replace(/[<>&"']/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;" })[c] as string,
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const token = url.searchParams.get("token") ?? "";
  if (!token) {
    return new Response("missing token", { status: 400, headers: corsHeaders });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const { data, error } = await admin.rpc("get_public_crown_replay", { _token: token });
  if (error || !data) {
    return new Response("not found", { status: 404, headers: corsHeaders });
  }

  const r = data as { awarded: number; variance: number; level: number; nick: string };
  const mult = Number(r.variance ?? 0).toFixed(2);
  const awarded = Number(r.awarded ?? 0).toLocaleString();
  const level = Math.max(1, Math.min(10, Number(r.level ?? 1)));
  const nick = esc(r.nick ?? "Empire●●●");

  // Animated gold flare + Crown reveal
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#06050b"/>
      <stop offset="100%" stop-color="#1a1207"/>
    </linearGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#fce8a1"/>
      <stop offset="50%" stop-color="#d4af37"/>
      <stop offset="100%" stop-color="#a07d1a"/>
    </linearGradient>
    <radialGradient id="halo" cx="0.5" cy="0.4" r="0.6">
      <stop offset="0%" stop-color="#fce8a1" stop-opacity="0.55"/>
      <stop offset="60%" stop-color="#d4af37" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="#000" stop-opacity="0"/>
    </radialGradient>
    <filter id="glow"><feGaussianBlur stdDeviation="6"/></filter>
  </defs>

  <rect width="1200" height="630" fill="url(#bg)"/>
  <ellipse cx="600" cy="280" rx="540" ry="280" fill="url(#halo)">
    <animate attributeName="opacity" values="0.6;1;0.6" dur="2.4s" repeatCount="indefinite"/>
  </ellipse>

  <!-- corner mark -->
  <text x="60" y="80" font-family="Inter, ui-sans-serif" font-size="22" fill="#d4af37" letter-spacing="6" font-weight="900">PHONARA · EMPIRE</text>

  <!-- Crown emoji (svg-friendly) -->
  <text x="600" y="220" text-anchor="middle" font-size="120" font-weight="900">
    👑
    <animate attributeName="font-size" values="100;130;100" dur="2s" repeatCount="indefinite"/>
  </text>

  <!-- Awarded amount -->
  <text x="600" y="370" text-anchor="middle" font-family="Inter, ui-sans-serif" font-weight="900" font-size="120" fill="url(#gold)" filter="url(#glow)">
    +${esc(awarded)} ₡
  </text>
  <text x="600" y="370" text-anchor="middle" font-family="Inter, ui-sans-serif" font-weight="900" font-size="120" fill="url(#gold)">
    +${esc(awarded)} ₡
  </text>

  <!-- Multiplier -->
  <g transform="translate(600 440)">
    <rect x="-160" y="-44" width="320" height="78" rx="40" fill="#000" stroke="#d4af37" stroke-width="3"/>
    <text x="0" y="14" text-anchor="middle" font-family="Inter, ui-sans-serif" font-weight="900" font-size="48" fill="#fce8a1">
      ×${esc(mult)} VARIANCE
    </text>
  </g>

  <!-- Footer: nick + level -->
  <text x="600" y="540" text-anchor="middle" font-family="Inter, ui-sans-serif" font-size="30" fill="#d4af37" letter-spacing="3" font-weight="700">
    ${nick} · LV.${esc(String(level))}
  </text>
  <text x="600" y="585" text-anchor="middle" font-family="Inter, ui-sans-serif" font-size="20" fill="#9b8038" letter-spacing="6" font-weight="600">
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
