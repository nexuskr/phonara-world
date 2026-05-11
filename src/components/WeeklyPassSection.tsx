import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { assertRateLimit, RL_WALLET } from "@/lib/rateLimit";
import { Star, Crown, Zap, Lock, CheckCircle2, Loader2 } from "lucide-react";
import { notify } from "@/lib/notify";
import { LoadingCard } from "@/components/ui/loading-state";

interface Reward { level: number; credit: number; badge: string | null; priority: boolean; description: string; }
interface Progress { xp: number; level: number; claimed_levels: number[]; }

export default function WeeklyPassSection() {
  const [data, setData] = useState<{ progress: Progress; rewards: Reward[]; iso_week: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    const { data: ov } = await supabase.rpc("get_weekly_pass_overview");
    setData(ov as any);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function claim(level: number) {
    setClaiming(level);
    const { error } = await supabase.rpc("claim_weekly_pass_reward", { _level: level });
    setClaiming(null);
    if (error) { notify.error("수령 실패", { description: error.message }); return; }
    load();
  }

  if (loading || !data) {
    return <LoadingCard className="rounded-3xl" />;
  }

  const lvl = data.progress?.level ?? 0;
  const claimed = (data.progress?.claimed_levels ?? []) as number[];

  return (
    <section className="relative overflow-hidden rounded-3xl border border-violet-400/40 p-5 bg-gradient-to-br from-violet-500/10 via-background to-fuchsia-500/5">
      <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-violet-400/20 blur-3xl pointer-events-none" />
      <div className="relative">
        <header className="flex items-center justify-between mb-3">
          <h2 className="font-imperial text-lg font-black flex items-center gap-2">
            <Star className="text-violet-400 w-5 h-5" />
            주간 시즌패스
            <span className="text-[10px] font-bold uppercase tracking-widest text-violet-400 px-2 py-0.5 rounded-full bg-violet-400/15">{data.iso_week}</span>
          </h2>
          <span className="text-xs font-bold tabular-nums">Lv {lvl}</span>
        </header>

        <div className="space-y-2">
          {data.rewards.map((r) => {
            const done = claimed.includes(r.level);
            const unlocked = lvl >= r.level;
            return (
              <div
                key={r.level}
                className={`flex items-center justify-between rounded-xl px-3 py-2.5 border ${
                  done ? "bg-emerald-500/10 border-emerald-500/40"
                  : unlocked ? "bg-card border-violet-400/30"
                  : "bg-card/40 border-border/30 opacity-60"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black tabular-nums shrink-0 ${
                    done ? "bg-emerald-500/20 text-emerald-300"
                    : unlocked ? "bg-violet-500/20 text-violet-300"
                    : "bg-card text-muted-foreground"
                  }`}>
                    {done ? <CheckCircle2 className="w-4 h-4" /> : unlocked ? r.level : <Lock className="w-3.5 h-3.5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold flex items-center gap-1.5 flex-wrap">
                      Lv {r.level} · {r.description}
                      {r.priority && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-black flex items-center gap-0.5"><Crown className="w-3 h-3" />출금우선</span>}
                      {r.badge && <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300 font-bold">{r.badge}</span>}
                    </div>
                    <div className="text-xs text-muted-foreground tabular-nums">+₩{r.credit.toLocaleString()}</div>
                  </div>
                </div>
                <button
                  onClick={() => claim(r.level)}
                  disabled={!unlocked || done || claiming === r.level}
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg ${
                    done ? "bg-emerald-500/20 text-emerald-300"
                    : unlocked ? "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white"
                    : "bg-card text-muted-foreground border border-border"
                  } disabled:opacity-60 flex items-center gap-1`}
                >
                  {claiming === r.level ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                  {done ? "수령됨" : unlocked ? "수령" : "잠금"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
