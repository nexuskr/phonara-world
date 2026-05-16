/**
 * @pkg/live/LiveTicker — v14.0 Sprint 0 하단 실시간 마키.
 *
 * 데이터: 기존 `get_whale_strikes_24h` 공개 RPC 만 사용 (신규 RPC 0).
 * 60s 자동 갱신. framer-motion 무한 마키.
 * 신규 가입 카운트는 Sprint 1 이후 공개 RPC 신설 시 추가.
 */
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Flame, ArrowUpRight } from "lucide-react";

type Strike = {
  kind: string;
  nick: string | null;
  amount_phon: number | null;
  happened_at: string;
};

function fmt(n: number | null): string {
  if (!n) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function labelFor(kind: string): string {
  switch (kind) {
    case "withdrawal": return "💸 출금";
    case "baron_promo": return "👑 VIP 승급";
    case "crown_boom":  return "✨ 보너스 폭발";
    case "founding_seat": return "🏛️ 시즌 좌석";
    default: return "🔥 빅윈";
  }
}

export default function LiveTicker() {
  const [rows, setRows] = useState<Strike[]>([]);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const { data } = await (supabase.rpc as any)("get_whale_strikes_24h", { _limit: 24 });
        if (!alive || !Array.isArray(data)) return;
        setRows(data as Strike[]);
      } catch { /* silent — public RPC */ }
    };
    load();
    const t = setInterval(load, 60_000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  if (rows.length === 0) return null;

  // 무한 마키 — 두 번 렌더하여 끊김 없이 좌측 이동
  const items = [...rows, ...rows];

  return (
    <div
      className="relative overflow-hidden border-t border-[hsl(var(--gold)/.25)] bg-gradient-to-r from-[hsl(var(--bg))] via-card/40 to-[hsl(var(--bg))]"
      role="marquee"
      aria-label="실시간 빅윈 티커"
    >
      <div className="absolute inset-y-0 left-0 w-8 z-10 bg-gradient-to-r from-[hsl(var(--bg))] to-transparent pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-8 z-10 bg-gradient-to-l from-[hsl(var(--bg))] to-transparent pointer-events-none" />

      <motion.div
        className="flex gap-6 py-2.5 whitespace-nowrap will-change-transform"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 48, repeat: Infinity, ease: "linear" }}
      >
        {items.map((r, i) => (
          <span
            key={`${r.happened_at}-${i}`}
            className="inline-flex items-center gap-2 text-[12px] md:text-[13px] tabular-nums"
          >
            <Flame className="w-3.5 h-3.5 text-[hsl(var(--pink))]" strokeWidth={1.8} />
            <span className="text-muted-foreground">{labelFor(r.kind)}</span>
            <span className="text-foreground/90 font-semibold">{r.nick ?? "익명"}</span>
            <span className="text-[hsl(var(--gold))] font-black">
              {fmt(r.amount_phon)} PHON
            </span>
            <ArrowUpRight className="w-3 h-3 text-[hsl(var(--gold))]" strokeWidth={1.8} />
          </span>
        ))}
      </motion.div>
    </div>
  );
}
