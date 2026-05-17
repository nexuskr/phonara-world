import { motion } from "framer-motion";
import { Trophy, Crown } from "lucide-react";
import { useFriendRanking } from "@/hooks/use-friend-ranking";

/**
 * FriendLeaderboard — 추천 그래프 기반 최근 7일 PHON Top N + 본인 하이라이트.
 */
export default function FriendLeaderboard({ limit = 5 }: { limit?: number } = {}) {
  const { rows, loading } = useFriendRanking(limit);

  if (loading) return null;
  if (!rows || rows.length <= 1) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card p-4">
        <header className="flex items-center gap-2 mb-2">
          <span className="w-8 h-8 rounded-lg bg-secondary/15 text-secondary flex items-center justify-center">
            <Trophy className="w-4 h-4" />
          </span>
          <div className="text-sm font-bold text-foreground">친구 순위</div>
        </header>
        <p className="text-xs text-muted-foreground">
          폐하, 아직 함께할 황제가 없습니다. 추천 링크로 동맹을 모으시면 주간 순위 경쟁이 시작됩니다.
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border/60 bg-card p-4 flex flex-col gap-3"
    >
      <header className="flex items-center gap-2">
        <span className="w-8 h-8 rounded-lg bg-secondary/15 text-secondary flex items-center justify-center">
          <Trophy className="w-4 h-4" />
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-foreground">친구 순위 · 최근 7일</div>
          <div className="text-[11px] text-muted-foreground">함께하는 황제들과의 PHON 경쟁</div>
        </div>
      </header>

      <ul className="flex flex-col gap-1.5">
        {rows.map((r) => (
          <li
            key={r.user_id}
            className={`flex items-center gap-3 rounded-xl border px-3 py-2 ${
              r.is_me
                ? "border-primary/40 bg-primary/5"
                : "border-border/40 bg-background/40"
            }`}
          >
            <span className={`w-6 text-center text-[12px] font-black tabular-nums ${r.rnk === 1 ? "text-amber-300" : "text-muted-foreground"}`}>
              {r.rnk === 1 ? <Crown className="w-3.5 h-3.5 inline text-amber-300" /> : r.rnk}
            </span>
            <div className="flex-1 min-w-0">
              <div className={`text-sm truncate ${r.is_me ? "font-black text-primary" : "font-bold text-foreground"}`}>
                {r.nickname}{r.is_me ? " (나)" : ""}
              </div>
            </div>
            <div className={`text-sm font-black tabular-nums ${r.is_me ? "text-primary" : "text-foreground/80"}`}>
              {r.weekly_phon.toLocaleString()}
              <span className="ml-1 text-[10px] text-muted-foreground font-normal">PHON</span>
            </div>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}
