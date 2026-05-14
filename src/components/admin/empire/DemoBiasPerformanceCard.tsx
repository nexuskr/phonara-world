import { useEffect, useState } from "react";
import { Sliders } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export function DemoBiasPerformanceCard() {
  const [d, setD] = useState<any>(null);

  useEffect(() => {
    let on = true;
    supabase.rpc("admin_get_demo_bias_perf" as any).then(({ data }) => {
      if (on) setD(data);
    });
    return () => { on = false; };
  }, []);

  const cfg = (d?.config ?? {}) as Record<string, number>;
  const entries = Object.entries(cfg);

  return (
    <div className="glass-strong rounded-2xl p-4 border border-border/40">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-muted-foreground">
        <Sliders className="h-3.5 w-3.5" /> Demo Bias 성과
      </div>
      <div className="mt-2 space-y-1.5">
        {entries.length === 0 ? (
          <div className="text-xs text-muted-foreground">
            게임 컨피그 미설정 — Day 2에 슬라이더 UI 출시
          </div>
        ) : (
          entries.slice(0, 5).map(([k, v]) => (
            <div key={k} className="flex justify-between text-xs">
              <span className="truncate">{k}</span>
              <span className="font-bold tabular-nums">{v}</span>
            </div>
          ))
        )}
        {d?.note && <p className="text-[10px] text-muted-foreground pt-1">{d.note}</p>}
      </div>
    </div>
  );
}
