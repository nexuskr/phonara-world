import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, Flame, Zap, Crown } from "lucide-react";

type Row = {
  amount: number;
  created_at: string;
  flag: string;
  kind: string;
  title: string;
  user_mask: string;
};

function iconFor(kind: string) {
  if (kind?.includes("crown")) return <Crown className="w-3.5 h-3.5 text-amber-300" />;
  if (kind?.includes("baron") || kind?.includes("vip")) return <Flame className="w-3.5 h-3.5 text-pink-400" />;
  if (kind?.includes("withdraw")) return <Zap className="w-3.5 h-3.5 text-emerald-300" />;
  return <TrendingUp className="w-3.5 h-3.5 text-amber-300" />;
}

function fmt(n: number) {
  if (!n) return "0";
  if (n >= 1e8) return `${(n / 1e8).toFixed(1)}억`;
  if (n >= 1e4) return `${(n / 1e4).toFixed(1)}만`;
  return n.toLocaleString();
}

export default function LiveBetFeed() {
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const { data } = await supabase.rpc("get_live_activity_60s", { _limit: 20 });
      if (alive && data) setRows(data as Row[]);
    };
    load();
    const t = window.setInterval(load, 1800);
    return () => { alive = false; window.clearInterval(t); };
  }, []);

  if (!rows.length) return null;

  return (
    <section className="w-full max-w-5xl mx-auto px-4 my-6">
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75 animate-ping" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
          </span>
          <h2 className="text-sm font-black tracking-[0.18em] text-foreground/90">
            LIVE 베팅 피드
          </h2>
        </div>
        <span className="text-[10px] text-muted-foreground tracking-widest">1.8s 갱신</span>
      </div>
      <div className="relative rounded-2xl border border-amber-300/20 bg-gradient-to-br from-background/80 to-card/40 backdrop-blur p-2 max-h-[280px] overflow-y-auto no-scrollbar">
        <ul className="space-y-1">
          {rows.map((r, i) => (
            <li
              key={`${r.created_at}-${i}`}
              className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl bg-card/40 border border-border/30 hover:border-amber-300/40 transition"
            >
              <div className="flex items-center gap-2 min-w-0">
                {iconFor(r.kind)}
                <span className="text-xs font-bold text-foreground/90 truncate">{r.user_mask}</span>
                <span className="text-[11px] text-muted-foreground truncate">{r.title}</span>
              </div>
              <span className="text-xs font-black tabular-nums text-amber-300 shrink-0">
                {fmt(Number(r.amount) || 0)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
