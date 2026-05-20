// apex-crash-engine — 1 round per invocation, server-authoritative.
// Triggered by pg_cron every ~12s. Uses 100ms ticks with Realtime broadcast on `market:apex_crash`.
// Money flow 0 touch.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { generateEd25519, signEd25519, deriveCrashX, sha256Hex } from "../_shared/ed25519.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TICK_MS = 100;
const PENDING_MS = 4000;  // betting window
const MAX_RUN_MS = 30000; // safety cap
const GROWTH = 1.0024;    // m(t) = 1.0024^(t/100ms) → ~2x ≈ 290 ticks ≈ 29s

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    // ── 1. Ensure active signing key
    let { data: keys } = await supabase.from("apex_signing_keys")
      .select("id, public_key_b64").is("rotated_at", null).order("created_at", { ascending: false }).limit(1);
    let pubkeyId = keys?.[0]?.id as string | undefined;
    let keypair = await generateEd25519(); // ephemeral signer; pubkey persisted, privkey in memory per invocation
    if (!pubkeyId) {
      const ins = await supabase.from("apex_signing_keys").insert({ public_key_b64: keypair.publicKeyB64 }).select("id").single();
      pubkeyId = ins.data?.id;
    } else {
      // For now, store new pubkey each invocation (round-scoped key rotation acceptable for MVP).
      const ins = await supabase.from("apex_signing_keys").insert({ public_key_b64: keypair.publicKeyB64 }).select("id").single();
      pubkeyId = ins.data?.id ?? pubkeyId;
    }

    // ── 2. Create pending round
    const serverSeed = crypto.randomUUID() + crypto.randomUUID();
    const serverSeedHash = await sha256Hex(serverSeed);
    const publicSeed = crypto.randomUUID();
    const nonce = Date.now();
    const crashX = await deriveCrashX(serverSeed, publicSeed, nonce);

    const { data: round, error: roundErr } = await supabase.from("apex_crash_rounds").insert({
      server_seed_hash: serverSeedHash,
      public_seed: publicSeed,
      nonce,
      status: "pending",
      ed25519_pubkey_id: pubkeyId,
    }).select("id, round_no").single();
    if (roundErr || !round) throw roundErr ?? new Error("round_insert_failed");

    const channel = supabase.channel("market:apex_crash");
    await new Promise<void>((resolve) => channel.subscribe((s) => { if (s === "SUBSCRIBED") resolve(); }));

    await channel.send({ type: "broadcast", event: "round_pending", payload: {
      round_id: round.id, round_no: round.round_no, server_seed_hash: serverSeedHash, public_seed: publicSeed, nonce,
    }});

    // ── 3. Betting window
    await new Promise((r) => setTimeout(r, PENDING_MS));

    // ── 4. Mark running
    await supabase.from("apex_crash_rounds").update({ status: "running", started_at: new Date().toISOString() }).eq("id", round.id);
    await channel.send({ type: "broadcast", event: "round_running", payload: { round_id: round.id, round_no: round.round_no, t0: Date.now() }});

    // ── 5. Tick loop with telemetry sampling
    const t0 = Date.now();
    const jitterSamples: number[] = [];
    let lastTick = t0;
    let mult = 1.00;
    while (true) {
      const now = Date.now();
      const dt = now - lastTick;
      lastTick = now;
      if (now > t0) jitterSamples.push(Math.abs(dt - TICK_MS));

      const elapsed = (now - t0) / TICK_MS;
      mult = Math.pow(GROWTH, elapsed);
      mult = Math.floor(mult * 100) / 100;

      if (mult >= crashX || now - t0 > MAX_RUN_MS) {
        mult = crashX;
        break;
      }
      // 1/2 sampling for broadcast efficiency (every 200ms)
      if (Math.floor(elapsed) % 2 === 0) {
        await channel.send({ type: "broadcast", event: "tick", payload: { round_id: round.id, m: mult, t: now - t0 }});
      }
      const sleep = Math.max(0, TICK_MS - (Date.now() - now));
      await new Promise((r) => setTimeout(r, sleep));
    }

    // ── 6. Sign + reveal
    const payload = JSON.stringify({ round_no: round.round_no, server_seed: serverSeed, public_seed: publicSeed, nonce, crash_x: crashX });
    const signature = await signEd25519(keypair.privateKey, payload);

    const bustedAt = new Date().toISOString();
    await supabase.from("apex_crash_rounds").update({
      status: "revealed", crash_x: crashX, busted_at: bustedAt,
      server_seed: serverSeed, ed25519_signature: signature,
    }).eq("id", round.id);

    // settle lost bets (cashed handled by client-driven cashout RPC)
    await supabase.from("apex_crash_bets").update({ status: "lost", settled_at: bustedAt })
      .eq("round_id", round.id).eq("status", "open");

    await channel.send({ type: "broadcast", event: "round_busted", payload: {
      round_id: round.id, round_no: round.round_no, crash_x: crashX, server_seed: serverSeed, signature,
    }});

    // ── 7. Telemetry (1/50 sampling already — write aggregate)
    const sorted = jitterSamples.sort((a, b) => a - b);
    const p99 = sorted[Math.floor(sorted.length * 0.99)] ?? 0;
    try {
      await supabase.rpc("imperial_log_observability", {
        _kind: "apex_crash_tick",
        _payload: { round_no: round.round_no, ticks: jitterSamples.length, jitter_p99_ms: p99, crash_x: crashX },
      });
    } catch (_) { /* observability optional */ }

    await supabase.removeChannel(channel);
    return new Response(JSON.stringify({ ok: true, round_no: round.round_no, crash_x: crashX, jitter_p99_ms: p99 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
