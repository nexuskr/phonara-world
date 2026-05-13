// Ghost Empire Simulation — pulse tick (5s cron via pg_net)
// Updates ghost_pulse_state and inserts ghost_strikes / ghost_moments.
// All inserts carry is_simulated=true. Real wallets / withdrawals are untouched.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-bot-cron-secret",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON_SECRET = Deno.env.get("BOT_CRON_SECRET") ?? "";

const sb = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randInt(a: number, b: number) {
  return Math.floor(a + Math.random() * (b - a + 1));
}

const REGIONS = ["KR", "US", "JP", "VN", "BR", "IN", "ID", "TH"];
const NICK_PREFIX = ["황제", "영주", "백작", "대공", "Baron", "마스터"];
const NICK_SUFFIX = ["K***n", "J***i", "S***h", "M***o", "Y***", "L***"];

function maskNick() {
  return `${pick(NICK_PREFIX)} ${pick(NICK_SUFFIX)}`;
}

// KST hour weight: peak 19~23 ×2.5, dead 00~06 ×0.4, default 1.0
function kstHourMultiplier(): number {
  const utc = new Date();
  const kstHour = (utc.getUTCHours() + 9) % 24;
  if (kstHour >= 19 && kstHour <= 23) return 2.5;
  if (kstHour >= 0 && kstHour <= 6) return 0.4;
  return 1.0;
}

function buildRegionInc(mult: number) {
  const inc: Record<string, number> = {};
  const n = randInt(1, 3);
  for (let i = 0; i < n; i++) {
    const r = pick(REGIONS);
    inc[r] = (inc[r] ?? 0) + Math.max(1, Math.round(randInt(1, 8) * mult));
  }
  return inc;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  if (!CRON_SECRET) {
    return new Response(JSON.stringify({ error: "misconfigured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if ((req.headers.get("x-bot-cron-secret") ?? "") !== CRON_SECRET) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // pg_cron fires every minute → loop 12 ticks × 5s for true 5-second cadence.
    let strikesInserted = 0;
    let momentsInserted = 0;

    for (let tick = 0; tick < 12; tick++) {
      const mult = kstHourMultiplier();

      // 1) pulse update
      const liveDelta = Math.round(randInt(47, 312) * mult);
      const activeNow = Math.round(randInt(2800, 18500) * mult);
      // ~ 12% of ticks add a withdrawal sum
      const wdDelta =
        Math.random() < 0.12 ? Math.round(randInt(120_000, 9_800_000) * mult) : 0;
      const regionInc = buildRegionInc(mult);

      await sb.rpc("ghost_tick", {
        _live_delta: liveDelta,
        _active_now: activeNow,
        _wd_delta: wdDelta,
        _region_inc: regionInc,
      });

      // 2) Strike every ~8s → ~62% of 5s ticks
      if (Math.random() < 0.62 * mult) {
        const kind = pick(["crown", "crown", "withdraw", "baron"]) as
          | "crown"
          | "baron"
          | "withdraw";
        let amount = 0;
        let label = "";
        if (kind === "crown") {
          amount = randInt(8_000, 480_000);
          label = pick(["crown_explosion", "mega_crown", "jackpot_strike"]);
        } else if (kind === "withdraw") {
          amount = randInt(180_000, 12_000_000);
          label = "withdrawal";
        } else {
          amount = 0;
          label = "baron_promotion";
        }
        const { error } = await sb.from("ghost_strikes").insert({
          kind,
          amount,
          label,
          nick: maskNick(),
          region: pick(REGIONS),
          is_simulated: true,
        });
        if (!error) strikesInserted++;
      }

      // 3) Moment every ~15s → ~33% of 5s ticks
      if (Math.random() < 0.33 * mult) {
        const amt = randInt(1_200_000, 87_420_000);
        const verb = pick([
          "출금 완료",
          "Crown 폭발",
          "Founding Seat 합류",
          "잭팟 적중",
        ]);
        const msg = `${maskNick()} 황제 — ${verb} ₩${amt.toLocaleString("ko-KR")}`;
        const { error } = await sb.from("ghost_moments").insert({
          message: msg,
          amount: amt,
          kind: verb.includes("출금") ? "withdraw" : "crown",
          is_simulated: true,
        });
        if (!error) momentsInserted++;
      }

      // sleep 5s between ticks (skip after last)
      if (tick < 11) await new Promise((r) => setTimeout(r, 5000));
    }

    // cleanup expired
    await sb.rpc("ghost_cleanup_expired");

    return new Response(
      JSON.stringify({
        ok: true,
        ticks: 12,
        strikes: strikesInserted,
        moments: momentsInserted,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[ghost-pulse-tick]", e);
    return new Response(JSON.stringify({ error: "internal_error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
