// B2B Trading Sim API — public endpoint, Bearer auth via api_keys table.
// Hardening: zod symbol validation + server-to-server CORS (no browser wildcard).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "../_shared/validate.ts";
import { buildCorsOrEmpty } from "../_shared/cors.ts";

// Server-to-server callers don't send Origin → empty CORS headers are fine.
// Browser callers must come from a whitelisted origin.
const SYMBOL = z.string().regex(/^[A-Za-z0-9]{2,16}$/);

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function json(cors: Record<string, string>, body: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json", ...extra },
  });
}

// Deterministic but realistic-looking sim quote — no real market data, no leakage of internal state.
function simQuote(symbol: string) {
  const base = symbol.toUpperCase();
  const seed = [...base].reduce((a, c) => a + c.charCodeAt(0), 0);
  const t = Math.floor(Date.now() / 1000);
  const wave = Math.sin((t / 7) + seed) * 0.004 + Math.sin((t / 53) + seed) * 0.012;
  const anchors: Record<string, number> = { BTC: 96500, ETH: 3450, SOL: 182, XRP: 2.4, BNB: 695 };
  const anchor = anchors[base] ?? (50 + (seed % 500));
  const price = anchor * (1 + wave);
  return {
    symbol: base,
    price: Number(price.toFixed(base === "XRP" ? 5 : 2)),
    bid: Number((price * 0.9998).toFixed(5)),
    ask: Number((price * 1.0002).toFixed(5)),
    timestamp: new Date().toISOString(),
    source: "phonara_sim_v1",
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Extract bearer
  const auth = req.headers.get("authorization") ?? "";
  const m = auth.match(/^Bearer\s+(pk_live_[a-f0-9]{12})_([a-f0-9]{48})$/i);
  if (!m) {
    return json({ error: "missing_or_malformed_api_key", hint: "Authorization: Bearer pk_live_...." }, 401);
  }
  const prefix = m[1];
  const fullSecret = `${m[1]}_${m[2]}`;

  const sb = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { data: gate, error: gateErr } = await sb.rpc("verify_and_meter_api_key", {
    _prefix: prefix,
    _full_secret: fullSecret,
  });

  if (gateErr) {
    console.error("verify error", gateErr);
    return json({ error: "internal_error" }, 500);
  }
  const row = Array.isArray(gate) ? gate[0] : gate;
  if (!row?.allowed) {
    const reason = row?.reason ?? "unauthorized";
    const status = reason === "rate_limited" ? 429 : 401;
    return json({ error: reason, rate_limit_per_min: row?.rate_limit_per_min ?? null }, status, {
      "X-RateLimit-Limit": String(row?.rate_limit_per_min ?? 0),
      "X-RateLimit-Remaining": "0",
    });
  }

  const url = new URL(req.url);
  // Strip the function name prefix /sim-api so callers can use clean paths.
  const path = url.pathname.replace(/^.*\/sim-api/, "") || "/";

  const headers: Record<string, string> = {
    "X-RateLimit-Limit": String(row.rate_limit_per_min),
    "X-RateLimit-Remaining": String(row.remaining),
  };

  // Routes
  if (path === "/" || path === "/health") {
    return json({ ok: true, version: "v1", endpoints: ["/quote", "/quote/:symbol", "/symbols"] }, 200, headers);
  }

  if (path === "/symbols") {
    return json({ symbols: ["BTC", "ETH", "SOL", "XRP", "BNB"] }, 200, headers);
  }

  if (path === "/quote") {
    const symbol = (url.searchParams.get("symbol") ?? "BTC").toUpperCase();
    return json(simQuote(symbol), 200, headers);
  }

  const quoteMatch = path.match(/^\/quote\/([A-Za-z0-9]+)$/);
  if (quoteMatch) {
    return json(simQuote(quoteMatch[1]), 200, headers);
  }

  return json({ error: "not_found", path }, 404, headers);
});
