// oracle-refresh-coinbase — Coinbase source for the multi-exchange consensus oracle.
// Uses Coinbase Exchange products/stats endpoint. USDT pairs are mapped to USD pairs
// (1:1 stable approximation). Symbols not listed on Coinbase are skipped — those
// symbols simply rely on Bybit+Binance quorum.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// our symbol -> Coinbase product id
const SYMBOL_MAP: Record<string, string> = {
  BTCUSDT: "BTC-USD", ETHUSDT: "ETH-USD", SOLUSDT: "SOL-USD",
  XRPUSDT: "XRP-USD", DOGEUSDT: "DOGE-USD", ADAUSDT: "ADA-USD",
  AVAXUSDT: "AVAX-USD", LINKUSDT: "LINK-USD", DOTUSDT: "DOT-USD",
  LTCUSDT: "LTC-USD", NEARUSDT: "NEAR-USD", ATOMUSDT: "ATOM-USD",
  APTUSDT: "APT-USD", SUIUSDT: "SUI-USD", ARBUSDT: "ARB-USD",
  OPUSDT: "OP-USD", INJUSDT: "INJ-USD",
  PEPEUSDT: "PEPE-USD", BONKUSDT: "BONK-USD", FLOKIUSDT: "FLOKI-USD",
  WIFUSDT: "WIF-USD",
  // BNBUSDT, MATICUSDT, TRXUSDT, SHIB1000USDT — not supported on Coinbase.
};

async function fetchOne(productId: string): Promise<number | null> {
  try {
    const r = await fetch(`https://api.exchange.coinbase.com/products/${productId}/ticker`, {
      headers: { "User-Agent": "phonara-oracle-coinbase/1.0" },
    });
    if (!r.ok) return null;
    const j = await r.json();
    const p = Number(j?.price);
    return Number.isFinite(p) && p > 0 ? p : null;
  } catch {
    return null;
  }
}

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
    const entries = Object.entries(SYMBOL_MAP);
    // Coinbase has no batch tickers endpoint — fan out with limited concurrency.
    const results = await Promise.all(
      entries.map(async ([ours, theirs]) => {
        const p = await fetchOne(theirs);
        return p == null ? null : {
          symbol: ours,
          source: "coinbase",
          last_price: p,
          updated_at: new Date().toISOString(),
        };
      }),
    );
    const rows = results.filter((x): x is NonNullable<typeof x> => x !== null);

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

    return new Response(JSON.stringify({ ok: true, source: "coinbase", updated: rows.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String((e as any)?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
