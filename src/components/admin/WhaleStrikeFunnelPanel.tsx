// PR-10: Whale Strike 전환 깔때기 KPI 패널 (admin only).
import { useEffect, useState } from "react";
import { Zap, MousePointerClick, Eye, Wallet, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LoadingList } from "@/components/ui/loading-state";
import { setVisibleInterval } from "@/lib/util/visible-interval";

type Funnel = {
  impressions_24h: number;
  clicks_24h: number;
  ctr_24h: number;
  impressions_7d: number;
  clicks_7d: number;
  ctr_7d: number;
  unique_clickers_7d: number;
  depositors_7d: number;
  click_to_deposit_7d: number;
  deposit_amount_7d: number;
};

const fmt = (n: number) => Number(n || 0).toLocaleString("ko-KR");
const pct = (n: number) => `${(Number(n || 0) * 100).toFixed(1)}%`;
const krw = (n: number) => `₩${Math.round(Number(n || 0)).toLocaleString("ko-KR")}`;

export default function WhaleStrikeFunnelPanel() {
  const [data, setData] = useState<Funnel | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    async function load() {
      const { data, error } = await supabase.rpc("get_whale_strike_funnel" as any);
      if (!alive) return;
      if (!error && data) setData(data as unknown as Funnel);
      setLoading(false);
    }
    void load();
    const stop = setVisibleInterval(load, 60_000);
    return () => { alive = false; stop(); };
  }, []);

  return (
    <div className="glass-strong rounded-2xl p-4 border border-border/40 space-y-3">
      <div className="flex items-center gap-2">
        <Zap className="w-4 h-4 text-secondary" />
        <h3 className="font-display font-black tracking-wide text-sm">Whale Strike 전환 깔때기</h3>
        <span className="text-[10px] tracking-widest text-muted-foreground uppercase">PR-10</span>
      </div>
      {loading || !data ? (
        <LoadingList rows={2} />
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Cell icon={Eye} label="노출 (24h)" value={fmt(data.impressions_24h)} />
            <Cell icon={MousePointerClick} label="클릭 (24h)" value={fmt(data.clicks_24h)} hint={`CTR ${pct(data.ctr_24h)}`} />
            <Cell icon={Users} label="고유 클릭자 (7d)" value={fmt(data.unique_clickers_7d)} />
            <Cell icon={Wallet} label="입금 전환자 (7d)" value={fmt(data.depositors_7d)} hint={`전환율 ${pct(data.click_to_deposit_7d)}`} tone="text-money-strong" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            <Cell icon={Eye} label="노출 (7d)" value={fmt(data.impressions_7d)} />
            <Cell icon={MousePointerClick} label="클릭 (7d)" value={fmt(data.clicks_7d)} hint={`CTR ${pct(data.ctr_7d)}`} />
            <Cell icon={Wallet} label="입금액 (7d)" value={krw(data.deposit_amount_7d)} tone="text-money-strong" />
          </div>
        </>
      )}
    </div>
  );
}

function Cell({ icon: Icon, label, value, hint, tone }: { icon: typeof Eye; label: string; value: string; hint?: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-border/40 p-3 bg-background/30">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
        <Icon className="w-3 h-3" /> {label}
      </div>
      <div className={`font-display font-black text-lg tabular-nums ${tone ?? ""}`}>{value}</div>
      {hint && <div className="text-[10px] text-muted-foreground mt-0.5">{hint}</div>}
    </div>
  );
}
