import { useDB, ATTENDANCE_REWARDS, formatKRW, todayStr } from "@/lib/store";
import { CalendarCheck, Sparkles, Flame, AlertTriangle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { assertRateLimit, RL_MISSION } from "@/lib/rateLimit";
import { useEffect, useState } from "react";
import { emitEarned } from "@/components/onboarding/EarnedToast";
import { isFlagOn } from "@/lib/conversion-flags";
import { refreshWallet } from "@/lib/walletRefresh";

export default function AttendanceCard() {
  const [db, setDb] = useDB();
  const [busy, setBusy] = useState(false);
  // streak loss aversion countdown — hooks MUST run before any early return
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000 * 30);
    return () => clearInterval(t);
  }, []);

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
      await assertRateLimit(RL_MISSION.scope, RL_MISSION.max);
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
      emitEarned(serverReward);
      refreshWallet();
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

  // (countdown hooks moved above early return)
  const midnight = new Date(); midnight.setHours(24, 0, 0, 0);
  const msLeft = midnight.getTime() - now;
  const hLeft = Math.max(0, Math.floor(msLeft / 3_600_000));
  const mLeft = Math.max(0, Math.floor((msLeft % 3_600_000) / 60_000));
  const atRisk = isFlagOn("streakLossAversion") && !claimed && streak >= 2;

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
      {atRisk && (
        <div className="relative mt-3 flex items-center gap-2 rounded-xl bg-destructive/10 border border-destructive/30 px-3 py-2">
          <Flame className="w-4 h-4 text-destructive shrink-0" />
          <div className="text-[11px] leading-tight">
            <span className="font-black text-destructive">🔥 {streak}일 연속 스트릭 소실 위험</span>
            <span className="text-muted-foreground"> · 오늘 자정까지 {hLeft}시간 {mLeft}분 남음</span>
          </div>
          <AlertTriangle className="w-3.5 h-3.5 text-destructive ml-auto animate-pulse shrink-0" />
        </div>
      )}
    </div>
  );
}
