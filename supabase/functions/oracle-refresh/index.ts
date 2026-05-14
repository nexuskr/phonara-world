// oracle-refresh — pulls Bybit v5 tickers and upserts oracle_prices.
// Scheduled by pg_cron every 10s. Anonymous public endpoint (cron triggers it).
// CORS not strictly required (server-to-server) but added for manual debug.

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = "https://api.bybit.com/v5/market/tickers?category=linear";
    const r = await fetch(url, { headers: { "User-Agent": "phonara-oracle/1.0" } });
    if (!r.ok) {
      return new Response(JSON.stringify({ ok: false, status: r.status }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const j = await r.json();
    const list: any[] = j?.result?.list ?? [];
    const wanted = new Set(SYMBOLS);
    const rows = list
      .filter((x) => wanted.has(x.symbol))
      .map((x) => ({
        symbol: x.symbol,
        last_price: Number(x.lastPrice),
        source: "bybit",
        updated_at: new Date().toISOString(),
      }))
      .filter((x) => Number.isFinite(x.last_price) && x.last_price > 0);

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

    const { error } = await sb.from("oracle_prices").upsert(rows, { onConflict: "symbol" });
    if (error) {
      return new Response(JSON.stringify({ ok: false, error: error.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, updated: rows.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
