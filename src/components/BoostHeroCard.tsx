import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { formatKRW } from "@/lib/store";
import { refreshWallet } from "@/lib/missions-rpc";
import { toast } from "@/hooks/use-toast";
import { Bot, Sparkles, ChevronRight, Zap, Flame } from "lucide-react";

type Machine = {
  id: string;
  package_id: string;
  package_name: string;
  daily_return: number;
  duration_days: number;
  settled_count: number;
  last_harvest_date: string | null;
  harvest_streak: number;
  status: string;
  boost_until: string | null;
  boost_multiplier: number | null;
};

function isHarvestableToday(m: Machine) {
  if (!m.last_harvest_date) return true;
  const today = new Date().toISOString().slice(0, 10);
  return m.last_harvest_date < today;
}

function isInBoost(m: Machine) {
  if (!m.boost_until || !m.boost_multiplier || m.boost_multiplier <= 1.0) return false;
  return new Date(m.boost_until).getTime() > Date.now();
}

function boostCountdown(until: string): string {
  const ms = new Date(until).getTime() - Date.now();
  if (ms <= 0) return "00:00:00";
  const h = Math.floor(ms / 3.6e6);
  const m = Math.floor((ms % 3.6e6) / 6e4);
  const s = Math.floor((ms % 6e4) / 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function nextHarvestCountdown(): string {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  const ms = tomorrow.getTime() - now.getTime();
  const h = Math.floor(ms / 3.6e6);
  const m = Math.floor((ms % 3.6e6) / 6e4);
  const s = Math.floor((ms % 6e4) / 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function BoostHeroCard() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [harvesting, setHarvesting] = useState<string | null>(null);
  const [, setTick] = useState(0);

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data } = await supabase
      .from("package_purchases")
      .select("id,package_id,package_name,daily_return,duration_days,settled_count,last_harvest_date,harvest_streak,status,boost_until,boost_multiplier")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("created_at", { ascending: false });
    setMachines((data ?? []) as Machine[]);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);
  useEffect(() => {
    const i = setInterval(() => setTick((t) => t + 1), 2000);
    return () => clearInterval(i);
  }, []);

  const harvest = async (m: Machine) => {
    setHarvesting(m.id);
    const { data, error } = await supabase.rpc("harvest_machine", { _purchase_id: m.id });
    setHarvesting(null);
    if (error) {
      toast({ title: "수확 실패", description: error.message, variant: "destructive" });
      return;
    }
    const r = data as { amount: number; bonus: number; multiplier: number; streak: number; seven_day_bonus: boolean; completed: boolean };
    toast({
      title: `🤖 +${formatKRW(r.amount + (r.bonus || 0))} 수확 완료!`,
      description:
        (r.multiplier > 1.0 ? `🔥 부스트 ×${r.multiplier} 적용 · ` : "") +
        (r.seven_day_bonus ? `🏆 7일 챌린지 보너스 +${formatKRW(r.bonus)}!` : `${r.streak}일 연속`),
    });
    void refreshWallet();
    void load();
  };

  if (loading) return null;

  if (machines.length === 0) {
    return (
      <Link to="/packages" className="block group">
        <div className="relative lift">
          <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-gold via-primary to-secondary opacity-60 blur group-hover:opacity-100 transition" />
          <div className="relative glass-strong rounded-2xl p-4 flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gold/30 to-primary/30 flex items-center justify-center">
              <Bot className="w-6 h-6 text-gold" />
            </div>
            <div className="flex-1">
              <div className="font-display font-black text-sm">🔥 지금 시작 시 첫 3일 보너스 구간</div>
              <p className="text-[11px] text-muted-foreground">머신 ON → 매일 수확 1번 → 끝</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>
      </Link>
    );
  }

  return (
    <div className="space-y-3">
      {machines.map((m) => {
        const ready = isHarvestableToday(m);
        const boost = isInBoost(m);
        const mult = boost ? Number(m.boost_multiplier) : 1.0;
        const todayAmount = Math.floor(m.daily_return * mult);
        const boostBonus = todayAmount - m.daily_return;
        const daysLeft = Math.max(0, m.duration_days - m.settled_count);
        return (
          <div key={m.id} className="relative lift">
            <div className={`absolute -inset-0.5 rounded-2xl ${boost ? "bg-gradient-to-r from-gold via-primary to-gold animate-pulse" : ready ? "bg-gradient-to-r from-secondary via-primary to-secondary" : "bg-muted"} opacity-60 blur`} />
            <div className="relative glass-strong rounded-2xl p-4 overflow-hidden">
              {boost && (
                <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-gold/20 via-primary/20 to-gold/20 px-3 py-1.5 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-gold">
                    <Flame className="w-3 h-3 animate-pulse" />
                    초기 수익 최대 구간 진입
                  </div>
                  <span className="font-mono text-[11px] font-bold text-gold tabular-nums">
                    {boostCountdown(m.boost_until!)}
                  </span>
                </div>
              )}
              <div className={`flex items-center justify-between mb-3 ${boost ? "mt-7" : ""}`}>
                <div className="flex items-center gap-2">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${ready ? "bg-gradient-to-br from-gold/40 to-primary/40" : "bg-muted/30"}`}>
                    <Bot className={`w-5 h-5 ${ready ? "text-gold" : "text-muted-foreground"}`} />
                  </div>
                  <div>
                    <div className="font-display font-black text-sm flex items-center gap-1">
                      {m.package_name}
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {m.harvest_streak}일째 가동 · 잔여 {daysLeft}일
                    </p>
                  </div>
                </div>
              </div>

              <div className="text-center mb-3">
                <p className="text-[10px] text-muted-foreground">{ready ? "오늘 수확 가능 금액" : "내일 수확 가능"}</p>
                <p className="font-display font-black text-3xl text-gradient-gold">
                  {formatKRW(todayAmount)}
                </p>
                {boost && boostBonus > 0 && (
                  <p className="text-[11px] text-gold font-bold mt-1">
                    🔥 부스트 +{formatKRW(boostBonus)}
                  </p>
                )}
              </div>

              {ready ? (
                <button
                  onClick={() => harvest(m)}
                  disabled={harvesting === m.id}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-gold via-primary to-gold font-display font-black text-sm text-background hover:scale-[1.02] transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {harvesting === m.id ? (
                    <>🤖 AI Bot 수확 중...</>
                  ) : (
                    <><Sparkles className="w-4 h-4" /> 수확하기 (+{formatKRW(todayAmount)})<Zap className="w-4 h-4" /></>
                  )}
                </button>
              ) : (
                <div className="w-full py-3 rounded-xl glass border border-border text-center text-xs text-muted-foreground">
                  다음 수확까지 <span className="font-mono font-bold text-gold">{nextHarvestCountdown()}</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
