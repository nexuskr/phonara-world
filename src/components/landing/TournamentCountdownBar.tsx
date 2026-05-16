// Week 3 Viral — Live tournament countdown bar (mounted on Landing + Dashboard)
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Radio } from "lucide-react";
import { Link } from "react-router-dom";
import { setVisibleInterval } from "@/lib/util/visible-interval";

type Tournament = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  starts_at: string;
  ends_at: string;
  prize_phon: number;
  prize_crown: number;
  status: string;
  overlay_token: string;
  seconds_until_start: number;
  seconds_until_end: number;
};

function fmt(sec: number): string {
  if (sec <= 0) return "00:00:00";
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (d > 0) return `D-${d} ${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function TournamentCountdownBar() {
  const [t, setT] = useState<Tournament | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data } = await supabase.rpc("get_next_tournament");
      if (mounted) setT((data?.[0] as Tournament) ?? null);
    };
    load();
    const id = setVisibleInterval(load, 30_000 , { meta: { owner: "TournamentCountdownBar", category: "cosmetic" } });
    const stop2 = setVisibleInterval(() => setTick((x) => x + 1), 1000, { meta: { owner: "TournamentCountdownBar:tick", category: "cosmetic" } });
    return () => { mounted = false; id(); stop2(); };
  }, []);

  if (!t) return null;
  const isLive = t.status === "live";
  const remaining = isLive ? t.seconds_until_end - tick : t.seconds_until_start - tick;
  if (remaining <= 0 && !isLive) return null;

  return (
    <AnimatePresence>
      <motion.div
        key={t.id}
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -20, opacity: 0 }}
        className="w-full bg-gradient-to-r from-primary/15 via-accent/10 to-primary/15 border-b border-border/40"
      >
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-3 min-w-0">
            {isLive ? (
              <span className="inline-flex items-center gap-1.5 text-destructive font-semibold animate-pulse">
                <Radio className="h-3.5 w-3.5" /> LIVE
              </span>
            ) : (
              <Trophy className="h-4 w-4 text-primary shrink-0" />
            )}
            <span className="font-semibold truncate">{t.title}</span>
            {t.subtitle && <span className="hidden sm:inline text-muted-foreground truncate">· {t.subtitle}</span>}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {t.prize_phon > 0 && (
              <span className="hidden md:inline text-primary font-semibold">
                {t.prize_phon.toLocaleString()} PHON
              </span>
            )}
            <span className="font-mono font-bold tabular-nums text-foreground">
              {isLive ? "ENDS " : "STARTS "}{fmt(remaining)}
            </span>
            {isLive && (
              <Link
                to={`/live/${t.overlay_token}`}
                className="px-2.5 py-1 rounded-md bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition"
              >
                WATCH
              </Link>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
