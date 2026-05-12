import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp } from "lucide-react";

/** Compact 24h revenue widget — shows total + per-source breakdown. Self-fetching, no props. */
export default function RevenueWidget() {
  const [totals, setTotals] = useState<{ total: number; sub: number; ad: number; fee: number } | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      const { data } = await (supabase as any)
        .from("revenue_events")
        .select("source, amount_krw")
        .gte("created_at", since)
        .limit(1000);
      if (!alive) return;
      const t = { total: 0, sub: 0, ad: 0, fee: 0 };
      for (const r of (data ?? []) as Array<{ source: string; amount_krw: number }>) {
        const v = Number(r.amount_krw) || 0;
        t.total += v;
        if (r.source === "subscription") t.sub += v;
        else if (r.source === "ad") t.ad += v;
        else if (r.source === "fee") t.fee += v;
      }
      setTotals(t);
    })();
    return () => { alive = false; };
  }, []);

  const fmt = (n: number) => `₩${Math.round(n).toLocaleString()}`;

  return (
    <div className="glass rounded-2xl p-4 border border-border/40">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          <span className="text-xs uppercase tracking-wider text-muted-foreground">24h 매출</span>
        </div>
        <span className="text-[10px] text-muted-foreground">개인 기여분</span>
      </div>
      <div className="font-display font-black text-2xl tabular-nums text-money-strong">
        {totals ? fmt(totals.total) : "—"}
      </div>
      <div className="grid grid-cols-3 gap-2 mt-3 text-[11px]">
        <div><div className="text-muted-foreground">구독</div><div className="font-bold tabular-nums">{totals ? fmt(totals.sub) : "—"}</div></div>
        <div><div className="text-muted-foreground">광고</div><div className="font-bold tabular-nums">{totals ? fmt(totals.ad) : "—"}</div></div>
        <div><div className="text-muted-foreground">수수료</div><div className="font-bold tabular-nums">{totals ? fmt(totals.fee) : "—"}</div></div>
      </div>
    </div>
  );
}
