// emperor-coach: 5-card daily AI briefing (Lovable AI Gateway)
// Modes:
//   POST {} (with auth)            → generate for caller
//   POST {"target_user_id":"..."}  (service role) → generate for any user
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

import { createClient } from "jsr:@supabase/supabase-js@2";

const SYS = `너는 'Phonara Empire'의 AI 황실 비서다. 사용자의 오늘 24시간 데이터를 보고 5장의 짧은 카드를 한국어로 만든다.
각 카드는 정확한 키 5개를 갖는 JSON 객체로만 응답한다 — 다른 텍스트는 절대 추가하지 말 것.
{ "cards": [
  {"kind":"mission","emoji":"🎯","title":"...", "body":"한 줄, 35자 이내","cta":"행동 1개"},
  {"kind":"signal","emoji":"📡","title":"...","body":"...","cta":"..."},
  {"kind":"risk","emoji":"⚠️","title":"...","body":"...","cta":"..."},
  {"kind":"crown","emoji":"👑","title":"...","body":"...","cta":"..."},
  {"kind":"fortune","emoji":"🔮","title":"...","body":"...","cta":"..."}
]}
톤: 단호하고 자신감 있게. 절대 손실 보장이나 수익 약속 금지. CTA는 동사로 시작.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("method", { status: 405, headers: corsHeaders });

  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "missing_api_key" }), {
      status: 500, headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }
  const SB_URL = Deno.env.get("SUPABASE_URL")!;
  const SR = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(SB_URL, SR, { auth: { persistSession: false } });

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch {}
  const targetUserId = (body?.target_user_id as string) ?? null;

  let context: Record<string, unknown> = {};
  let userId = "";

  if (targetUserId) {
    // Service-mode: use payload + minimal lookup
    userId = targetUserId;
    context = body?.context as any ?? {
      user_id: targetUserId, nickname: "Emperor", phon: 0, level: 1, crown_24h: 0, jackpot_24h: 0,
    };
  } else {
    // User-mode: call request_my_briefing_context with user JWT
    const auth = req.headers.get("authorization") ?? "";
    if (!auth.toLowerCase().startsWith("bearer ")) {
      return new Response(JSON.stringify({ error: "auth_required" }), {
        status: 401, headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }
    const userClient = createClient(SB_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
      auth: { persistSession: false },
    });
    const { data: ctx, error: ctxErr } = await userClient.rpc("request_my_briefing_context");
    if (ctxErr) {
      return new Response(JSON.stringify({ error: ctxErr.message }), {
        status: ctxErr.message === "rate_limited" ? 429 : 400,
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }
    context = ctx as any;
    userId = (context?.user_id as string) ?? "";
  }
  if (!userId) {
    return new Response(JSON.stringify({ error: "no_user" }), {
      status: 400, headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }

  const userPrompt = `사용자 컨텍스트(JSON): ${JSON.stringify(context)}
- nickname을 사용해 친근하게 부른다.
- crown_24h가 0이면 'mission' 카드는 'practice' 또는 'attendance' 행동을 제안한다.
- jackpot_24h>=1 이면 'crown' 카드에서 폭발 흐름을 강조한다.
- phon이 0 또는 매우 낮으면 'mission' 카드는 무료 미션을 제안한다.
- 'fortune'은 가벼운 운세 톤 + 1줄 행동.
JSON만 출력.`;

  let cards: unknown[] = [];
  let model = "google/gemini-2.5-flash";
  try {
    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", "authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYS },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (aiRes.status === 429) {
      return new Response(JSON.stringify({ error: "ai_rate_limited" }), {
        status: 429, headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }
    if (aiRes.status === 402) {
      return new Response(JSON.stringify({ error: "ai_credits_exhausted" }), {
        status: 402, headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }
    if (!aiRes.ok) {
      const t = await aiRes.text();
      return new Response(JSON.stringify({ error: "ai_failed", detail: t }), {
        status: 500, headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }
    const j = await aiRes.json();
    const txt = j?.choices?.[0]?.message?.content ?? "{}";
    const parsed = typeof txt === "string" ? JSON.parse(txt) : txt;
    cards = Array.isArray(parsed?.cards) ? parsed.cards.slice(0, 5) : [];
  } catch (e) {
    return new Response(JSON.stringify({ error: "ai_parse_failed", detail: String(e) }), {
      status: 500, headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }

  if (cards.length === 0) {
    return new Response(JSON.stringify({ error: "empty_cards" }), {
      status: 502, headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }

  const { error: upErr } = await admin.rpc("upsert_daily_briefing", {
    _user_id: userId, _cards: cards, _model: model, _context: context,
  });
  if (upErr) {
    return new Response(JSON.stringify({ error: "upsert_failed", detail: upErr.message }), {
      status: 500, headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true, cards, model }), {
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
});
