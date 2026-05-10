import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { loadDB, saveDB, type Tier } from "@/lib/store";
import { registerCurrentDevice } from "@/lib/deviceFingerprint";

const TIER_MAP: Record<string, Tier> = {
  normal: "NORMAL", vip: "VIP", god: "GOD", empire: "EMPIRE",
  NORMAL: "NORMAL", VIP: "VIP", GOD: "GOD", EMPIRE: "EMPIRE",
};

async function syncFromSession(session: any) {
  const db = loadDB();
  if (!session?.user) {
    if (db.user) saveDB({ ...db, user: null });
    return;
  }
  const uid = session.user.id;
  const email = session.user.email ?? "";
  const [{ data: profile }, { data: roles }, { data: wallet }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", uid),
    supabase.from("wallet_balances").select("*").eq("user_id", uid).maybeSingle(),
  ]);
  const tier = TIER_MAP[(profile as any)?.tier ?? "normal"] ?? "NORMAL";
  const isAdmin = (roles ?? []).some((r: any) => r.role === "admin");
  const merged = {
    id: uid,
    email,
    nickname: (profile as any)?.nickname ?? email.split("@")[0] ?? "User",
    phone: (profile as any)?.phone ?? "",
    realName: (profile as any)?.real_name ?? "",
    birth: (profile as any)?.birth_date ?? "",
    balance: Number((wallet as any)?.available_balance ?? 0),
    coinBalance: 0,
    todayEarnings: Number((wallet as any)?.today_earned ?? 0),
    streak: Number((profile as any)?.attendance_streak ?? 0),
    level: tier === "EMPIRE" ? 60 : tier === "GOD" ? 30 : tier === "VIP" ? 10 : 1,
    xp: 0,
    tier,
    isAdmin,
    badges: db.user?.badges ?? [],
    lastAttendance: (profile as any)?.last_attendance ?? undefined,
    attendanceStreak: Number((profile as any)?.attendance_streak ?? 0),
  };
  saveDB({ ...db, user: merged as any });
}

export function useAuthBridge() {
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      // Defer to avoid deadlock
      setTimeout(() => { syncFromSession(session); }, 0);
      if (event === "SIGNED_IN" && session?.user) {
        setTimeout(() => { void registerCurrentDevice(); }, 500);
        // P1: persona auto-classify (best-effort, never block)
        setTimeout(() => { void supabase.rpc("assign_persona" as any).then(() => {}); }, 800);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      syncFromSession(data.session);
      if (data.session?.user) {
        setTimeout(() => { void registerCurrentDevice(); }, 500);
        setTimeout(() => { void supabase.rpc("assign_persona" as any).then(() => {}); }, 800);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);
}
