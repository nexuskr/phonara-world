import { useEffect, useRef, useState } from "react";
import { Sparkles, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { subscribeRealtime } from "@/hooks/use-realtime-channel";

type Pool = {
  game_code: string;
  pool_phon: number;
  seed_phon: number;
  last_amount: number | null;
  last_won_at: string | null;
  last_winner_masked: string | null;
};

// Smooth odometer — eases displayed value toward the live target,
// so a sudden +50 PHON contribution counts up over ~1.5s instead of jumping.
function useOdometer(target: number) {
  const [shown, setShown] = useState(target);
  const raf = useRef<number | null>(null);
  useEffect(() => {
    let from = shown;
    const start = performance.now();
    const dur = 1500;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(from + (target - from) * eased);
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current != null) cancelAnimationFrame(raf.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);
  return shown;
}

function fmt(n: number) {
  return Math.round(n).toLocaleString();
}

function timeAgo(iso: string | null): string | null {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "방금";
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

export default function JackpotMeter({ gameCode }: { gameCode: string }) {
  const [pool, setPool] = useState<Pool | null>(null);

  // Initial fetch — public RPC, no auth required.
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await (supabase.rpc as any)("get_jackpot_pools");
      if (!alive) return;
      const row = (data as Pool[] | null)?.find((r) => r.game_code === gameCode);
      if (row) setPool(row);
    })();
    return () => { alive = false; };
  }, [gameCode]);

  // Realtime — every spin (anyone, anywhere) bumps pool_phon, we want to feel it.
  useEffect(() => {
    const off = subscribeRealtime({
      key: `jackpot:${gameCode}`,
      bindings: [{
        event: "UPDATE",
        schema: "public",
        table: "slot_jackpot_pools",
        filter: `game_code=eq.${gameCode}`,
      }],
      onEvent: (payload: any) => {
        const next = payload?.new as Pool | undefined;
        if (next) setPool((p) => (p ? { ...p, ...next } : next));
      },
    });
    return () => off?.();
  }, [gameCode]);

  const animatedPool = useOdometer(pool?.pool_phon ?? 0);
  const ago = timeAgo(pool?.last_won_at ?? null);

  if (!pool) return null;

  return (
    <div className="relative overflow-hidden rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-950/60 via-amber-900/40 to-amber-950/60 p-3 shadow-[inset_0_0_30px_rgba(255,200,80,0.15)]">
      {/* shimmer sweep */}
      <div className="pointer-events-none absolute inset-0 -translate-x-full animate-[shimmer_4s_linear_infinite] bg-gradient-to-r from-transparent via-amber-200/10 to-transparent" />

      <div className="relative flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="w-4 h-4 text-amber-300 shrink-0 animate-pulse" />
          <div className="min-w-0">
            <div className="text-[10px] tracking-[0.3em] text-amber-300/80 font-bold">PROGRESSIVE JACKPOT</div>
            <div className="font-mono font-black text-2xl sm:text-3xl text-amber-200 tabular-nums leading-none drop-shadow-[0_0_12px_rgba(255,200,80,0.5)]">
              {fmt(animatedPool)}
              <span className="text-xs ml-1 text-amber-300/70">PHON</span>
            </div>
          </div>
        </div>
        <div className="text-right text-[10px] text-amber-100/70 shrink-0">
          {pool.last_winner_masked ? (
            <>
              <div className="flex items-center justify-end gap-1">
                <Crown className="w-3 h-3 text-amber-300" />
                <span className="font-bold">{pool.last_winner_masked}</span>
              </div>
              <div className="font-mono">+{fmt(Number(pool.last_amount ?? 0))} · {ago}</div>
            </>
          ) : (
            <div className="opacity-70">아직 당첨자 없음</div>
          )}
        </div>
      </div>
    </div>
  );
}
