// P1-6 — Live ranking marquee. 결정론적 봇 100건을 시간당 회전.
// `get_bot_live_ranking` RPC가 실패/비어있으면 컴포넌트는 조용히 사라짐.
import { useEffect, useRef, useState } from "react";
import { Trophy } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useVisibleInterval, useDocumentVisible } from "@/lib/util/visible-interval";
import { useInViewport } from "@/hooks/use-in-viewport";

type Row = { rank: number; nickname: string; amount: number; tier: string };

function fmt(n: number) {
  if (n >= 100_000_000) return `₩${(n / 100_000_000).toFixed(1)}억`;
  if (n >= 10_000_000) return `₩${(n / 10_000_000).toFixed(1)}천만`;
  if (n >= 10_000) return `₩${Math.round(n / 10_000)}만`;
  return `₩${n.toLocaleString()}`;
}

const TIER_COLOR: Record<string, string> = {
  EMPIRE: "text-gold",
  GOD: "text-accent",
  VIP: "text-primary",
  NORMAL: "text-muted-foreground",
};

export default function LiveRankingMarquee({ limit = 100 }: { limit?: number }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const cancelledRef = useRef(false);
  useEffect(() => () => { cancelledRef.current = true; }, []);

  const load = async () => {
    try {
      const { data, error } = await supabase.rpc("get_bot_live_ranking" as any, { _limit: limit });
      if (error) throw error;
      if (!cancelledRef.current) setRows(((data as any[]) ?? []) as Row[]);
    } catch {
      if (!cancelledRef.current) setRows([]);
    }
  };

  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [limit]);
  // 60s refresh — pauses while tab hidden, catches up on visible.
  useVisibleInterval(() => { void load(); }, 60_000, true, { catchUpOnVisible: true });

  // Pause marquee when offscreen or tab hidden.
  const sectionRef = useRef<HTMLElement>(null);
  const inView = useInViewport(sectionRef, { rootMargin: "200px" });
  const tabVisible = useDocumentVisible();
  const animating = inView && tabVisible;

  if (!rows || rows.length === 0) return null;

  // 마키 — 두 번 반복해 무한 스크롤
  const reel = [...rows, ...rows];

  return (
    <section
      ref={sectionRef}
      aria-label="실시간 랭킹"
      className="glass rounded-2xl border border-primary/15 overflow-hidden"
    >
      <div className="px-3 py-2 flex items-center gap-2 border-b border-border/40">
        <Trophy className="w-3.5 h-3.5 text-gold" aria-hidden />
        <span className="text-[11px] tracking-widest font-black text-gold">실시간 랭킹</span>
        <span className="text-[10px] text-muted-foreground ml-auto">상위 {rows.length}위</span>
      </div>
      <div className="relative overflow-hidden py-2">
        <motion.div
          className="flex gap-3 whitespace-nowrap"
          animate={animating ? { x: ["0%", "-50%"] } : false}
          transition={{ duration: 80, ease: "linear", repeat: Infinity }}
        >
          {reel.map((r, i) => (
            <div
              key={`${r.rank}-${i}`}
              className="shrink-0 inline-flex items-center gap-2 px-3 py-1 rounded-full glass-strong text-[11px]"
            >
              <span className={`font-black tabular-nums ${TIER_COLOR[r.tier] ?? ""}`}>#{r.rank}</span>
              <span className="font-bold">{r.nickname}</span>
              <span className="font-display font-black tabular-nums text-money-strong">{fmt(r.amount)}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
