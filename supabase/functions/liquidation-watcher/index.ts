// Service-role auto-liquidation watcher.
// Fetches all open live_positions, gets Bybit mark prices, and liquidates positions whose ROI <= -99%.
// Intended to be called on a schedule (pg_cron / external cron) — does not require user JWT.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Pos = {
  id: string;
  user_id: string;
  symbol: string;
  side: "long" | "short";
  leverage: number;
  margin: number;
  size: number;
  entry: number;
};

async function fetchBybitPrices(symbols: string[]): Promise<Record<string, number>> {
  // Bybit linear ticker endpoint returns all linear tickers; filter ours
  const out: Record<string, number> = {};
  try {
    const r = await fetch("https://api.bybit.com/v5/market/tickers?category=linear", {
      signal: AbortSignal.timeout(8000),
    });
    const j = await r.json();
    const list: any[] = j?.result?.list ?? [];
    const set = new Set(symbols);
    for (const t of list) {
      if (set.has(t.symbol)) {
        const p = parseFloat(t.lastPrice ?? t.markPrice ?? "0");
        if (p > 0) out[t.symbol] = p;
      }
    }
  } catch (e) {
    console.error("bybit fetch failed", e);
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

  try {
    const { data: positions, error } = await supabase
      .from("live_positions")
      .select("id,user_id,symbol,side,leverage,margin,size,entry")
      .eq("status", "open")
      .limit(2000);
    if (error) throw error;
    const list = (positions ?? []) as Pos[];
    if (list.length === 0) {
      return new Response(JSON.stringify({ scanned: 0, liquidated: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const symbols = Array.from(new Set(list.map((p) => p.symbol)));
    const prices = await fetchBybitPrices(symbols);

    let liquidated = 0;
    const errors: string[] = [];
    for (const p of list) {
      const mark = prices[p.symbol];
      if (!mark) continue;
      const dir = p.side === "long" ? 1 : -1;
      const pnl = (mark - p.entry) * p.size * dir;
      const roi = p.margin > 0 ? pnl / p.margin : 0;
      if (roi <= -0.99) {
        const { data, error: rpcErr } = await supabase.rpc("admin_liquidate_position", {
          p_position_id: p.id,
          p_mark_price: mark,
        });
        if (rpcErr) {
          errors.push(`${p.id}: ${rpcErr.message}`);
        } else if ((data as any)?.liquidated) {
          liquidated++;
        }
      }
    }

    return new Response(
      JSON.stringify({ scanned: list.length, liquidated, errors: errors.slice(0, 10) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
