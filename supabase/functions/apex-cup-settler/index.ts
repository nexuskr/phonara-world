// P5-C — Apocalypse Cup settler.
// Runs every 5 minutes via cron. For each live cup season, settles one
// outstanding bracket round using Drand-derived randomness. Final round
// payouts go through `apex_place_bet_v2` (category=cup_payout) so the
// money-flow guard is preserved (8/8 freeze).
//
// MONEY FLOW: 0 touch except via apex_place_bet_v2 wrapper.
// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function sha256Hex(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function getDrand(): Promise<{ round: number; randomness: string } | null> {
  for (const url of ["https://api.drand.sh/public/latest", "https://drand.cloudflare.com/public/latest"]) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(3000) });
      if (r.ok) {
        const j = await r.json();
        return { round: Number(j.round), randomness: String(j.randomness) };
      }
    } catch (_) { /* try next */ }
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const traceId = crypto.randomUUID();
  const started = Date.now();
  const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

  try {
    const drand = await getDrand();
    if (!drand) {
      return new Response(JSON.stringify({ ok: false, error: "drand_unavailable", traceId }), {
        status: 503, headers: { ...cors, "Content-Type": "application/json", "x-trace-id": traceId },
      });
    }

    const { data: liveSeasons, error: seErr } = await sb
      .from("apex_cup_seasons").select("id,name,prize_pool_phon,bracket_size,end_at,status")
      .in("status", ["scheduled", "live"]).limit(20);
    if (seErr) throw seErr;

    const settled: any[] = [];
    for (const s of liveSeasons ?? []) {
      // Get pending bracket matches for this season (smallest round first)
      const { data: pending } = await sb
        .from("apex_cup_brackets")
        .select("id,round,slot_index,player_a_id,player_b_id,winner_id,settled_at")
        .eq("season_id", s.id).is("settled_at", null)
        .order("round", { ascending: true }).order("slot_index", { ascending: true }).limit(64);
      if (!pending || pending.length === 0) continue;

      const currentRound = pending[0].round;
      const roundMatches = pending.filter((m: any) => m.round === currentRound);
      let roundSettled = 0;
      let isFinal = false;

      for (const m of roundMatches) {
        if (!m.player_a_id || !m.player_b_id) continue;
        const h = await sha256Hex(`${drand.randomness}|${s.id}|${m.round}|${m.slot_index}`);
        const winner = parseInt(h.slice(0, 8), 16) % 2 === 0 ? m.player_a_id : m.player_b_id;
        await sb.from("apex_cup_brackets")
          .update({ winner_id: winner, drand_round: drand.round, settled_at: new Date().toISOString() })
          .eq("id", m.id);
        roundSettled++;
        // Mark loser eliminated
        const loser = winner === m.player_a_id ? m.player_b_id : m.player_a_id;
        await sb.from("apex_cup_entries")
          .update({ eliminated_at: new Date().toISOString() })
          .eq("season_id", s.id).eq("user_id", loser).is("eliminated_at", null);
      }

      // If this round resolved a single match → final winner detected
      if (roundMatches.length === 1) {
        isFinal = true;
        const champ = roundMatches[0];
        const championId = champ.winner_id ||
          (parseInt((await sha256Hex(`${drand.randomness}|${s.id}|${champ.round}|${champ.slot_index}`)).slice(0, 8), 16) % 2 === 0
            ? champ.player_a_id : champ.player_b_id);

        // Final rank = 1 for champion
        await sb.from("apex_cup_entries")
          .update({ final_rank: 1 })
          .eq("season_id", s.id).eq("user_id", championId);

        // Payout via wrapper (money-flow safe)
        try {
          await sb.rpc("apex_place_bet_v2", {
            _game_code: "cup_payout",
            _bet_phon: -Number(s.prize_pool_phon || 0), // negative = credit (handled by wrapper)
            _bet_usdt: 0,
            _params: { season_id: s.id, championId, kind: "cup_payout" },
            _idem_key: `cup_payout:${s.id}`,
          });
        } catch (e) {
          console.warn("[cup-settler] payout rpc failed", e);
        }

        await sb.from("apex_cup_seasons")
          .update({ status: "done", settled_at: new Date().toISOString(), drand_seed_round: drand.round })
          .eq("id", s.id);
      } else if (s.status === "scheduled") {
        await sb.from("apex_cup_seasons").update({ status: "live" }).eq("id", s.id);
      }

      settled.push({ season_id: s.id, round: currentRound, matches: roundSettled, final: isFinal });
    }

    const ms = Date.now() - started;
    return new Response(JSON.stringify({ ok: true, traceId, drand_round: drand.round, settled, latency_ms: ms }), {
      headers: { ...cors, "Content-Type": "application/json", "x-trace-id": traceId },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: String(e?.message ?? e), traceId }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json", "x-trace-id": traceId },
    });
  }
});
