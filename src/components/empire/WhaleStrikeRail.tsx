import { useEffect, useMemo, useRef, useState } from "react";
import { Crown, Flame, Zap, ArrowDownToLine } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { trackClick, useTrackView } from "@/lib/telemetry";
import { useVisibleInterval, useDocumentVisible } from "@/lib/util/visible-interval";
import { useInViewport } from "@/hooks/use-in-viewport";

type Strike = {
  kind: "crown" | "baron" | "withdraw";
  created_at: string;
  amount: number;
  label: string;
  nick: string;
};

const fmtKRW = (n: number) =>
  n >= 1_0000_0000 ? `₩${(n / 1_0000_0000).toFixed(2)}억`
  : n >= 1_0000 ? `₩${Math.round(n / 1_0000).toLocaleString("ko-KR")}만`
  : `₩${n.toLocaleString("ko-KR")}`;

const KIND_META: Record<Strike["kind"], { icon: React.ComponentType<{ className?: string }>; tone: string; verb: string }> = {
  crown:    { icon: Crown,           tone: "text-secondary",     verb: "Crown 폭발" },
  baron:    { icon: Flame,           tone: "text-primary",       verb: "Baron 합류" },
  withdraw: { icon: ArrowDownToLine, tone: "text-money-strong",  verb: "출금 완료" },
};

/**
 * Whale Strike 라이브 피드 — 24h 고임팩트 이벤트 마키 + 클릭 시 합류 깔때기 추적.
 */
export function WhaleStrikeRail({ compact = false }: { compact?: boolean } = {}) {
  const [items, setItems] = useState<Strike[]>([]);
  const [loaded, setLoaded] = useState(false);
  const navigate = useNavigate();

  // PR-10: 노출 추적 (마운트 시 1회)
  useTrackView("whale_rail", "rail");

  const aliveRef = useRef(true);
  useEffect(() => () => { aliveRef.current = false; }, []);

  const load = async () => {
    try {
      const { data, error } = await supabase.rpc("get_whale_strikes_24h", { _limit: 24 });
      if (!aliveRef.current) return;
      if (!error && Array.isArray(data)) setItems(data as unknown as Strike[]);
    } catch {
      /* network/realtime unreachable — keep last items */
    }
    if (aliveRef.current) setLoaded(true);
  };

  // Initial fetch (once)
  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);
  // 60s refresh — pauses while tab hidden, catches up on visible.
  useVisibleInterval(() => { void load(); }, 60_000, true, { catchUpOnVisible: true });

  const doubled = useMemo(() => (items.length ? [...items, ...items] : []), [items]);

  // Pause the marquee when tab hidden OR rail is offscreen.
  const railRef = useRef<HTMLDivElement>(null);
  const inView = useInViewport(railRef, { rootMargin: "200px" });
  const tabVisible = useDocumentVisible();
  const animating = inView && tabVisible;

  if (!loaded || items.length === 0) return null;

  function onStrikeClick(s: Strike) {
    void trackClick("whale_rail", s.kind, { amount: s.amount, label: s.label });
    // crown/baron → 패키지 (지금 합류), withdraw → 지갑 (직접 보기)
    navigate(s.kind === "withdraw" ? "/wallet" : "/packages");
  }

  return (
    <div ref={railRef} className={`relative overflow-hidden ${compact ? "rounded-xl border border-primary/20 bg-card/40" : "rounded-2xl border border-secondary/30 bg-gradient-to-r from-secondary/10 via-primary/10 to-accent/10"} backdrop-blur-md`}>
      {!compact && (
        <div className="absolute top-2 left-3 z-10 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] font-imperial text-secondary">
          <Zap className="w-3 h-3 animate-pulse" /> Whale Strikes · 24h
        </div>
      )}
      <div className="absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

      <motion.div
        className={`flex ${compact ? "gap-2 py-2 pl-2" : "gap-3 py-7 pl-3"} will-change-transform`}
        animate={animating ? { x: ["0%", "-50%"] } : false}
        transition={{ duration: Math.max(20, items.length * 4), ease: "linear", repeat: Infinity }}
      >
        {doubled.map((s, i) => {
          const meta = KIND_META[s.kind] ?? KIND_META.crown;
          const Icon = meta.icon;
          return (
            <button
              key={`${s.kind}-${s.created_at}-${i}`}
              type="button"
              onClick={() => onStrikeClick(s)}
              className={`shrink-0 ${compact ? "h-8 px-2.5 rounded-lg flex items-center gap-1.5 text-[11px] bg-background/60 hover:bg-primary/10" : "glass rounded-xl px-3 py-2 flex items-center gap-2 min-w-[200px] hover:scale-[1.03]"} text-left hover:border-primary/50 transition-all border border-transparent cursor-pointer`}
              aria-label={`${s.nick} ${meta.verb} ${s.amount > 0 ? fmtKRW(s.amount) : ""} — 지금 합류`}
            >
              <Icon className={`${compact ? "w-3 h-3" : "w-4 h-4"} ${meta.tone}`} />
              {compact ? (
                <span className="whitespace-nowrap font-bold">
                  <span className="text-foreground/80">{s.nick}</span>
                  <span className="text-muted-foreground"> · </span>
                  <span className={meta.tone}>{meta.verb}</span>
                  {s.amount > 0 && <span className={`ml-1.5 tabular-nums ${meta.tone}`}>{fmtKRW(s.amount)}</span>}
                </span>
              ) : (
                <div className="text-xs">
                  <div className="font-bold tracking-wide">
                    <span className="text-foreground/80">{s.nick}</span>
                    <span className="text-muted-foreground"> · </span>
                    <span className={meta.tone}>{meta.verb}</span>
                  </div>
                  {s.amount > 0 && (
                    <div className={`text-[11px] tabular-nums font-imperial ${meta.tone}`}>
                      {fmtKRW(s.amount)}
                    </div>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </motion.div>
    </div>
  );
}

export default WhaleStrikeRail;
