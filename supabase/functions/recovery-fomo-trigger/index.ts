// recovery-fomo-trigger: scans recent losses/inactivity and enqueues FOMO notifications
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
import { createClient } from "jsr:@supabase/supabase-js@2";

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let m = 0;
  for (let i = 0; i < a.length; i++) m |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return m === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!token || !serviceKey || !timingSafeEqual(token, serviceKey)) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const since = new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(); // last 6h
  const stats = { recovery: 0, loss_streak: 0, inactive: 0, war_started: 0, errors: 0 };

  try {
    // 1) Recovery candidates: empire_battles losses in last 6h
    const { data: losses } = await admin
      .from("empire_battles")
      .select("user_id, created_at")
      .lt("pnl", 0)
      .gte("created_at", since)
      .limit(500);

    const lossCount: Record<string, number> = {};
    (losses ?? []).forEach((r: any) => {
      lossCount[r.user_id] = (lossCount[r.user_id] ?? 0) + 1;
    });

    for (const [uid, n] of Object.entries(lossCount)) {
      if (n >= 1) {
        const today = new Date().toISOString().slice(0, 10);
        const { error } = await admin.rpc("enqueue_fomo_notification", {
          _user_id: uid,
          _kind: "recovery",
          _title: "🔥 Recovery 보너스 발동!",
          _message: `최근 패배 ${n}회 — 지금 복귀하면 +50% Recovery 보너스가 활성화됩니다.`,
          _cta_label: "복귀 보상 받기",
          _cta_url: "/missions?hook=recovery",
          _priority: 9,
          _dedupe_key: `recovery_${today}`,
          _ttl_hours: 24,
        });
        if (error) stats.errors++;
        else stats.recovery++;
      }
    }

    // 2) Inactive users: profiles not active in 48-72h (window) — enqueue once/day
    const inactiveCutoff = new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString();
    const recentActive = new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString();
    const { data: inactive } = await admin
      .from("profiles")
      .select("user_id, last_attendance, updated_at")
      .lt("updated_at", inactiveCutoff)
      .gte("updated_at", new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString())
      .limit(200);

    for (const p of inactive ?? []) {
      const today = new Date().toISOString().slice(0, 10);
      const { error } = await admin.rpc("enqueue_fomo_notification", {
        _user_id: (p as any).user_id,
        _kind: "inactive",
        _title: "👑 당신의 제국이 기다립니다",
        _message: "48시간 미접속 — 영토 일부가 위협받고 있어요. 지금 복귀하면 첫 미션 2배 보상.",
        _cta_label: "지금 복귀",
        _cta_url: "/dashboard",
        _priority: 7,
        _dedupe_key: `inactive_${today}`,
        _ttl_hours: 24,
      });
      if (error) stats.errors++;
      else stats.inactive++;
    }

    // 3) Guild war started -> notify members
    const { data: wars } = await admin
      .from("guild_wars")
      .select("id, attacker_guild_id, defender_guild_id, started_at")
      .eq("status", "active")
      .gte("started_at", since)
      .limit(50);

    for (const w of wars ?? []) {
      const ids = [w.attacker_guild_id, w.defender_guild_id];
      const { data: members } = await admin
        .from("guild_members")
        .select("user_id, guild_id")
        .in("guild_id", ids);
      for (const m of members ?? []) {
        const role = (m as any).guild_id === w.attacker_guild_id ? "attacker" : "defender";
        const { error } = await admin.rpc("enqueue_fomo_notification", {
          _user_id: (m as any).user_id,
          _kind: "war_started",
          _title: role === "attacker" ? "⚔️ 출정 명령!" : "🛡️ 적군 침입!",
          _message:
            role === "attacker"
              ? "전쟁이 시작되었습니다 — 24시간 내 점령하면 길드 전체 보상."
              : "적 길드가 침공 — 지금 방어 기여 시 +30% XP.",
          _cta_label: "라운지로 이동",
          _cta_url: "/lounge",
          _priority: 8,
          _dedupe_key: `war_${w.id}`,
          _ttl_hours: 24,
        });
        if (error) stats.errors++;
        else stats.war_started++;
      }
    }

    return new Response(JSON.stringify({ ok: true, stats }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e), stats }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
