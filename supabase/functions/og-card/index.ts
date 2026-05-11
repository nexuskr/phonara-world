// og-card — dynamic Open Graph image
// Returns a 1200x630 SVG (rendered as image/svg+xml) for social previews.
// Numbers refresh on each fetch from bot_settings (server-truth online count) and
// from a small jackpot estimate. Cached for 5 minutes.
//
// Usage: <meta property="og:image" content="https://<proj>.supabase.co/functions/v1/og-card" />

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const sb = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function esc(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function fmtKRW(n: number): string {
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억`;
  if (n >= 10_000) return `${Math.floor(n / 10_000).toLocaleString()}만`;
  return n.toLocaleString();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { data: settings } = await sb
      .from("bot_settings")
      .select("online_base, online_jitter")
      .eq("id", 1).maybeSingle();
    const base = settings?.online_base ?? 12_000;
    const jitter = settings?.online_jitter ?? 3_000;
    const online = base + Math.floor(Math.random() * Math.max(1, jitter));

    // jackpot estimate (best-effort, fallback if table missing)
    let jackpot = 0;
    try {
      const { data: jp } = await sb.from("jackpot_pool").select("amount").maybeSingle();
      jackpot = Number((jp as any)?.amount ?? 0) || 0;
    } catch { /* ignore */ }
    if (!jackpot) jackpot = 38_420_000 + Math.floor(online * 240);

    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#08070f"/>
      <stop offset="100%" stop-color="#1a1407"/>
    </linearGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#fce8a1"/>
      <stop offset="50%" stop-color="#d4af37"/>
      <stop offset="100%" stop-color="#a07d1a"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="0%" r="60%">
      <stop offset="0%" stop-color="#d4af37" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="#d4af37" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#glow)"/>
  <rect x="0" y="0" width="1200" height="4" fill="url(#gold)"/>
  <rect x="0" y="626" width="1200" height="4" fill="url(#gold)"/>

  <text x="80" y="120" font-family="Georgia, 'Cormorant Garamond', serif" font-size="36" font-weight="700" fill="url(#gold)" letter-spacing="6">PHONARA</text>
  <text x="80" y="160" font-family="system-ui, -apple-system, sans-serif" font-size="20" fill="#a8a39c" letter-spacing="2">EMPIRE · GLOBAL AI INTELLIGENCE</text>

  <text x="80" y="290" font-family="Georgia, serif" font-size="68" font-weight="800" fill="#f5efde">폰 하나로 세우는</text>
  <text x="80" y="370" font-family="Georgia, serif" font-size="68" font-weight="800" fill="url(#gold)">지구 단위 AI 제국</text>

  <g transform="translate(80,440)">
    <rect x="0" y="0" width="480" height="120" rx="16" fill="#1a1610" stroke="#3a2f17" stroke-width="2"/>
    <text x="24" y="40" font-family="system-ui" font-size="16" fill="#8c857a" letter-spacing="2">활성 시뮬레이션 인구</text>
    <text x="24" y="92" font-family="system-ui" font-size="54" font-weight="900" fill="url(#gold)">${esc(online.toLocaleString())}</text>
    <text x="430" y="40" font-family="system-ui" font-size="11" fill="#6e6a62" text-anchor="end" letter-spacing="3">SIM</text>
  </g>

  <g transform="translate(620,440)">
    <rect x="0" y="0" width="500" height="120" rx="16" fill="#1a1610" stroke="#3a2f17" stroke-width="2"/>
    <text x="24" y="40" font-family="system-ui" font-size="16" fill="#8c857a" letter-spacing="2">오늘 누적 시뮬 지급</text>
    <text x="24" y="92" font-family="system-ui" font-size="54" font-weight="900" fill="#7ed992">₩ ${esc(fmtKRW(jackpot))}</text>
  </g>

  <text x="600" y="600" font-family="system-ui" font-size="18" fill="#8c857a" text-anchor="middle" letter-spacing="3">PHONARA.WORLD · 첫 충전 +30% 보너스</text>
</svg>`;

    return new Response(svg, {
      headers: {
        ...corsHeaders,
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "public, max-age=300, s-maxage=300",
      },
    });
  } catch (e) {
    console.error("[og-card] error", e);
    return new Response("og-card error", { status: 500, headers: corsHeaders });
  }
});
