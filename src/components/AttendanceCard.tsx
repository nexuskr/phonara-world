import { useDB, ATTENDANCE_REWARDS, formatKRW, todayStr } from "@/lib/store";
import { CalendarCheck, Sparkles } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";

export default function AttendanceCard() {
  const [db, setDb] = useDB();
  const [busy, setBusy] = useState(false);
  if (!db.user) return null;

  const today = todayStr();
  const u = db.user;
  const claimed = u.lastAttendance === today;
  const streak = u.attendanceStreak ?? 0;
  const rewards = ATTENDANCE_REWARDS[u.tier];
  const isWeekly = ((streak + 1) % 7) === 0;
  const todayReward = rewards.base + (isWeekly ? rewards.weeklyBonus : 0);

  async function claim() {
    if (claimed || busy) return;
    setBusy(true);
    try {
      // Server-authoritative attendance claim
      const { data, error } = await supabase.rpc("claim_daily_attendance", { user_id: u.id });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      const serverReward = Number(row?.reward ?? todayReward);
      const newStreakSrv = Number(row?.new_streak ?? (streak + 1));

      setDb((d) => {
        if (!d.user) return d;
        return {
          ...d,
          user: {
            ...d.user,
            balance: d.user.balance + serverReward,
            todayEarnings: d.user.todayEarnings + serverReward,
            lastAttendance: today,
            attendanceStreak: newStreakSrv,
          },
        };
      });
      toast({
        title: `🗓️ 출석 완료 +${formatKRW(serverReward)}`,
        description: isWeekly ? `7일 연속! 보너스 포함` : `${newStreakSrv}일 연속 출석`,
      });
    } catch (e: any) {
      toast({ title: "출석 실패", description: e.message ?? "다시 시도해주세요", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="glass-strong rounded-2xl p-4 neon-border relative overflow-hidden">
      <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full bg-secondary/30 blur-3xl" />
      <div className="relative flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-cyber flex items-center justify-center glow-primary">
            <CalendarCheck className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <div className="text-[10px] tracking-widest text-secondary font-black">DAILY ATTENDANCE</div>
            <div className="text-sm font-display font-black">
              {claimed ? `오늘 출석 완료 · ${streak}일 연속` : `오늘의 출석 보상 +${formatKRW(todayReward)}`}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              {u.tier} 등급 · 7일마다 보너스 +{formatKRW(rewards.weeklyBonus)}
            </div>
          </div>
        </div>
        <button
          onClick={claim}
          disabled={claimed || busy}
          className="press shrink-0 px-4 py-2 rounded-xl bg-gradient-primary text-primary-foreground text-xs font-bold glow-primary disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
        >
          <Sparkles className="w-3.5 h-3.5" />
          {claimed ? "완료" : busy ? "..." : "출석"}
        </button>
      </div>
    </div>
  );
}
