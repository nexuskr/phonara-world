// Public status JSON — Shields.io / external monitors compatible.
// No auth required. Cached aggressively at the edge.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

type Metrics = {
  total_paid: number;
  paid_30d: number;
  avg_settle_minutes: number;
  cron_uptime_7d: number;
  audit_pass_30d: number;
  policy_pass_7d: number;
  unack_anomalies: number;
  last_cron_at: string | null;
  total_members: number;
  active_members_30d: number;
  generated_at: string;
};

function statusOf(m: Metrics): { status: "operational" | "degraded" | "down"; color: "brightgreen" | "yellow" | "red" } {
  if (!m.last_cron_at) return { status: "down", color: "red" };
  const allGreen =
    m.cron_uptime_7d >= 99 &&
    m.audit_pass_30d >= 99 &&
    m.policy_pass_7d >= 99 &&
    m.unack_anomalies === 0;
  if (allGreen) return { status: "operational", color: "brightgreen" };
  const anyRed =
    m.cron_uptime_7d < 90 || m.audit_pass_30d < 90 || m.unack_anomalies > 5;
  return anyRed ? { status: "down", color: "red" } : { status: "degraded", color: "yellow" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const format = url.searchParams.get("format") ?? "json"; // json | shield

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false },
    });
    const { data, error } = await supabase.rpc("public_trust_metrics");
    if (error) throw error;
    const m = data as Metrics;
    const s = statusOf(m);

    if (format === "shield") {
      // Shields.io endpoint compatible
      const body = {
        schemaVersion: 1,
        label: "phonara",
        message: s.status,
        color: s.color,
        cacheSeconds: 60,
      };
      return new Response(JSON.stringify(body), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "public, max-age=60, stale-while-revalidate=120",
        },
      });
    }

    const payload = {
      status: s.status,
      indicator: s.color,
      metrics: m,
      links: {
        site: "https://phonara.world",
        trust_page: "https://phonara.world/trust",
      },
      generated_at: m.generated_at ?? new Date().toISOString(),
    };

    return new Response(JSON.stringify(payload), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
      },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ status: "unknown", error: (e as Error).message }),
      {
        status: 200, // intentionally 200 so monitors don't false-alarm on RPC blip
        headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
      },
    );
  }
});
