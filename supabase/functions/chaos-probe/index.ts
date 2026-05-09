// Daily chaos probe — runs same-style read-only probes the script does,
// then records to chaos_runs via service_role.
// SECURITY: requires service_role JWT (verify_jwt=true) — internal cron only.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type" };
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const SENSITIVE = [
  "transactions","wallet_balances","withdrawal_requests","deposit_requests",
  "profiles","user_roles","admin_audit_log","security_audit_log",
  "anomaly_events","cron_settle_audit_log","account_freezes",
];

type Result = { name: string; pass: boolean; detail: string };

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

function isAuthorizedInternal(req: Request): boolean {
  if (!SERVICE) return false;
  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  if (!token) return false;
  return timingSafeEqual(token, SERVICE);
}

async function probeAnonDenied(table: string): Promise<Result> {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*&limit=1`, {
    headers: { apikey: ANON },
  });
  if (!r.ok) return { name: `RLS deny: ${table}`, pass: true, detail: `HTTP ${r.status}` };
  const body = await r.json();
  const empty = Array.isArray(body) && body.length === 0;
  return { name: `RLS deny: ${table}`, pass: empty, detail: empty ? "empty" : "LEAKED rows" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (!isAuthorizedInternal(req)) {
    return new Response(JSON.stringify({ error: "forbidden" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const start = Date.now();
  const results: Result[] = [];

  for (const t of SENSITIVE) results.push(await probeAnonDenied(t));

  // Trust RPC
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/public_trust_metrics`, {
      method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" }, body: "{}",
    });
    results.push({ name: "Trust RPC reachable", pass: r.ok, detail: `HTTP ${r.status}` });
  } catch (e) { results.push({ name: "Trust RPC reachable", pass: false, detail: (e as Error).message }); }

  // Public-status
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/public-status`, { headers: { apikey: ANON } });
    const j = await r.json();
    results.push({ name: "public-status OK", pass: r.ok && j.indicator === "brightgreen", detail: `${r.status} ${j.indicator}` });
  } catch (e) { results.push({ name: "public-status OK", pass: false, detail: (e as Error).message }); }

  const total = results.length;
  const passed = results.filter(r => r.pass).length;
  const failed = total - passed;
  const duration = Date.now() - start;

  const sb = createClient(SUPABASE_URL, SERVICE, { auth: { persistSession: false } });
  await sb.rpc("record_chaos_run", {
    _total: total, _passed: passed, _failed: failed,
    _duration_ms: duration, _results: results, _source: "cron",
  });

  return new Response(JSON.stringify({ ok: true, total, passed, failed, duration_ms: duration }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
