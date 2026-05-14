import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Crown, Flame, ArrowDownToLine, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SimChip } from "@/components/sim/SimChip";
import { setVisibleInterval } from "@/lib/util/visible-interval";

type Strike = {
  kind: "crown" | "baron" | "withdraw";
  created_at: string;
  amount: number;
  label: string;
  nick: string;
  region?: string | null;
  is_simulated?: boolean;
};

const fmtKRW = (n: number) =>
  n >= 1_0000_0000
    ? `₩${(n / 1_0000_0000).toFixed(2)}억`
    : n >= 1_0000
    ? `₩${Math.round(n / 1_0000).toLocaleString("ko-KR")}만`
    : `₩${n.toLocaleString("ko-KR")}`;

const KIND_META = {
  crown: { icon: Crown, tone: "text-amber-300", glow: "shadow-[0_0_24px_-4px_rgba(245,158,11,0.6)]", verb: "Crown 폭발", speed: 22 },
  baron: { icon: Flame, tone: "text-fuchsia-300", glow: "shadow-[0_0_24px_-4px_rgba(217,70,239,0.55)]", verb: "Baron 합류", speed: 36 },
  withdraw: { icon: ArrowDownToLine, tone: "text-emerald-300", glow: "shadow-[0_0_24px_-4px_rgba(52,211,153,0.55)]", verb: "출금 완료", speed: 50 },
} as const;

function MarqueeRow({ items, kind }: { items: Strike[]; kind: keyof typeof KIND_META }) {
  const meta = KIND_META[kind];
  const Icon = meta.icon;
  const navigate = useNavigate();
  const doubled = useMemo(() => (items.length ? [...items, ...items] : []), [items]);
  if (items.length === 0) return null;
  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
      <motion.div
        className="flex gap-2 py-1.5 will-change-transform"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: meta.speed, ease: "linear", repeat: Infinity }}
      >
        {doubled.map((s, i) => (
          <button
            key={`${kind}-${s.created_at}-${i}`}
            type="button"
            onClick={() => navigate(kind === "withdraw" ? "/wallet" : "/packages")}
            className={`shrink-0 glass rounded-lg px-2.5 py-1.5 flex items-center gap-2 min-w-[180px] text-left border border-transparent hover:border-current/40 hover:scale-[1.03] transition-all ${meta.glow}`}
            aria-label={`${s.nick} ${meta.verb} ${s.amount > 0 ? fmtKRW(s.amount) : ""}`}
          >
            <Icon className={`w-3.5 h-3.5 ${meta.tone}`} />
            <div className="text-[11px] leading-tight">
              <div className="font-bold">
                <span className="text-foreground/85">{s.nick}</span>
                <span className="text-muted-foreground"> · </span>
                <span className={meta.tone}>{meta.verb}</span>
              </div>
              {s.amount > 0 && (
                <div className={`text-[10px] tabular-nums font-imperial ${meta.tone}`}>
                  {fmtKRW(s.amount)}
                </div>
              )}
            </div>
          </button>
        ))}
      </motion.div>
    </div>
  );
}

export default function WhaleStrikeRailV3() {
  const [items, setItems] = useState<Strike[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        // Pull both real (existing) and ghost in parallel.
        const [r1, r2] = await Promise.all([
          supabase.rpc("get_whale_strikes_24h", { _limit: 30 }),
          supabase.rpc("get_ghost_strikes", { _limit: 60 }),
        ]);
        if (!alive) return;
        const real = (r1.data as unknown as Strike[]) ?? [];
        const ghost = (r2.data as unknown as Strike[]) ?? [];
        // ghost-first ordering by created_at desc
        const merged = [...real, ...ghost]
          .filter((s) => s && s.kind)
          .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
          .slice(0, 90);
        setItems(merged);
      } catch {
        /* keep last */
      }
      if (alive) setLoaded(true);
    }
    void load();
    const stop = setVisibleInterval(load, 8000);
    return () => {
      alive = false;
      stop();
    };
  }, []);

  const crowns = useMemo(() => items.filter((s) => s.kind === "crown").slice(0, 24), [items]);
  const barons = useMemo(() => items.filter((s) => s.kind === "baron").slice(0, 16), [items]);
  const withdraws = useMemo(() => items.filter((s) => s.kind === "withdraw").slice(0, 24), [items]);

  if (!loaded || items.length === 0) return null;

  return (
    <div className="relative rounded-2xl border border-sim-gold/30 bg-gradient-to-r from-amber-950/30 via-background/40 to-amber-950/30 backdrop-blur-md p-2">
      <div className="flex items-center gap-2 px-2 pb-1">
        <SimChip />
        <Zap className="w-3 h-3 text-sim-gold animate-pulse" />
        <span className="text-[10px] uppercase tracking-[0.2em] font-imperial text-sim-gold">
          Whale Strikes · Live · 24h
        </span>
      </div>
      <MarqueeRow items={crowns} kind="crown" />
      <MarqueeRow items={withdraws} kind="withdraw" />
      <MarqueeRow items={barons} kind="baron" />
    </div>
  );
}
