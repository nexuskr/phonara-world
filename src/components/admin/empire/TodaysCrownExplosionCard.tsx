import { useEffect, useState } from "react";
import { Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { setVisibleInterval } from "@/lib/util/visible-interval";

export function TodaysCrownExplosionCard() {
  const [d, setD] = useState<{ count: number; total_awarded: number; explosions: number } | null>(null);

  useEffect(() => {
    let on = true;
    const load = async () => {
      const { data } = await supabase.rpc("admin_get_today_crown_total" as any);
      if (on && data) setD(data as any);
    };
    load();
    const stop = setVisibleInterval(load, 30_000);
    return () => { on = false; stop(); };
  }, []);

  return (
    <div className="glass-strong rounded-2xl p-4 border border-yellow-500/30 relative overflow-hidden">
      <div className="absolute -top-6 -right-6 h-20 w-20 rounded-full bg-yellow-500/20 blur-2xl" />
      <div className="relative">
        <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-muted-foreground">
          <Crown className="h-3.5 w-3.5 text-yellow-400" /> Today Crown
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2">
          <Stat n={d?.count ?? 0} l="발행" />
          <Stat n={d?.explosions ?? 0} l="폭발" highlight />
          <Stat n={d?.total_awarded ?? 0} l="합계 ₡" small />
        </div>
      </div>
    </div>
  );
}

function Stat({ n, l, highlight, small }: { n: number; l: string; highlight?: boolean; small?: boolean }) {
  return (
    <div>
      <div className={`font-display font-black ${small ? "text-base" : "text-2xl"} ${highlight ? "bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent" : ""}`}>
        {n.toLocaleString()}
      </div>
      <div className="text-[10px] text-muted-foreground uppercase">{l}</div>
    </div>
  );
}
