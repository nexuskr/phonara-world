/**
 * tron-deposit-poller — TRC20 USDT 입금 자동 매칭.
 * - 5분마다 cron으로 호출
 * - TronGrid 무료 API로 TRON_RECEIVE_ADDRESS 의 최근 USDT 입금 조회
 * - 각 tx에 대해 credit_crypto_deposit RPC 호출 (service_role)
 * - 멱등: matched_tx_hash UNIQUE 인덱스로 중복 처리 차단
 *
 * 환경변수:
 * - TRON_RECEIVE_ADDRESS (필수): 입금 받을 TRON 지갑 주소 (T로 시작)
 * - TRONGRID_API_KEY (선택): 무료 키. 없어도 동작하지만 rate limit 낮음
 * - SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (자동 주입)
 */
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// USDT TRC20 contract on Tron mainnet
const USDT_CONTRACT = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

function isAuthorizedCron(req: Request): boolean {
  const expected = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!expected) return false;
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return false;
  return timingSafeEqual(token, expected);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  if (!isAuthorizedCron(req)) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const ADDR = Deno.env.get("TRON_RECEIVE_ADDRESS");
  if (!ADDR) {
    return json({ error: "TRON_RECEIVE_ADDRESS not configured" }, 500);
  }
  const TG_KEY = Deno.env.get("TRONGRID_API_KEY") || "";
  const SB_URL = Deno.env.get("SUPABASE_URL")!;
  const SB_SR = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(SB_URL, SB_SR, { auth: { persistSession: false } });

  // 최근 30분 윈도우만 조회
  const sinceMs = Date.now() - 30 * 60 * 1000;

  const url = new URL(
    `https://api.trongrid.io/v1/accounts/${ADDR}/transactions/trc20`,
  );
  url.searchParams.set("only_to", "true");
  url.searchParams.set("contract_address", USDT_CONTRACT);
  url.searchParams.set("limit", "50");
  url.searchParams.set("min_timestamp", String(sinceMs));

  const headers: Record<string, string> = { accept: "application/json" };
  if (TG_KEY) headers["TRON-PRO-API-KEY"] = TG_KEY;

  let body: any;
  try {
    const r = await fetch(url.toString(), { headers });
    if (!r.ok) {
      return json({ error: `trongrid_${r.status}`, body: await r.text() }, 502);
    }
    body = await r.json();
  } catch (e) {
    return json({ error: "fetch_failed", message: String(e) }, 502);
  }

  const txs: any[] = Array.isArray(body?.data) ? body.data : [];
  const results: any[] = [];

  for (const tx of txs) {
    try {
      const txHash: string | undefined = tx.transaction_id;
      const fromAddr: string | undefined = tx.from;
      const toAddr: string | undefined = tx.to;
      const decimals = Number(tx?.token_info?.decimals ?? 6);
      const raw = tx.value as string | number | undefined;
      if (!txHash || !fromAddr || !toAddr || raw == null) continue;

      // value는 정수 문자열 (예: 100428700 = 100.4287 USDT)
      const amount = Number(raw) / Math.pow(10, decimals);
      if (!isFinite(amount) || amount <= 0) continue;

      const { data, error } = await sb.rpc("credit_crypto_deposit", {
        _tx_hash: txHash,
        _amount: amount,
        _from_addr: fromAddr,
        _to_addr: toAddr,
      });
      if (error) {
        results.push({ tx: txHash, status: "rpc_error", err: error.message });
      } else {
        results.push({ tx: txHash, ...(data as any) });
      }
    } catch (e) {
      results.push({ status: "exception", err: String(e) });
    }
  }

  return json({ scanned: txs.length, results }, 200);
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
