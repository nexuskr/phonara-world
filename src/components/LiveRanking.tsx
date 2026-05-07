import { useEffect, useState } from "react";
import { Trophy } from "lucide-react";
import { formatKRW } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";

type Row = { user_id: string; nickname: string; tier: string | null; earned: number; rank: number };

const TIER_EMOJI: Record<string, string> = { empire: "👑", god: "💎", vip: "⚡", normal: "🚀" };

export default function LiveRanking() {
  const [list, setList] = useState<Row[]>([]);

  async function load() {
    const { data } = await supabase
      .from("leaderboard_today")
      .select("user_id, nickname, tier, earned, rank")
      .limit(8);
    if (data) setList(data as Row[]);
  }

  useEffect(() => {
    void load();
    const i = setInterval(load, 8000);
    const ch = supabase
      .channel("leaderboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "daily_stats" }, () => void load())
      .subscribe();
    return () => { clearInterval(i); supabase.removeChannel(ch); };
  }, []);

  return (
    <div className="glass-strong rounded-2xl p-4 neon-border">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-gold" />
          <span className="font-display font-bold text-sm">실시간 랭킹</span>
        </div>
        <span className="text-[10px] text-secondary flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" /> LIVE
        </span>
      </div>
      {list.length === 0 ? (
        <div className="text-center text-xs text-muted-foreground py-8">아직 오늘 수익자가 없습니다</div>
      ) : (
        <div className="space-y-2">
          {list.map((r, i) => (
            <div key={r.user_id} className="flex items-center justify-between py-1">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center font-display font-black text-xs shrink-0
                  ${i === 0 ? "bg-gradient-gold text-gold-foreground glow-gold scale-110" : i === 1 ? "bg-secondary/30 text-secondary" : i === 2 ? "bg-accent/30 text-accent" : "bg-muted"}`}>
                  {i + 1}
                </div>
                <span className="text-xl">{TIER_EMOJI[(r.tier ?? "normal").toLowerCase()] ?? "🚀"}</span>
                <span className="text-sm font-bold truncate">{r.nickname}</span>
              </div>
              <div className="text-sm font-display font-bold text-gradient-primary tabular-nums shrink-0">{formatKRW(r.earned)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
