// PR-A: Empire AI Concierge — context-aware FOMO suggestion via Lovable AI Gateway
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type CtaKind = "practice" | "baron" | "packages" | "missions" | "wallet" | "guild";

const ROUTE_BY_CTA: Record<CtaKind, string> = {
  practice: "/practice",
  baron: "/packages",
  packages: "/packages",
  missions: "/missions",
  wallet: "/wallet",
  guild: "/lounge",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "ai_unavailable" }), {
        status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auth
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return new Response(JSON.stringify({ error: "no_auth" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

    const supaUser = createClient(SUPABASE_URL, SERVICE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await supaUser.auth.getUser(token);
    if (!user) return new Response(JSON.stringify({ error: "invalid_user" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

    const supa = createClient(SUPABASE_URL, SERVICE_KEY);

    // Gather context
    const [{ data: profile }, { data: boosterRows }, { data: recentEvents }] = await Promise.all([
      supa.from("profiles")
        .select("nickname, empire_level, crown_score, attendance_streak, last_attendance, total_deposit, total_withdraw, tier")
        .eq("id", user.id).maybeSingle(),
      supa.rpc("get_active_empire_booster" as any),
      supa.from("concierge_events")
        .select("kind, cta, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(8),
    ]);

    const booster = Array.isArray(boosterRows) && boosterRows.length > 0 ? boosterRows[0] : null;
    const boosterRemMs = booster ? new Date(booster.expires_at).getTime() - Date.now() : 0;
    const boosterActive = booster && boosterRemMs > 0;

    const level = profile?.empire_level ?? 1;
    const crown = profile?.crown_score ?? 0;
    const streak = profile?.attendance_streak ?? 0;
    const totalDep = Number(profile?.total_deposit ?? 0);

    // Empire level thresholds (mirrors empire_levels seed)
    const NEXT_REQ: Record<number, { name: string; req: number }> = {
      1: { name: "Apprentice", req: 50 },
      2: { name: "Warrior", req: 150 },
      3: { name: "Guardian", req: 350 },
      4: { name: "Noble", req: 700 },
      5: { name: "Lord", req: 1400 },
      6: { name: "Baron", req: 2800 },
      7: { name: "Duke", req: 5600 },
      8: { name: "King", req: 11200 },
      9: { name: "Emperor", req: 22400 },
    };
    const next = NEXT_REQ[level] ?? null;
    const crownToNext = next ? Math.max(0, next.req - crown) : 0;

    // Cooldown: skip if >=3 suggests in last hour
    const hourAgo = Date.now() - 3600_000;
    const recentSuggests = (recentEvents ?? []).filter((e: any) =>
      e.kind === "suggest" && new Date(e.created_at).getTime() > hourAgo
    ).length;
    if (recentSuggests >= 3) {
      return new Response(JSON.stringify({ skip: true, reason: "cooldown" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Pick CTA priority
    let cta: CtaKind;
    if (boosterActive) cta = "baron";          // Booster active → push package conversion
    else if (level >= 6) cta = "baron";         // Lord+ → Baron push
    else if (totalDep === 0) cta = "practice";  // First-timer → Practice
    else if (crownToNext > 0 && crownToNext <= 50) cta = "practice"; // close to level up
    else if (level >= 4) cta = "guild";
    else cta = "missions";

    const ctx = {
      level, crown, streak, crownToNext,
      nextLevelName: next?.name ?? "Emperor",
      boosterActive: !!boosterActive,
      boosterRemMin: boosterActive ? Math.floor(boosterRemMs / 60000) : 0,
      hasDeposited: totalDep > 0,
      cta,
    };

    const systemPrompt = `당신은 "Empire OS"의 AI Concierge다. Phonara 제국의 친근하지만 강력한 안내자.
규칙:
- 한국어 1~2문장, 총 60자 이내. 매번 다르게.
- "당신의 제국", "Empire", "Crown", "Baron" 같은 제국 어휘 적극 사용.
- FOMO + 희망 + urgency를 동시에. 따뜻함도 잃지 마라.
- 절대 금지: KRW/원/억/수익 보장/원금 보장/확정/박○○/%수익률.
- 숫자는 Crown(₡) · 시간 · 레벨만 허용.
- 마지막에 행동 유도 동사 1개("지금 가세요", "참여하세요", "활성화하세요" 등).
- JSON으로만 답하라: {"message":"...","tone":"hype|warm|urgent"}`;

    const userPrompt = `유저 컨텍스트:
- Empire Level: ${level} → 다음 ${ctx.nextLevelName}까지 Crown ${crownToNext} 남음
- 보유 Crown: ${crown} ₡
- 출석 streak: ${streak}일
- Empire Booster: ${boosterActive ? `활성 (${ctx.boosterRemMin}분 남음, 수수료 -30% / Crown ×1.5)` : "비활성"}
- 첫 입금: ${ctx.hasDeposited ? "완료" : "미완료"}
- 추천 CTA: ${cta}

위 컨텍스트에 맞춰 1~2문장 발화를 만들어라.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (aiResp.status === 429) return new Response(JSON.stringify({ error: "rate_limited" }), {
      status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
    if (aiResp.status === 402) return new Response(JSON.stringify({ error: "credits" }), {
      status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("ai gateway", aiResp.status, t);
      return new Response(JSON.stringify({ error: "ai_error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiResp.json();
    let message = "당신의 제국이 당신을 기다리고 있습니다.";
    let tone = "warm";
    try {
      const parsed = JSON.parse(aiJson.choices?.[0]?.message?.content ?? "{}");
      if (typeof parsed.message === "string" && parsed.message.length > 0) message = parsed.message.slice(0, 140);
      if (typeof parsed.tone === "string") tone = parsed.tone;
    } catch (_) {}

    // Log suggest event
    await supa.from("concierge_events").insert({
      user_id: user.id,
      kind: "suggest",
      cta,
      route: ROUTE_BY_CTA[cta],
      message,
      empire_level: level,
      crown_score: crown,
      booster_active: !!boosterActive,
      payload: { tone, crownToNext, nextLevelName: ctx.nextLevelName },
    });

    return new Response(JSON.stringify({
      message, tone, cta, route: ROUTE_BY_CTA[cta],
      ctx: { level, crown, crownToNext, nextLevelName: ctx.nextLevelName, boosterActive: !!boosterActive, boosterRemMin: ctx.boosterRemMin },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("concierge-suggest error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
