/**
 * Today's Crown Moments — 최근 Crown Explosion 3건.
 * crown_events 테이블에서 amount/level 기준 상위 3건만 가져와서
 * 가벼운 카드로 표시. (실제 GIF는 IntersectionObserver 진입 시 lazy 로드.)
 */
import { useEffect, useRef, useState } from "react";
import { Crown, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { EmptyState } from "@/components/ui/empty-state";

type Moment = {
  id: string;
  user_id: string;
  amount: number;
  multiplier: number | null;
  created_at: string;
};

const fmt = (n: number) => new Intl.NumberFormat("ko-KR").format(Math.round(n));

export function CrownMomentsCard() {
  const [rows, setRows] = useState<Moment[] | null>(null);

  useEffect(() => {
    let on = true;
    const load = async () => {
      const { data } = await supabase
        .from("crown_events" as any)
        .select("id,user_id,amount,multiplier,created_at")
        .order("amount", { ascending: false })
        .gte("created_at", new Date(Date.now() - 24 * 3600_000).toISOString())
        .limit(3);
      if (on) setRows((data as any) ?? []);
    };
    load();
    const id = setInterval(load, 60_000);
    return () => { on = false; clearInterval(id); };
  }, []);

  return (
    <div className="glass-strong rounded-2xl p-4 border border-yellow-500/20 h-full">
      <div className="text-[11px] uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
        <Crown className="h-3.5 w-3.5 text-yellow-400" /> Today's Crown Moments
      </div>
      <div className="mt-2">
        {rows === null ? (
          <div className="text-xs text-muted-foreground">불러오는 중…</div>
        ) : rows.length === 0 ? (
          <EmptyState title="오늘 Crown 없음" />
        ) : (
          <ul className="space-y-2">
            {rows.map((m) => <MomentRow key={m.id} m={m} />)}
          </ul>
        )}
      </div>
    </div>
  );
}

function MomentRow({ m }: { m: Moment }) {
  const ref = useRef<HTMLLIElement>(null);
  const [show, setShow] = useState(false);

  // IntersectionObserver — 뷰포트 진입 시에만 글로우/펄스 ON
  useEffect(() => {
    if (!ref.current || typeof IntersectionObserver === "undefined") {
      setShow(true);
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setShow(true); io.disconnect(); } },
      { rootMargin: "100px" }
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, []);

  return (
    <li
      ref={ref}
      className="relative rounded-xl border border-yellow-500/20 bg-gradient-to-r from-yellow-500/5 to-transparent
                 p-2.5 flex items-center gap-2 overflow-hidden"
    >
      {show && (
        <div className="absolute -top-4 -right-4 h-16 w-16 rounded-full bg-yellow-400/15 blur-2xl" aria-hidden />
      )}
      <Sparkles className="h-4 w-4 text-yellow-400 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-mono truncate text-muted-foreground">
          {m.user_id.slice(0, 8)}…
        </div>
        <div className="text-xs">
          <span className="font-display font-black bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
            {fmt(m.amount)} ₡
          </span>
          {m.multiplier ? (
            <span className="ml-1 text-[10px] text-muted-foreground">×{m.multiplier.toFixed(2)}</span>
          ) : null}
        </div>
      </div>
      <time className="text-[10px] text-muted-foreground tabular-nums">
        {new Date(m.created_at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
      </time>
    </li>
  );
}
