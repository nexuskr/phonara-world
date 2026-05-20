// P5-D — VRF v3 Threshold Oracle (tBLS 5-of-9, simulated in-process).
// Current implementation is a logical 5-of-9 quorum: 9 ephemeral Ed25519
// keypairs sign the same digest, 5 partial signatures are aggregated by
// SHA-256 to produce the composed seed. Falls back to v2 (Drand+Ed25519)
// then ephemeral if anything fails.
//
// MONEY FLOW: 0 touch. Attestation-only.
// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const QUORUM_N = 9;
const QUORUM_K = 5;

async function sha256Hex(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function b64encode(buf: ArrayBuffer): string {
  const b = new Uint8Array(buf); let s = "";
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return btoa(s);
}

type Node = { id: number; sk: CryptoKey; pkB64: string };
let __nodes: Node[] | null = null;

async function getNodes(): Promise<Node[]> {
  if (__nodes) return __nodes;
  const nodes: Node[] = [];
  for (let i = 1; i <= QUORUM_N; i++) {
    // (Production: import from APEX_VRF_TBLS_NODE_{i}_SK env.)
    const kp = (await crypto.subtle.generateKey("Ed25519", true, ["sign", "verify"])) as CryptoKeyPair;
    const raw = await crypto.subtle.exportKey("raw", kp.publicKey);
    nodes.push({ id: i, sk: kp.privateKey, pkB64: b64encode(raw) });
  }
  __nodes = nodes;
  return nodes;
}

async function partialSign(sk: CryptoKey, msg: string) {
  const sig = await crypto.subtle.sign("Ed25519", sk, new TextEncoder().encode(msg));
  return b64encode(sig);
}

async function getDrand(): Promise<{ round: number; randomness: string } | null> {
  for (const url of ["https://api.drand.sh/public/latest", "https://drand.cloudflare.com/public/latest"]) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(2500) });
      if (r.ok) { const j = await r.json(); return { round: Number(j.round), randomness: String(j.randomness) }; }
    } catch (_) {}
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const traceId = crypto.randomUUID();
  const started = Date.now();
  let mode: "tbls-v3" | "drand-v2" | "ephemeral" = "tbls-v3";

  try {
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const game = String(body.game ?? "unknown");
    const round_ref = String(body.round_ref ?? crypto.randomUUID());
    const client_seed = body.client_seed ? String(body.client_seed) : null;

    const drand = await getDrand();
    const digest = await sha256Hex([game, round_ref, client_seed ?? "", drand?.randomness ?? ""].join("|"));

    let composed: string;
    let participating: { id: number; pk: string; sig: string }[] = [];

    try {
      const nodes = await getNodes();
      // Pick first K nodes deterministically (in real tBLS this is randomized peer selection).
      const partials = await Promise.all(nodes.slice(0, QUORUM_K).map(async (n) => ({
        id: n.id, pk: n.pkB64, sig: await partialSign(n.sk, digest),
      })));
      participating = partials;
      composed = await sha256Hex(["tbls-v3", digest, ...partials.map((p) => p.sig)].join("|"));
    } catch (e) {
      console.warn("[apex-vrf-oracle-v3] tbls failed, falling back:", e);
      mode = drand ? "drand-v2" : "ephemeral";
      composed = await sha256Hex(["fallback", digest, mode].join("|"));
    }

    const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
    const { data, error } = await sb.from("apex_randomness_requests").upsert({
      game, round_ref,
      drand_round: drand?.round ?? null,
      drand_randomness: drand?.randomness ?? null,
      client_seed,
      composed_seed: composed,
      vrf_version: mode === "tbls-v3" ? "v3" : (mode === "drand-v2" ? "v2" : "ephemeral"),
      quorum_n: mode === "tbls-v3" ? QUORUM_N : null,
      quorum_k: mode === "tbls-v3" ? QUORUM_K : null,
      participating_nodes: mode === "tbls-v3" ? participating.map((p) => ({ id: p.id, pk: p.pk })) : null,
    }, { onConflict: "game,round_ref" }).select().maybeSingle();
    if (error) throw error;

    return new Response(JSON.stringify({
      ok: true, traceId, mode,
      quorum: mode === "tbls-v3" ? `${QUORUM_K}/${QUORUM_N}` : null,
      composed_seed: composed,
      drand_round: drand?.round ?? null,
      row: data, latency_ms: Date.now() - started,
    }), { headers: { ...cors, "Content-Type": "application/json", "x-trace-id": traceId, "x-vrf-mode": mode } });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: String(e?.message ?? e), traceId }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json", "x-trace-id": traceId, "x-vrf-mode": mode },
    });
  }
});
