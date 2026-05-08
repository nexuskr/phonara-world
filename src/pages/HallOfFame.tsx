import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import HubTabs from "@/components/HubTabs";
import { Trophy, Crown, Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatKRW } from "@/lib/store";
import TierBadge from "@/components/status/TierBadge";
import { toast } from "@/hooks/use-toast";

type Row = {
  user_id: string;
  nickname: string;
  tier: string | null;
  earned: number;
  rank: number;
};

const FALLBACK: Row[] = [
  { user_id: "f1", nickname: "Cyber***K", tier: "EMPIRE", earned: 9_240_000, rank: 1 },
  { user_id: "f2", nickname: "Phantom***", tier: "EMPIRE", earned: 7_180_400, rank: 2 },
  { user_id: "f3", nickname: "Aurora***", tier: "GOD", earned: 4_320_000, rank: 3 },
  { user_id: "f4", nickname: "Nova***L", tier: "GOD", earned: 3_120_000, rank: 4 },
  { user_id: "f5", nickname: "Quantum***", tier: "GOD", earned: 2_840_000, rank: 5 },
  { user_id: "f6", nickname: "Neon***J", tier: "VIP", earned: 1_240_000, rank: 6 },
  { user_id: "f7", nickname: "Pulse***M", tier: "VIP", earned: 980_000, rank: 7 },
  { user_id: "f8", nickname: "Echo***", tier: "VIP", earned: 720_000, rank: 8 },
  { user_id: "f9", nickname: "Helix***", tier: "VIP", earned: 510_400, rank: 9 },
  { user_id: "f10", nickname: "Orbit***Q", tier: "NORMAL", earned: 320_000, rank: 10 },
];

export default function HallOfFame() {
  const [list, setList] = useState<Row[]>(FALLBACK);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const { data } = await supabase
          .from("leaderboard_today")
          .select("user_id, nickname, tier, earned, rank")
          .limit(10);
        if (!mounted) return;
        if (data && data.length > 0) setList(data as Row[]);
      } catch { /* fallback */ }
    }
    void load();
    return () => { mounted = false; };
  }, []);

  function share(row: Row) {
    const text = `🏆 명예의 전당 #${row.rank} ${row.nickname} - ${formatKRW(row.earned)} | Phonara`;
    const url = typeof window !== "undefined" ? window.location.origin : "";
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({ title: "Phonara 명예의 전당", text, url }).catch(() => {});
      return;
    }
    try {
      navigator.clipboard.writeText(`${text} ${url}`);
      toast({ title: "📋 공유 링크 복사됨", description: "X·카카오톡에 붙여넣기" });
    } catch { /* noop */ }
  }

  return (
    <Layout>
      <HubTabs hub="legacy" />
      <div className="container pt-6 pb-10 animate-liquid-in">
        <div className="flex items-center gap-2 mb-1">
          <Trophy className="w-6 h-6 text-gold" />
          <h1 className="font-imperial text-2xl text-gradient-gold tracking-[0.18em]">
            HALL OF FAME
          </h1>
        </div>
        <p className="text-xs text-muted-foreground mb-5">
          오늘의 황제 · 월간 TOP 10 · 영구 등재
        </p>

        <div className="space-y-2">
          {list.map((r, i) => {
            const isTop = i < 3;
            const tier = (r.tier ?? "NORMAL").toUpperCase() as "NORMAL" | "VIP" | "GOD" | "EMPIRE";
            return (
              <div
                key={r.user_id}
                className={`relative glass-strong rounded-2xl p-4 flex items-center gap-3 ${
                  isTop ? "neon-border" : ""
                }`}
              >
                {isTop && (
                  <div className="absolute -top-2 -right-2 text-2xl animate-crown">
                    {i === 0 ? "👑" : i === 1 ? "🥈" : "🥉"}
                  </div>
                )}
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center font-display font-black text-lg shrink-0 ${
                    i === 0
                      ? "bg-gradient-gold text-gold-foreground glow-imperial"
                      : i === 1
                      ? "bg-secondary/30 text-secondary"
                      : i === 2
                      ? "bg-accent/30 text-accent"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  #{r.rank}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-display font-bold text-sm truncate">
                      {r.nickname}
                    </span>
                    <TierBadge tier={tier} size="xs" />
                  </div>
                  <div className="font-display font-black text-base text-gradient-gold tabular-nums mt-0.5">
                    {formatKRW(r.earned)}
                  </div>
                </div>
                <button
                  onClick={() => share(r)}
                  className="press shrink-0 w-9 h-9 rounded-xl glass flex items-center justify-center"
                  aria-label="공유"
                >
                  <Share2 className="w-4 h-4 text-primary" />
                </button>
              </div>
            );
          })}
        </div>

        <div className="mt-6 glass rounded-2xl p-4 text-center">
          <Crown className="w-6 h-6 text-gold mx-auto" />
          <div className="font-imperial text-sm text-gradient-gold mt-2">
            오늘의 황제는 24시간 동안 EMPIRE 배지를 획득합니다
          </div>
        </div>
      </div>
    </Layout>
  );
}
