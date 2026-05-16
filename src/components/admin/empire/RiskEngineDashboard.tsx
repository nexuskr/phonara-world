/**
 * Risk Engine Dashboard — admin-only mini panel.
 * Pulls admin_get_risk_engine_stats() and renders avg RPI, rejected count,
 * and a per-symbol liquidation-pressure heatmap. Refreshes every 30s.
 */
import { useEffect, useState } from "react";
import { ShieldAlert, Activity, Ban } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { setVisibleInterval } from "@/lib/util/visible-interval";

type Heat = { symbol: string; avg_rpi: number; avg_safety: number; rejects: number; warns: number };
type Stats = {
  avg_rpi: number; rejected_24h: number; warned_24h: number; total_24h: number; heatmap: Heat[];
};

function pressureColor(rpi: number) {
  if (rpi >= 0.75) return "bg-red-500/80";
  if (rpi >= 0.5) return "bg-orange-500/70";
  if (rpi >= 0.3) return "bg-amber-400/60";
  return "bg-emerald-500/50";
}

export default function RiskEngineDashboard() {
  const [s, setS] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const { data } = await supabase.rpc("admin_get_risk_engine_stats");
      if (alive && data) setS(data as unknown as Stats);
      if (alive) setLoading(false);
    };
    load();
    const t = setVisibleInterval(load, 30_000 , { meta: { owner: "RiskEngineDashboard", category: "admin" } });
    return () => { alive = false; t(); };
  }, []);

  return (
    <section className="rounded-2xl border border-border/50 bg-background/40 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <ShieldAlert className="w-4 h-4 text-amber-300" />
        <h3 className="font-display font-black text-sm tracking-wider uppercase">Risk Engine · 24h</h3>
        {loading && <span className="text-[10px] text-muted-foreground">loading…</span>}
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        <Stat icon={<Activity className="w-3 h-3" />} label="Avg RPI" value={s ? `${(s.avg_rpi*100).toFixed(1)}%` : "—"} tone="primary" />
        <Stat icon={<Ban className="w-3 h-3" />} label="Rejected" value={s ? String(s.rejected_24h) : "—"} tone="danger" />
        <Stat icon={<ShieldAlert className="w-3 h-3" />} label="Warned" value={s ? String(s.warned_24h) : "—"} tone="warn" />
      </div>

      <div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Liquidation Pressure (per symbol)</div>
        {!s || s.heatmap.length === 0 ? (
          <div className="text-[11px] text-muted-foreground/70 py-2">최근 24시간 이벤트 없음</div>
        ) : (
          <div className="grid grid-cols-2 gap-1">
            {s.heatmap.map((h) => (
              <div key={h.symbol} className="flex items-center gap-2 text-[11px]">
                <span className="font-mono w-16 truncate">{h.symbol.replace("USDT","")}</span>
                <div className="flex-1 h-2 rounded bg-background/80 overflow-hidden border border-border/40">
                  <div className={`h-full ${pressureColor(Number(h.avg_rpi))}`} style={{ width: `${Math.min(100, Number(h.avg_rpi)*100).toFixed(0)}%` }} />
                </div>
                <span className="font-mono tabular-nums w-10 text-right">{(Number(h.avg_rpi)*100).toFixed(0)}%</span>
                {h.rejects > 0 && <span className="text-rose-300 text-[10px] font-bold">×{h.rejects}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function Stat({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: "primary"|"danger"|"warn" }) {
  const color = tone === "danger" ? "text-rose-300" : tone === "warn" ? "text-amber-300" : "text-cyan-300";
  return (
    <div className="rounded-lg border border-border/40 bg-background/60 p-2">
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">{icon}{label}</div>
      <div className={`font-mono tabular-nums font-black mt-0.5 ${color}`}>{value}</div>
    </div>
  );
}
