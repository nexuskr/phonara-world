// PR-4: Guild Weekly Ranking Panel — top 50 with reward pools + own guild highlight.
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LoadingList } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { Trophy, Crown, Users } from "lucide-react";

type Row = {
  rank: number;
  guild_id: string;
  name: string;
  emblem: string;
  total_contribution: number;
  member_count: number;
  reward_pool: number;
  badge: string | null;
};

type MyGuild = { guild_id: string; name: string } | null;

export default function GuildRankingPanel() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [myGuild, setMyGuild] = useState<MyGuild>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const [{ data: ranks }, { data: { user } }] = await Promise.all([
        supabase.rpc("get_guild_rankings"),
        supabase.auth.getUser(),
      ]);
      if (!alive) return;
      if (Array.isArray(ranks)) setRows(ranks as Row[]);
      if (user) {
        const { data: gm } = await supabase
          .from("guild_members")
          .select("guild_id, guilds(name)")
          .eq("user_id", user.id)
          .maybeSingle();
        if (gm?.guild_id) setMyGuild({ guild_id: gm.guild_id, name: (gm as any).guilds?.name ?? "" });
      }
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  const myRow = useMemo(() => rows.find(r => r.guild_id === myGuild?.guild_id) ?? null, [rows, myGuild]);

  if (loading) return <LoadingList rows={6} />;
  if (rows.length === 0) {
    return (
      <EmptyState
        title="아직 정산된 주간 랭킹이 없습니다"
        description="매주 월요일 00:05에 자동 정산됩니다. 길드 활동으로 Crown을 모으세요."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="glass-strong rounded-2xl p-4 neon-border">
        <div className="flex items-center gap-2 mb-2">
          <Trophy className="w-5 h-5 text-sim-gold" />
          <h2 className="font-imperial text-lg tracking-wider text-gradient-imperial">길드 주간 랭킹</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          1~3위: Legendary 배지 + 보상 풀 ↑↑ · 4~10위: TOP 10 보상 · 11~50위: 참여 보상
        </p>
        {myRow && (
          <div className="mt-3 p-2 rounded-lg bg-sim-gold/10 border border-sim-gold/30 text-xs flex items-center gap-2">
            <Crown className="w-3.5 h-3.5 text-sim-gold" />
            <span>내 길드 <span className="font-bold">{myRow.emblem} {myRow.name}</span></span>
            <span className="ml-auto tabular-nums">#{myRow.rank} · {myRow.reward_pool.toLocaleString()}₡ pool</span>
          </div>
        )}
      </div>

      <ul className="space-y-1.5">
        {rows.map(r => {
          const tier =
            r.rank <= 3 ? "from-sim-gold/30 to-sim-gold/5 border-sim-gold/40"
            : r.rank <= 10 ? "from-primary/20 to-transparent border-primary/30"
            : "glass border-border/30";
          return (
            <li
              key={r.guild_id}
              className={`rounded-xl px-3 py-2 flex items-center gap-3 border bg-gradient-to-r ${tier} ${myGuild?.guild_id === r.guild_id ? "ring-1 ring-sim-gold" : ""}`}
            >
              <div className="w-8 text-center font-display font-black tabular-nums">
                {r.rank <= 3 ? ["🥇","🥈","🥉"][r.rank-1] : `#${r.rank}`}
              </div>
              <div className="text-2xl">{r.emblem}</div>
              <div className="flex-1 min-w-0">
                <div className="font-bold truncate text-sm">{r.name}</div>
                <div className="text-[10px] text-muted-foreground flex items-center gap-2">
                  <span className="flex items-center gap-1"><Users className="w-3 h-3" />{r.member_count}명</span>
                  <span className="tabular-nums">{r.total_contribution.toLocaleString()} 기여 Crown</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-display font-bold text-sim-gold tabular-nums">
                  {r.reward_pool.toLocaleString()}₡
                </div>
                {r.badge && <div className="text-[9px] text-muted-foreground uppercase tracking-wider">{r.badge}</div>}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
