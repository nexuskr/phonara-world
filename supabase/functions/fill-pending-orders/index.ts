// fill-pending-orders: poll open Limit/Stop orders, check Bybit price, trigger fill RPC.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let m = 0;
  for (let i = 0; i < a.length; i++) m |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return m === 0;
}

async function fetchBybitPrice(symbol: string): Promise<number | null> {
  try {
    const r = await fetch(`https://api.bybit.com/v5/market/tickers?category=linear&symbol=${encodeURIComponent(symbol)}`);
    const j = await r.json();
    const p = parseFloat(j?.result?.list?.[0]?.lastPrice ?? "");
    return Number.isFinite(p) && p > 0 ? p : null;
  } catch { return null; }
}

function shouldTrigger(kind: string, side: string, trigger: number, price: number): boolean {
  if (kind === "limit") {
    return side === "long" ? price <= trigger : price >= trigger;
  }
  // stop
  return side === "long" ? price >= trigger : price <= trigger;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const auth = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  // Anon key fallback REMOVED — only service-role key (used by pg_cron via vault) is accepted.
  const ok = !!auth && timingSafeEqual(auth, SERVICE_KEY);
  if (!ok) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const { data: orders } = await sb.from("pending_orders").select("*").eq("status", "open").limit(500);
  if (!orders || orders.length === 0) {
    return new Response(JSON.stringify({ ok: true, processed: 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const symbols = Array.from(new Set(orders.map((o: any) => o.symbol)));
  const priceMap: Record<string, number> = {};
  await Promise.all(symbols.map(async (s) => {
    const p = await fetchBybitPrice(s);
    if (p) priceMap[s] = p;
  }));

  let filled = 0, expired = 0;
  for (const o of orders as any[]) {
    if (o.expires_at && new Date(o.expires_at) < new Date()) {
      await sb.from("pending_orders").update({ status: "expired" }).eq("id", o.id);
      expired++; continue;
    }
    const price = priceMap[o.symbol];
    if (!price) continue;
    if (shouldTrigger(o.kind, o.side, Number(o.trigger_price), price)) {
      const { data, error } = await sb.rpc("fill_pending_order", { p_order_id: o.id, p_mark_price: price });
      if (!error && data) filled++;
    }
  }

  return new Response(JSON.stringify({ ok: true, total: orders.length, filled, expired }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
