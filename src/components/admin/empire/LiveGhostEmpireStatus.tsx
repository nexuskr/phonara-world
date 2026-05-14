import { useEffect, useState } from "react";
import { Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Stats = {
  live_users: number;
  active_now: number;
  region_pulses: Record<string, number>;
};

export function LiveGhostEmpireStatus() {
  const [s, setS] = useState<Stats | null>(null);

  useEffect(() => {
    let on = true;
    const load = async () => {
      const { data } = await supabase.rpc("get_ghost_empire_stats" as any);
      if (on && data) setS(data as any);
    };
    load();
    const id = setInterval(load, 30_000);
    return () => {
      on = false;
      clearInterval(id);
    };
  }, []);

  const realRatio = s ? Math.max(1, Math.round((s.active_now / s.live_users) * 100)) : 0;
  const regions = s ? Object.entries(s.region_pulses).sort((a, b) => b[1] - a[1]).slice(0, 6) : [];

  return (
    <div className="glass-strong rounded-2xl p-4 border border-border/40">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-muted-foreground">
        <Globe className="h-3.5 w-3.5" /> Live Ghost Empire
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="font-display font-black text-2xl">
          {s?.live_users.toLocaleString() ?? "—"}
        </span>
        <span className="text-xs text-muted-foreground">총 인원 · 활성 {realRatio}%</span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-1.5 text-[11px]">
        {regions.map(([code, n]) => (
          <div key={code} className="rounded bg-muted/30 px-2 py-1 flex justify-between">
            <span className="font-bold">{code}</span>
            <span className="text-muted-foreground">{n.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
