import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRequireAdmin } from "@/hooks/use-require-auth";
import { LoadingList } from "@/components/ui/loading-state";
import { Hammer, ShoppingBag, Rocket, Map, Sparkles, Crown, Trophy } from "lucide-react";
import { setVisibleInterval } from "@/lib/util/visible-interval";

type Metrics = {
  atelier_24h: number; atelier_7d: number; atelier_jackpots_7d: number;
  marketplace_volume_24h: number; marketplace_volume_7d: number;
  galaxy_seats_held: number; galaxy_total_locked: number; galaxy_bids_24h: number;
  journey_claims_24h: number; journey_phon_paid_7d: number;
  stories_active: number; dividend_paid_30d: number; crown_war_legendary_total: number;
};

const fmt = (n: number) => Math.round(Number(n)||0).toLocaleString();

export default function PhaseCMetricsPanel() {
  const admin = useRequireAdmin();
  const [m, setM] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!admin) return;
    const { data } = await supabase.rpc("admin_get_phase_c_metrics");
    if (data) setM(data as Metrics);
    setLoading(false);
  }, [admin]);

  useEffect(() => { void load(); const id = setVisibleInterval(load, 60_000 , { meta: { owner: "PhaseCMetricsPanel", category: "admin" } }); return () => id(); }, [load]);

  if (!admin) return null;
  if (loading || !m) return <LoadingList rows={4} />;

  const cards: Array<[string, string, any, string?]> = [
    ["합성 매출 24h", `${fmt(m.atelier_24h)} PHON`, Hammer, `7d ${fmt(m.atelier_7d)} · 잭팟 ${m.atelier_jackpots_7d}`],
    ["마켓플레이스 24h", `${fmt(m.marketplace_volume_24h)} PHON`, ShoppingBag, `7d ${fmt(m.marketplace_volume_7d)}`],
    ["Galaxy 좌석", `${m.galaxy_seats_held}/100`, Rocket, `lock ${fmt(m.galaxy_total_locked)} PHON · 24h 입찰 ${m.galaxy_bids_24h}`],
    ["Journey 수령 24h", `${m.journey_claims_24h}`, Map, `7d 지급 ${fmt(m.journey_phon_paid_7d)} PHON`],
    ["Live Stories", `${m.stories_active}`, Sparkles],
    ["황제 배당 30d", `${fmt(m.dividend_paid_30d)} PHON`, Crown],
    ["Legendary NFT", `${m.crown_war_legendary_total}`, Trophy],
  ];

  return (
    <section className="rounded-2xl border border-primary/30 bg-card/60 p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-primary" />
        <h3 className="font-imperial font-black text-sm tracking-wider">PHASE C MONETIZATION</h3>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        {cards.map(([label, val, Icon, sub]) => (
          <div key={label} className="rounded-xl border border-border/40 bg-background/40 p-3">
            <div className="flex items-center gap-1.5 text-[10px] tracking-wider font-bold text-muted-foreground">
              <Icon className="w-3 h-3" /> {label}
            </div>
            <div className="mt-1 text-base font-black tabular-nums">{val}</div>
            {sub && <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>}
          </div>
        ))}
      </div>
    </section>
  );
}
