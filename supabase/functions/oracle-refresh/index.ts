// oracle-refresh — Bybit source for the multi-exchange consensus oracle.
// Writes per-source rows into oracle_prices_raw; the DB trigger recomputes consensus.
// Scheduled by pg_cron every 5s. Server-to-server.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYMBOLS = [
  "BTCUSDT","ETHUSDT","SOLUSDT","BNBUSDT","XRPUSDT",
  "DOGEUSDT","ADAUSDT","AVAXUSDT","LINKUSDT","MATICUSDT",
  "DOTUSDT","TRXUSDT","LTCUSDT","NEARUSDT","ATOMUSDT",
  "APTUSDT","SUIUSDT","ARBUSDT","OPUSDT","INJUSDT",
  "PEPEUSDT","SHIB1000USDT","WIFUSDT","BONKUSDT","FLOKIUSDT",
];

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let m = 0;
  for (let i = 0; i < a.length; i++) m |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return m === 0;
}
function isAuthorizedCron(req: Request): boolean {
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  const svc = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  return !!token && !!svc && token.length === svc.length && timingSafeEqual(token, svc);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (!isAuthorizedCron(req)) {
    return new Response(JSON.stringify({ error: "forbidden" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const r = await fetch("https://api.bybit.com/v5/market/tickers?category=linear", {
      headers: { "User-Agent": "phonara-oracle-bybit/2.0" },
    });
    if (!r.ok) {
      return new Response(JSON.stringify({ ok: false, status: r.status }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const j = await r.json();
    const wanted = new Set(SYMBOLS);
    const rows = (j?.result?.list ?? [])
      .filter((x: any) => wanted.has(x.symbol))
      .map((x: any) => ({
        symbol: x.symbol,
        source: "bybit",
        last_price: Number(x.lastPrice),
        updated_at: new Date().toISOString(),
      }))
      .filter((x: any) => Number.isFinite(x.last_price) && x.last_price > 0);

    if (rows.length === 0) {
      return new Response(JSON.stringify({ ok: false, error: "no_rows" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const { error } = await sb.from("oracle_prices_raw")
      .upsert(rows, { onConflict: "symbol,source" });
    if (error) {
      return new Response(JSON.stringify({ ok: false, error: error.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, source: "bybit", updated: rows.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String((e as any)?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
