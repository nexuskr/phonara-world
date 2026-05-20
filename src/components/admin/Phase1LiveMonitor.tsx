import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Activity, Crown, Gift, Users, Shield, TrendingUp, Flame, Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notify";
import ApocalypseProtocolPanel from "./ApocalypseProtocolPanel";

type KPI = Record<string, any> | null;

async function loadKpi(): Promise<KPI> {
  const { data, error } = await supabase.rpc("imperial_get_phase1_kpis" as any);
  if (error) throw error;
  return (data as any) ?? null;
}

async function loadPhase(): Promise<{ phase: number | null; at: string | null }> {
  const { data } = await supabase
    .from("imperial_rollout_phases")
    .select("phase, activated_at")
    .order("activated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return { phase: (data as any)?.phase ?? null, at: (data as any)?.activated_at ?? null };
}

export default function Phase1LiveMonitor() {
  const [kpi, setKpi] = useState<KPI>(null);
  const [phase, setPhase] = useState<{ phase: number | null; at: string | null }>({ phase: null, at: null });
  const [series, setSeries] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);

  const refresh = async () => {
    try {
      const [k, p] = await Promise.all([loadKpi(), loadPhase()]);
      setKpi(k);
      setPhase(p);
      setSeries((prev) => {
        const next = [...prev, Number(k?.signups_24h ?? 0)];
        return next.slice(-30);
      });
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    const id = window.setInterval(refresh, 3_000);
    return () => window.clearInterval(id);
  }, []);

  const activatePhase1 = async () => {
    if (!confirm("Phase 1 Observer Mode를 활성화합니다. 계속할까요?")) return;
    setActivating(true);
    try {
      const { error } = await supabase.rpc("imperial_rollout_activate", { _phase: 1 } as any);
      if (error) throw error;
      notify.imperial("💎 Phase 1 Observer Mode 활성화 완료");
      await refresh();
    } catch (e: any) {
      notify.error("Phase 1 활성화 실패", { description: e?.message ?? "AAL2 필요할 수 있습니다." });
    } finally {
      setActivating(false);
    }
  };

  const capPct = Number(kpi?.cap_utilization_pct ?? 0);
  const capTone = capPct > 100 ? "bg-rose-500" : capPct > 80 ? "bg-amber-400" : "bg-emerald-400";

  return (
    <div className="space-y-4">
      <Card className="border-amber-400/30 bg-gradient-to-br from-amber-950/10 to-background p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber-300" />
            <h3 className="text-lg font-bold">Phase 1 Live Monitor — Hyperion</h3>
            {phase.phase !== null && (
              <Badge variant="outline" className="border-amber-400/50 text-amber-300">
                Phase {phase.phase} active
              </Badge>
            )}
            <span className="text-[10px] text-muted-foreground">3s · 14 KPI</span>
          </div>
          <Button
            size="sm"
            onClick={activatePhase1}
            disabled={activating || phase.phase === 1}
            className="bg-amber-500 text-amber-950 hover:bg-amber-400"
          >
            {phase.phase === 1 ? "Phase 1 활성" : activating ? "활성화 중..." : "Activate Phase 1"}
          </Button>
        </div>

        {/* 14 KPI grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 text-sm">
          <KpiCell icon={<Gift className="h-3.5 w-3.5" />} label="Signup 24h" value={fmt(kpi?.signups_24h)} loading={loading} />
          <KpiCell icon={<Gift className="h-3.5 w-3.5" />} label="Daily 24h" value={fmt(kpi?.daily_24h)} loading={loading} />
          <KpiCell icon={<Flame className="h-3.5 w-3.5" />} label="PHON 24h" value={fmt(kpi?.phon_granted_24h)} loading={loading} />
          <KpiCell icon={<Activity className="h-3.5 w-3.5" />} label="Active 5m" value={fmt(kpi?.active_5m)} loading={loading} />
          <KpiCell icon={<Users className="h-3.5 w-3.5" />} label="Active 1h" value={fmt(kpi?.active_1h)} loading={loading} />
          <KpiCell icon={<Users className="h-3.5 w-3.5" />} label="Active 24h" value={fmt(kpi?.active_24h)} loading={loading} />
          <KpiCell icon={<TrendingUp className="h-3.5 w-3.5" />} label="Invite clicks" value={fmt(kpi?.invite_clicks_24h)} loading={loading} />
          <KpiCell icon={<TrendingUp className="h-3.5 w-3.5" />} label="First duel" value={fmt(kpi?.first_duel_conv_24h)} loading={loading} />
          <KpiCell icon={<TrendingUp className="h-3.5 w-3.5" />} label="Inv→Duel %" value={pct(kpi?.invite_to_first_duel_rate)} loading={loading} />
          <KpiCell icon={<Heart className="h-3.5 w-3.5" />} label="Warm King" value={engagementBadge(kpi?.warm_king_engagement_score)} loading={loading} />
          <KpiCell icon={<Heart className="h-3.5 w-3.5" />} label="D1 ret %" value={pct(kpi?.retention_d1_pct, 1)} loading={loading} />
          <KpiCell icon={<Shield className="h-3.5 w-3.5" />} label="Fraud 24h" value={fmt(kpi?.fraud_rejects_24h)} highlight={Number(kpi?.fraud_rejects_24h ?? 0) > 5} loading={loading} />
          <KpiCell icon={<Shield className="h-3.5 w-3.5" />} label="Anomaly" value={(Number(kpi?.anomaly_score ?? 0) * 100).toFixed(3) + "%"} highlight={Number(kpi?.anomaly_score ?? 0) >= 0.0008} loading={loading} />
          <KpiCell icon={<Flame className="h-3.5 w-3.5" />} label="Cap util" value={capPct.toFixed(1) + "%"} highlight={capPct > 80} loading={loading} />
        </div>

        {/* Cap utilization bar */}
        <div>
          <div className="mb-1 flex justify-between text-xs text-muted-foreground">
            <span>Daily PHON cap</span>
            <span>{fmt(kpi?.granted_today)} / {fmt(kpi?.daily_cap)}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-border/40">
            <div className={`h-full ${capTone} transition-all`} style={{ width: `${Math.min(capPct, 100)}%` }} />
          </div>
        </div>

        {/* Signups sparkline */}
        <div>
          <div className="mb-1 text-xs text-muted-foreground">Signups 24h trend (3s tick × {series.length})</div>
          <Sparkline data={series} />
        </div>

        {phase.at && (
          <div className="text-xs text-muted-foreground">
            Last phase change: {new Date(phase.at).toLocaleString()}
          </div>
        )}
      </Card>

      <ApocalypseProtocolPanel kpi={kpi} />
    </div>
  );
}

function fmt(v: any): string {
  if (v === undefined || v === null) return "…";
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "k";
  return n.toLocaleString();
}
function pct(v: any, digits = 2): string {
  if (v === undefined || v === null) return "…";
  return Number(v).toFixed(digits) + "%";
}
function engagementBadge(v: any): string {
  const n = Number(v ?? 0);
  return n.toFixed(2);
}

function KpiCell({ icon, label, value, highlight, loading }: { icon: React.ReactNode; label: string; value: any; highlight?: boolean; loading?: boolean }) {
  return (
    <div className={`rounded-lg border p-2 ${highlight ? "border-rose-400/50 bg-rose-500/10" : "border-border/50 bg-card/40"}`}>
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">{icon}<span className="truncate">{label}</span></div>
      <div className={`mt-0.5 text-base font-bold tabular-nums ${highlight ? "text-rose-200" : ""}`}>{loading ? "…" : value}</div>
    </div>
  );
}

function Sparkline({ data }: { data: number[] }) {
  if (data.length < 2) return <div className="h-8 rounded bg-border/20" />;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = Math.max(max - min, 1);
  const w = 320, h = 32;
  const step = w / (data.length - 1);
  const pts = data.map((v, i) => `${i * step},${h - ((v - min) / range) * h}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-8 w-full">
      <polyline fill="none" stroke="hsl(45 90% 60%)" strokeWidth="1.5" points={pts} />
    </svg>
  );
}
