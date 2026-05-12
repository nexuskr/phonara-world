import { useEffect, useRef, useState } from "react";
import { Trophy, ArrowUp, ArrowDown, Minus, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion } from "framer-motion";
import { formatKRW } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notify";

type Row = {
  user_id: string;
  nickname: string;
  tier: string | null;
  earned: number;
  rank: number;
};

const TIER_EMOJI: Record<string, string> = {
  empire: "👑",
  god: "💎",
  vip: "⚡",
  normal: "🚀",
};

export default function LiveRanking() {
  const { t } = useTranslation("live");
  const [list, setList] = useState<Row[]>([]);
  const [deltas, setDeltas] = useState<Map<string, "up" | "down" | "same" | "new">>(new Map());
  const [celebrate, setCelebrate] = useState(false);
  const prevRanksRef = useRef<Map<string, number>>(new Map());
  const myIdRef = useRef<string | null>(null);

  async function load() {
    const { data } = await supabase
      .from("leaderboard_today")
      .select("user_id, nickname, tier, earned, rank")
      .limit(8);
    if (!data) return;
    const next = data as Row[];
    const prev = prevRanksRef.current;

    // Compute deltas vs previous snapshot
    const d = new Map<string, "up" | "down" | "same" | "new">();
    for (const r of next) {
      const before = prev.get(r.user_id);
      if (before === undefined) d.set(r.user_id, "new");
      else if (r.rank < before) d.set(r.user_id, "up");
      else if (r.rank > before) d.set(r.user_id, "down");
      else d.set(r.user_id, "same");
    }

    // Self celebration
    const myId = myIdRef.current;
    if (myId) {
      const before = prev.get(myId);
      const after = next.find((r) => r.user_id === myId)?.rank;
      if (before && after && after < before) {
        setCelebrate(true);
        notify.success(`🎉 랭킹 상승! ${before}위 → ${after}위`);
        setTimeout(() => setCelebrate(false), 2200);
      }
    }

    prevRanksRef.current = new Map(next.map((r) => [r.user_id, r.rank]));
    setDeltas(d);
    setList(next);
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      myIdRef.current = data.user?.id ?? null;
    });
    void load();
    // Realtime-only refresh (polling removed for perf). Fallback: 60s safety net.
    const safety = setInterval(load, 60000);
    const ch = supabase
      .channel("leaderboard")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "daily_stats" },
        () => void load(),
      )
      .subscribe();
    return () => {
      clearInterval(safety);
      supabase.removeChannel(ch);
    };
  }, []);

  const rankDelta = (r: Row) => deltas.get(r.user_id) ?? "new";

  return (
    <div className="glass-strong rounded-2xl p-4 neon-border relative overflow-hidden">
      <AnimatePresence>
        {celebrate && (
          <motion.div
            className="pointer-events-none absolute inset-0 flex items-center justify-center z-10"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.4 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-gold text-gold-foreground font-display font-black text-sm shadow-2xl">
              <Sparkles className="w-4 h-4" /> RANK UP!
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-gold" />
          <span className="font-display font-bold text-sm break-keep">
            {t("ranking")}
          </span>
        </div>
        <span className="text-[10px] text-secondary flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />{" "}
          LIVE
          <span className="ml-1 text-[9px] tracking-widest font-black border border-border/60 text-muted-foreground px-1 py-0.5 rounded">SIM</span>
        </span>
      </div>

      {list.length === 0 ? (
        <div className="text-center text-xs text-muted-foreground py-8 break-keep">
          {t("empty")}
        </div>
      ) : (
        <motion.ul layout className="space-y-2">
          <AnimatePresence initial={false}>
            {list.map((r, i) => {
              const delta = rankDelta(r);
              return (
                <motion.li
                  key={r.user_id}
                  layout
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ type: "spring", stiffness: 320, damping: 28 }}
                  className="flex items-center justify-between py-1"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center font-display font-black text-xs shrink-0
                      ${
                        i === 0
                          ? "bg-gradient-gold text-gold-foreground glow-gold scale-110"
                          : i === 1
                          ? "bg-secondary/30 text-secondary"
                          : i === 2
                          ? "bg-accent/30 text-accent"
                          : "bg-muted"
                      }`}
                    >
                      {i + 1}
                    </div>
                    <span className="text-xl">
                      {TIER_EMOJI[(r.tier ?? "normal").toLowerCase()] ?? "🚀"}
                    </span>
                    <span className="text-sm font-bold truncate">
                      {r.nickname}
                    </span>
                    {delta === "up" && (
                      <ArrowUp className="w-3 h-3 text-secondary shrink-0" />
                    )}
                    {delta === "down" && (
                      <ArrowDown className="w-3 h-3 text-destructive shrink-0" />
                    )}
                    {delta === "same" && (
                      <Minus className="w-3 h-3 text-muted-foreground shrink-0" />
                    )}
                  </div>
                  <div className="text-sm font-display font-bold text-money-strong tabular-nums shrink-0">
                    {formatKRW(r.earned)}
                  </div>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </motion.ul>
      )}
    </div>
  );
}
