// Phase F — Smart Re-engagement scheduler.
// Inserts into public.notifications; the AFTER INSERT trigger fans out Web Push
// through send-push (which enforces kill switch + 3/day cap).
//
// Cron: 10:00 KST daily ("0 1 * * *" UTC).
//
// SECURITY: callable with BOT_CRON_SECRET (header `x-cron-secret`) OR service role.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const CRON_SECRET = Deno.env.get("BOT_CRON_SECRET") ?? "";

function authorized(req: Request): boolean {
  const cs = req.headers.get("x-cron-secret") ?? "";
  if (CRON_SECRET && cs && cs === CRON_SECRET) return true;
  const auth = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  return !!SERVICE_KEY && auth === SERVICE_KEY;
}

// Warm King × Imperial Luxury copy templates. Never include amounts/balances/PII.
function streakCopy(streak: number) {
  return {
    title: "👑 폐하, 제국의 불꽃이 꺼지려 합니다",
    body: `${streak}일 연속 등극을 이어오셨습니다. 오늘 3분이면 황금 스트릭을 지킬 수 있습니다.`,
  };
}
function comebackCopy(days: number) {
  if (days <= 7) return {
    title: "👑 황좌가 폐하를 기다립니다",
    body: `${days}일째 비어있는 옥좌가 차갑게 식어가고 있습니다. 잠시 들러주십시오.`,
  };
  if (days <= 14) return {
    title: "👑 제국이 폐하의 귀환을 갈망합니다",
    body: `${days}일의 부재. 신하들이 폐하의 다음 명령을 기다리고 있습니다.`,
  };
  return {
    title: "👑 다시 즉위하실 시간입니다",
    body: `${days}일 만의 귀환을 환영할 준비가 되어 있습니다. 특별한 환영 의식이 예정되어 있습니다.`,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (!authorized(req)) return json({ ok: false, error: "forbidden" }, 403);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  // Master kill switch check
  const { data: ks } = await admin
    .from("platform_kill_switches").select("enabled").eq("key", "push_engine").maybeSingle();
  if (ks?.enabled) return json({ ok: true, skipped: "push_engine killed" });

  let inserted = 0;

  // 1) Streak protection
  const { data: streakRows } = await admin.rpc("list_streak_at_risk_users");
  for (const row of (streakRows ?? []) as Array<{ user_id: string; attendance_streak: number }>) {
    const c = streakCopy(row.attendance_streak);
    const { error } = await admin.from("notifications").insert({
      user_id: row.user_id, kind: "streak_protect",
      title: c.title, body: c.body,
      payload: { streak: row.attendance_streak, campaign: "streak_protect" },
    });
    if (!error) inserted++;
  }

  // 2) Comeback campaign (7 / 14 / 30 d)
  const { data: dormantRows } = await admin.rpc("list_dormant_users", { _days: [7, 14, 30] });
  for (const row of (dormantRows ?? []) as Array<{ user_id: string; dormant_days: number }>) {
    const c = comebackCopy(row.dormant_days);
    const kind = `comeback_${row.dormant_days}d`;
    const { error } = await admin.from("notifications").insert({
      user_id: row.user_id, kind,
      title: c.title, body: c.body,
      payload: { dormant_days: row.dormant_days, campaign: kind },
    });
    if (!error) inserted++;
  }

  return json({ ok: true, inserted });
});

function json(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), {
    status: s, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
