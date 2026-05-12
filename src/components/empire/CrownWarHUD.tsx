// PR-C: Crown Wars HUD — compact live leaderboard rail (Dashboard top).
import { motion } from "framer-motion";
import { Crown, Swords, Users, Timer } from "lucide-react";
import { useCrownWar, formatMSS } from "@/hooks/use-crown-war";
import { Link } from "react-router-dom";

export default function CrownWarHUD() {
  const { snap, loading, remainingMs, isFinaleWindow } = useCrownWar(12000);
  if (loading || !snap?.war) return null;
  if (snap.war.status !== "active") return null;

  const top3 = snap.leaderboard.slice(0, 3);
  const me = snap.me;
  const finale = isFinaleWindow;

  return (
    <Link
      to="/empire-arena"
      className={`block relative overflow-hidden rounded-2xl border ${
        finale ? "border-rose-400/60" : "border-amber-400/40"
      } bg-gradient-to-r from-card/95 via-card/90 to-card/95 backdrop-blur-xl px-4 py-3`}
    >
      {/* Animated bg sweep */}
      <motion.div
        className="absolute inset-0 -z-0 bg-gradient-to-r from-transparent via-amber-400/10 to-transparent"
        animate={{ x: ["-100%", "100%"] }}
        transition={{ duration: 3.6, repeat: Infinity, ease: "linear" }}
      />

      <div className="relative flex items-center gap-3 flex-wrap">
        {/* Title */}
        <div className="flex items-center gap-2">
          <motion.div
            animate={finale ? { scale: [1, 1.18, 1] } : { rotate: [0, -6, 6, 0] }}
            transition={{ duration: finale ? 0.8 : 4, repeat: Infinity }}
            className={`h-9 w-9 rounded-xl flex items-center justify-center ${
              finale ? "bg-rose-500 text-white shadow-[0_0_24px_hsl(350_90%_60%/0.6)]" : "bg-amber-500 text-black shadow-[0_0_22px_hsl(45_100%_55%/0.5)]"
            }`}
          >
            <Swords className="h-4 w-4" />
          </motion.div>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground leading-none">
              Crown Wars · LIVE
            </div>
            <div className={`text-sm font-bold leading-tight ${finale ? "text-rose-300" : "text-amber-300"}`}>
              {finale ? "🔥 Finale" : "제국 전쟁 진행중"}
            </div>
          </div>
        </div>

        {/* Countdown */}
        <div className={`flex items-center gap-1 ml-auto px-2.5 py-1 rounded-lg ${
          finale ? "bg-rose-500/15 text-rose-200" : "bg-amber-500/10 text-amber-200"
        }`}>
          <Timer className="h-3.5 w-3.5" />
          <span className="font-mono text-sm tabular-nums">{formatMSS(remainingMs)}</span>
        </div>

        {/* Participants */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          {snap.war.total_participants}
        </div>

        {/* My rank */}
        <div className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-primary/10 text-primary">
          <Crown className="h-3.5 w-3.5" />
          {me.rank ? `${me.rank}위 · ${me.score}` : "미참여"}
        </div>
      </div>

      {/* Top 3 marquee */}
      {top3.length > 0 && (
        <div className="relative mt-2 flex items-center gap-3 overflow-hidden">
          {top3.map((p) => (
            <div
              key={p.rnk}
              className={`flex items-center gap-1.5 text-[12px] px-2 py-0.5 rounded-md ${
                p.is_me ? "bg-amber-400/25 text-amber-100 ring-1 ring-amber-400/60" : "bg-muted/40 text-muted-foreground"
              }`}
            >
              <span className="font-bold">
                {p.rnk === 1 ? "👑" : p.rnk === 2 ? "🥈" : "🥉"}
              </span>
              <span className="truncate max-w-[7rem]">{p.nick}</span>
              <span className="font-mono text-amber-300/90">{p.score}</span>
            </div>
          ))}
        </div>
      )}
    </Link>
  );
}
