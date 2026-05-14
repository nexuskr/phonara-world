// oracle-refresh-binance — Binance source for the multi-exchange consensus oracle.
// Uses /api/v3/ticker/price (single batch call). Writes to oracle_prices_raw.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Binance spot symbols. We map our internal symbol -> Binance symbol.
// Most line up directly; SHIB1000USDT (Bybit-only) → use 1000SHIBUSDT.
// MATICUSDT may be delisted on Binance spot in some regions; ignore if missing.
const SYMBOL_MAP: Record<string, string> = {
  BTCUSDT: "BTCUSDT", ETHUSDT: "ETHUSDT", SOLUSDT: "SOLUSDT", BNBUSDT: "BNBUSDT",
  XRPUSDT: "XRPUSDT", DOGEUSDT: "DOGEUSDT", ADAUSDT: "ADAUSDT", AVAXUSDT: "AVAXUSDT",
  LINKUSDT: "LINKUSDT", MATICUSDT: "MATICUSDT", DOTUSDT: "DOTUSDT", TRXUSDT: "TRXUSDT",
  LTCUSDT: "LTCUSDT", NEARUSDT: "NEARUSDT", ATOMUSDT: "ATOMUSDT", APTUSDT: "APTUSDT",
  SUIUSDT: "SUIUSDT", ARBUSDT: "ARBUSDT", OPUSDT: "OPUSDT", INJUSDT: "INJUSDT",
  PEPEUSDT: "PEPEUSDT", SHIB1000USDT: "1000SHIBUSDT", WIFUSDT: "WIFUSDT",
  BONKUSDT: "BONKUSDT", FLOKIUSDT: "FLOKIUSDT",
};
const REVERSE: Record<string, string> = Object.fromEntries(
  Object.entries(SYMBOL_MAP).map(([ours, theirs]) => [theirs, ours]),
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const r = await fetch("https://api.binance.com/api/v3/ticker/price", {
      headers: { "User-Agent": "phonara-oracle-binance/1.0" },
    });
    if (!r.ok) {
      return new Response(JSON.stringify({ ok: false, status: r.status }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const list: Array<{ symbol: string; price: string }> = await r.json();
    const rows = list
      .filter((x) => REVERSE[x.symbol])
      .map((x) => ({
        symbol: REVERSE[x.symbol],
        source: "binance",
        last_price: Number(x.price),
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

    const { error } = await sb.from("oracle_prices_raw")
      .upsert(rows, { onConflict: "symbol,source" });
    if (error) {
      return new Response(JSON.stringify({ ok: false, error: error.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, source: "binance", updated: rows.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String((e as any)?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
