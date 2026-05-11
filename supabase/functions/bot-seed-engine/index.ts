// P0.5 — Bot Seeding Engine (extended)
// 매분 호출되어 시뮬레이션 활동/길드 채팅 이벤트를 생성합니다.
// 봇은 표시 전용이며, KRW/USDT 잔고에는 절대 영향을 주지 않습니다.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-bot-cron-secret",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON_SECRET  = Deno.env.get("BOT_CRON_SECRET") ?? "";

const sb = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

// ───────── 활동 피드 템플릿 ─────────
const TEMPLATES: Record<string, (n: string, e: string) => { text: string; reward: number | null }> = {
  attendance:       (n, e) => ({ text: `${e} ${n}님 — 출석 체크 완료`, reward: null }),
  mission_clear:    (n, e) => ({ text: `${e} ${n}님 — AI 미션 클리어 +${pick([300, 500, 700, 1000]).toLocaleString()}원`, reward: pick([300, 500, 700, 1000]) }),
  paper_win:        (n, e) => ({ text: `${e} ${n}님 — Paper 트레이드 +${pick([5, 8, 12, 18, 25])}% 승리`, reward: null }),
  package_purchase: (n, e) => {
    const tier = pick(["Starter", "Easy 50", "Easy 150", "EMPIRE", "ELITE", "PHANTOM"]);
    return { text: `${e} ${n}님 — ${tier} 패키지 가입`, reward: null };
  },
  jackpot_contrib:  (n, e) => ({ text: `${e} ${n}님 — 잭팟 풀에 ${pick([5_000, 15_000, 50_000, 120_000]).toLocaleString()}원 기여`, reward: pick([5_000, 15_000, 50_000, 120_000]) }),
  withdrawal:       (n, e) => ({ text: `${e} ${n}님 — ${pick([100_000, 350_000, 1_200_000, 4_800_000]).toLocaleString()}원 출금 완료`, reward: pick([100_000, 350_000, 1_200_000, 4_800_000]) }),
  recovery:         (n, e) => ({ text: `${e} ${n}님 — Recovery Bonus +${pick([20, 30, 40, 50, 60])}% 획득`, reward: null }),
  guild_join:       (n, e) => ({ text: `${e} ${n}님 — 길드 가입`, reward: null }),
  new_signup:       (n, e) => ({ text: `${e} ${n}님 — 제국에 합류했습니다`, reward: null }),
};

const TYPE_WEIGHTS: [string, number][] = [
  ["mission_clear", 30], ["paper_win", 18], ["attendance", 14],
  ["package_purchase", 10], ["jackpot_contrib", 9], ["withdrawal", 7],
  ["recovery", 6], ["new_signup", 4], ["guild_join", 2],
];
function weightedPickType(): string {
  const total = TYPE_WEIGHTS.reduce((a, [, w]) => a + w, 0);
  let r = Math.random() * total;
  for (const [t, w] of TYPE_WEIGHTS) { r -= w; if (r <= 0) return t; }
  return TYPE_WEIGHTS[0][0];
}

// ───────── 길드 채팅 페르소나 ─────────
const CHAT_TEMPLATES_KO = [
  "오늘 잭팟 누적 미쳤다 ㄷㄷ",
  "방금 Paper 롱 한 방 +18% 들어옴",
  "다들 출석 찍었어요? 보너스 챙기세요",
  "이번 주 길드 랭킹 1위 가즈아",
  "신규 패키지 EMPIRE 가입 완료. 다음 주가 기대됩니다",
  "출금 또 5분 컷이네 ㅋㅋ 빠르긴 진짜 빨라",
  "리커버리 보너스 받고 다시 풀충전 ㄱㄱ",
  "방금 미션 3개 클리어 — 일일 보상 다 챙김",
  "길드원분들 오늘도 화이팅",
  "Paper 숏 좀 도와주실분 ㅠ",
  "이번 시즌 패스 어디까지 가셨어요?",
  "트레이딩 아레나 진입 — 이번엔 진짜 깨봅니다",
  "어제 출금 350,000 인증 완료. 진짜네",
  "신규분들 길드 채팅 적극 활용하세요. 정보가 곧 돈입니다",
  "오늘 새벽 5시 잭팟 한 번 노려보실분?",
];
const CHAT_TEMPLATES_EN = [
  "Jackpot pool is insane right now",
  "Just hit +18% on a paper long, lfg",
  "Don't forget daily check-in for the bonus",
  "Pushing for guild rank 1 this week",
  "Recovery bonus stacked, back to full",
  "Withdrawal cleared in under 5 min, no joke",
  "Anyone running the new EMPIRE package?",
];
function chatTemplate(lang: string): string {
  if (lang === "en") return pick(CHAT_TEMPLATES_EN);
  return pick(CHAT_TEMPLATES_KO);
}

// phase별 강도 곱
const PHASE_MULT: Record<number, number> = { 1: 1.0, 2: 0.3, 3: 0.1, 4: 0.05 };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  if (CRON_SECRET) {
    const provided = req.headers.get("x-bot-cron-secret") ?? "";
    if (provided !== CRON_SECRET) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  try {
    const { data: settings, error: setErr } = await sb
      .from("bot_settings")
      .select("enabled, strength_pct, bot_ratio_phase")
      .eq("id", 1).maybeSingle();
    if (setErr) throw setErr;
    if (!settings?.enabled || (settings.strength_pct ?? 0) === 0) {
      return new Response(JSON.stringify({ skipped: "disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const strength = settings.strength_pct as number;
    const phase = (settings.bot_ratio_phase ?? 1) as number;
    const mult = PHASE_MULT[phase] ?? 1.0;

    // 페르소나 풀
    const { data: personas, error: pErr } = await sb
      .from("bot_personas")
      .select("id, nickname, avatar_emoji, language")
      .limit(2000);
    if (pErr) throw pErr;
    if (!personas || personas.length === 0) {
      return new Response(JSON.stringify({ skipped: "no_personas" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ───────── 1) 활동 피드 ─────────
    const N = Math.max(0, Math.round((strength / 100) * 120 * mult));
    const activityRows: Array<Record<string, unknown>> = [];
    for (let i = 0; i < N; i++) {
      const p = personas[Math.floor(Math.random() * personas.length)];
      const type = weightedPickType();
      const tpl = TEMPLATES[type](p.nickname, p.avatar_emoji);
      const offsetMs = Math.floor(Math.random() * 60_000);
      activityRows.push({
        persona_id: p.id,
        event_type: type,
        event_text: tpl.text,
        reward_amount: tpl.reward,
        occurred_at: new Date(Date.now() - offsetMs).toISOString(),
      });
    }
    if (activityRows.length > 0) {
      const { error } = await sb.from("bot_activity_events").insert(activityRows);
      if (error) throw error;
    }
    await sb.from("bot_activity_events").delete().lt("expires_at", new Date().toISOString());

    // ───────── 2) 길드 채팅 시딩 ─────────
    const { data: guilds } = await sb
      .from("guilds")
      .select("id, name, member_count")
      .eq("is_seed", true)
      .gte("member_count", 100)
      .limit(40);

    let chatInserted = 0;
    if (guilds && guilds.length > 0) {
      const guildPickCount = Math.max(0, Math.round(8 * mult)); // phase1: 8, phase2: 2-3, phase4: 0
      const chosen = [...guilds].sort(() => Math.random() - 0.5).slice(0, guildPickCount);
      const chatRows: Array<Record<string, unknown>> = [];
      for (const g of chosen) {
        const msgCount = 1 + Math.floor(Math.random() * 3); // 1~3개
        for (let i = 0; i < msgCount; i++) {
          const p = personas[Math.floor(Math.random() * personas.length)];
          const offsetMs = Math.floor(Math.random() * 55_000) + 2_000;
          chatRows.push({
            guild_id: g.id,
            user_id: null,
            is_bot: true,
            bot_nickname: p.nickname,
            bot_emoji: p.avatar_emoji,
            message: chatTemplate((p as any).language ?? "ko"),
            created_at: new Date(Date.now() - offsetMs).toISOString(),
          });
        }
      }
      if (chatRows.length > 0) {
        const { error: chErr } = await sb.from("guild_chat_messages").insert(chatRows);
        if (chErr) console.error("[bot-seed-engine] chat insert error", chErr);
        else chatInserted = chatRows.length;
      }
    }

    return new Response(JSON.stringify({
      ok: true, phase, mult, activity: activityRows.length, chat: chatInserted, strength,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("[bot-seed-engine] error", e);
    return new Response(JSON.stringify({ error: "internal_error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
