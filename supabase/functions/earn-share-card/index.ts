// earn-share-card: 1200x630 OG share card SVG (Warm Gold → Hot Pink).
// Public, cached 30d. Used for KakaoTalk/X/Threads/FB/Telegram OG previews and IG download.
// SVG works as og:image for all major channels and renders crisp on every device.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

function esc(s: string): string {
  return s.replace(/[<>&"']/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" }[c]!)
  );
}

function fmt(n: number): string {
  return n.toLocaleString("ko-KR");
}

function headlineFor(kind: string): string {
  switch (kind) {
    case "bigwin": return "방금 터졌습니다";
    case "roulette": return "오늘의 무료 룰렛";
    case "streak": return "출석 보상 적립";
    case "mission": return "미션 클리어";
    default: return "PHON 적립 완료";
  }
}

function render(kind: string, amount: number, nick: string, symbol: string): string {
  const head = headlineFor(kind);
  const nickSafe = esc(nick.slice(0, 16));
  const amountStr = fmt(amount);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0A0A0F"/>
      <stop offset="50%" stop-color="#1A0A1F"/>
      <stop offset="100%" stop-color="#0A0A0F"/>
    </linearGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#FFD700"/>
      <stop offset="60%" stop-color="#E8B84A"/>
      <stop offset="100%" stop-color="#FF00AA"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.7" cy="0.3" r="0.8">
      <stop offset="0%" stop-color="#FF00AA" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#FF00AA" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glow2" cx="0.2" cy="0.8" r="0.6">
      <stop offset="0%" stop-color="#FFD700" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="#FFD700" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#glow)"/>
  <rect width="1200" height="630" fill="url(#glow2)"/>

  <!-- diagonal shimmer bar -->
  <rect x="-50" y="20" width="1300" height="3" fill="url(#gold)" opacity="0.5"/>
  <rect x="-50" y="607" width="1300" height="3" fill="url(#gold)" opacity="0.5"/>

  <!-- brand -->
  <text x="80" y="100" font-family="'Space Grotesk','Pretendard',system-ui,sans-serif"
        font-size="32" font-weight="900" fill="#E8B84A" letter-spacing="6">
    PHONARA.WORLD
  </text>

  <!-- kind headline -->
  <text x="80" y="200" font-family="'Pretendard',system-ui,sans-serif"
        font-size="64" font-weight="900" fill="#FFFFFF" letter-spacing="-2">
    ${esc(head)}
  </text>

  <!-- amount -->
  <text x="80" y="400" font-family="'Space Grotesk',monospace"
        font-size="220" font-weight="900" fill="url(#gold)" letter-spacing="-8"
        font-variant-numeric="tabular-nums">
    ${amountStr}
  </text>
  <text x="80" y="470" font-family="'Pretendard',system-ui,sans-serif"
        font-size="48" font-weight="800" fill="#FFD700">
    ${esc(symbol)}
  </text>

  <!-- nick + cta -->
  <text x="80" y="555" font-family="'Pretendard',system-ui,sans-serif"
        font-size="34" font-weight="700" fill="#FFFFFF" opacity="0.85">
    ${nickSafe} 님
  </text>
  <text x="1120" y="555" text-anchor="end" font-family="'Pretendard',system-ui,sans-serif"
        font-size="34" font-weight="900" fill="#FF00AA">
    오늘 나도 무료로 시작 →
  </text>
</svg>`;
}

Deno.serve((req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const kind = url.searchParams.get("kind") || "bigwin";
    const amount = Math.max(0, Math.min(999_999_999, parseInt(url.searchParams.get("amount") || "0", 10) || 0));
    const nick = (url.searchParams.get("nick") || "익명").slice(0, 16);
    const symbol = (url.searchParams.get("symbol") || "PHON").slice(0, 8);

    const svg = render(kind, amount, nick, symbol);

    return new Response(svg, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "public, max-age=2592000, immutable",
      },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
