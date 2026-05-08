// AI Mission Generator — analyzes user behavior and queues personalized missions.
// Triggered by client (or cron). Uses Lovable AI Gateway with structured tool-calling.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

interface BehaviorSnapshot {
  total_deposits: number;
  total_coin_deposits: number;
  attendance_streak: number;
  daily_mission_count: number;
  last_attendance: string | null;
  referrals_made: number;
  recent_mission_wins: number;
  has_pending_ai_mission: boolean;
}

async function snapshot(admin: any, userId: string): Promise<BehaviorSnapshot> {
  const [{ data: profile }, { data: refs }, { data: recent }, { data: pending }] = await Promise.all([
    admin.from("profiles").select("attendance_streak,daily_mission_count,last_attendance,total_coin_deposits").eq("id", userId).maybeSingle(),
    admin.from("referrals").select("id", { count: "exact", head: true }).eq("inviter_id", userId),
    admin.from("mission_history").select("id", { count: "exact", head: true })
      .eq("user_id", userId).eq("is_win", true)
      .gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString()),
    admin.from("ai_generated_missions").select("id", { count: "exact", head: true })
      .eq("user_id", userId).in("status", ["pending", "approved"])
      .gt("expires_at", new Date().toISOString()),
  ]);
  return {
    total_deposits: 0,
    total_coin_deposits: Number(profile?.total_coin_deposits ?? 0),
    attendance_streak: profile?.attendance_streak ?? 0,
    daily_mission_count: profile?.daily_mission_count ?? 0,
    last_attendance: profile?.last_attendance ?? null,
    referrals_made: (refs as any)?.count ?? 0,
    recent_mission_wins: (recent as any)?.count ?? 0,
    has_pending_ai_mission: ((pending as any)?.count ?? 0) > 0,
  };
}

async function callAI(snap: BehaviorSnapshot, templates: any[]): Promise<any> {
  const tools = [{
    type: "function",
    function: {
      name: "create_mission",
      description: "Create a personalized mission for this user based on their behavior.",
      parameters: {
        type: "object",
        properties: {
          template_key: { type: "string", description: "Must match one of the available template keys." },
          title: { type: "string", description: "Personalized Korean mission title (max 30 chars)." },
          description: { type: "string", description: "Personalized Korean description (max 80 chars)." },
          reward_credit: { type: "integer", description: "Reward in KRW credit." },
          reward_xp: { type: "integer", description: "XP reward." },
          reasoning: { type: "string", description: "One sentence why this fits this user (Korean)." },
        },
        required: ["template_key", "title", "description", "reward_credit", "reward_xp", "reasoning"],
        additionalProperties: false,
      },
    },
  }];

  const sys = `You assign ONE personalized mission to a Korean fintech-gamification user.
Available templates (key | title | reward_credit | reward_xp | category):
${templates.map((t: any) => `- ${t.key} | ${t.title} | ${t.reward_credit} | ${t.reward_xp} | ${t.category}`).join("\n")}

Rules:
- Pick ONE template_key from the list above.
- Personalize the Korean title/description using the user's behavior.
- Stay within ±20% of the template's reward_credit and reward_xp.
- Make it feel achievable in <1 day.`;

  const usr = `User behavior snapshot:
${JSON.stringify(snap, null, 2)}

Choose the most engaging mission and call create_mission.`;

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [{ role: "system", content: sys }, { role: "user", content: usr }],
      tools,
      tool_choice: { type: "function", function: { name: "create_mission" } },
    }),
  });
  if (!resp.ok) {
    if (resp.status === 429) throw new Error("rate_limited");
    if (resp.status === 402) throw new Error("payment_required");
    throw new Error(`ai_gateway_${resp.status}`);
  }
  const j = await resp.json();
  const call = j.choices?.[0]?.message?.tool_calls?.[0];
  if (!call) throw new Error("no_tool_call");
  return JSON.parse(call.function.arguments);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Identify caller
    const auth = req.headers.get("Authorization") ?? "";
    const token = auth.replace("Bearer ", "");
    const { data: userData } = await admin.auth.getUser(token);
    const userId = userData?.user?.id;
    if (!userId) {
      return new Response(JSON.stringify({ error: "unauthenticated" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const snap = await snapshot(admin, userId);
    if (snap.has_pending_ai_mission) {
      return new Response(JSON.stringify({ ok: true, skipped: "already_has_pending" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: templates } = await admin.from("mission_templates").select("*").eq("active", true);
    if (!templates?.length) {
      return new Response(JSON.stringify({ error: "no_templates" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ai = await callAI(snap, templates);
    const tpl = templates.find((t: any) => t.key === ai.template_key);
    if (!tpl) throw new Error("invalid_template_chosen");

    // Clamp reward to ±20% guard
    const credit = Math.max(Math.round(tpl.reward_credit * 0.8), Math.min(Math.round(tpl.reward_credit * 1.2), Number(ai.reward_credit) || tpl.reward_credit));
    const xp = Math.max(Math.round(tpl.reward_xp * 0.8), Math.min(Math.round(tpl.reward_xp * 1.2), Number(ai.reward_xp) || tpl.reward_xp));

    const { data: enq, error: enqErr } = await admin.rpc("enqueue_ai_mission", {
      _user_id: userId,
      _template_key: ai.template_key,
      _title: String(ai.title).slice(0, 60),
      _description: String(ai.description).slice(0, 200),
      _reward_credit: credit,
      _reward_xp: xp,
      _ai_reasoning: String(ai.reasoning).slice(0, 400),
    });
    if (enqErr) throw enqErr;

    return new Response(JSON.stringify({ ok: true, mission_id: enq, ai }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    const msg = e?.message ?? "unknown";
    const status = msg === "rate_limited" ? 429 : msg === "payment_required" ? 402 : 500;
    console.error("ai-mission-generator error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
