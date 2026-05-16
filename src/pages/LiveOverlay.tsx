// Week 3 Viral — OBS Live Overlay (1080p) for Crown War tournaments
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Crown, Radio, Trophy } from "lucide-react";
import { setVisibleInterval } from "@/lib/util/visible-interval";

type Row = { rank: number; masked_name: string; score: number; crown_count: number };
type T = {
  id: string; title: string; subtitle: string | null;
  prize_phon: number; prize_crown: number; status: string;
  starts_at: string; ends_at: string;
  seconds_until_end: number; overlay_token: string;
};

export default function LiveOverlay() {
  const { token = "" } = useParams();
  const [rows, setRows] = useState<Row[]>([]);
  const [t, setT] = useState<T | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const [{ data: lb }, { data: cur }] = await Promise.all([
        supabase.rpc("get_tournament_leaderboard", { _overlay_token: token, _limit: 10 }),
        supabase.rpc("get_next_tournament"),
      ]);
      if (!mounted) return;
      setRows((lb as Row[]) ?? []);
      const found = (cur as T[])?.find((x) => x.overlay_token === token) ?? null;
      setT(found);
    };
    load();
    const stop1 = setVisibleInterval(load, 5_000, { meta: { owner: "LiveOverlay:35", category: "cosmetic" } });
    const stop2 = setVisibleInterval(() => setTick((x) => x + 1), 1000, { meta: { owner: "LiveOverlay:36", category: "cosmetic" } });
    return () => { mounted = false; stop1(); stop2(); };
  }, [token]);

  const remaining = t ? Math.max(0, t.seconds_until_end - tick) : 0;
  const h = Math.floor(remaining / 3600);
  const m = Math.floor((remaining % 3600) / 60);
  const s = remaining % 60;

  return (
    <div className="w-screen h-screen bg-transparent text-white font-sans p-8 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between bg-black/60 backdrop-blur-md rounded-2xl px-6 py-4 border border-primary/40">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-2 text-red-500 font-bold text-lg">
            <Radio className="h-5 w-5 animate-pulse" /> LIVE
          </span>
          <h1 className="text-3xl font-extrabold">{t?.title ?? "Crown War"}</h1>
          {t?.subtitle && <span className="text-white/60 text-lg">· {t.subtitle}</span>}
        </div>
        <div className="text-right">
          <div className="text-xs uppercase text-white/50">Prize Pool</div>
          <div className="text-2xl font-extrabold text-primary">
            {(t?.prize_phon ?? 0).toLocaleString()} PHON
          </div>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="flex-1 bg-black/60 backdrop-blur-md rounded-2xl p-6 border border-primary/30 overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-400" /> Top 10 Emperors
          </h2>
          <div className="font-mono text-2xl font-bold tabular-nums">
            {String(h).padStart(2, "0")}:{String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
          </div>
        </div>
        <div className="space-y-2">
          <AnimatePresence>
            {rows.map((r) => (
              <motion.div
                key={r.masked_name}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className={`flex items-center justify-between px-4 py-3 rounded-lg ${
                  r.rank === 1 ? "bg-gradient-to-r from-yellow-500/30 to-yellow-500/5 border border-yellow-500/50" :
                  r.rank === 2 ? "bg-gradient-to-r from-gray-400/20 to-transparent border border-gray-400/30" :
                  r.rank === 3 ? "bg-gradient-to-r from-orange-500/20 to-transparent border border-orange-500/30" :
                  "bg-white/5"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 text-center text-2xl font-extrabold ${
                    r.rank === 1 ? "text-yellow-400" : r.rank <= 3 ? "text-white" : "text-white/60"
                  }`}>#{r.rank}</div>
                  <div className="font-semibold text-lg">{r.masked_name}</div>
                </div>
                <div className="flex items-center gap-2 text-yellow-400 font-bold text-lg">
                  <Crown className="h-5 w-5" /> {Math.round(r.score).toLocaleString()}
                </div>
              </motion.div>
            ))}
            {rows.length === 0 && (
              <div className="text-center text-white/40 py-12">참가자 대기 중...</div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="text-center text-white/40 text-sm">phonara.world · Empire War of the Week</div>
    </div>
  );
}
