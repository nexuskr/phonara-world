import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Activity, Crown, Gift, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notify";

type Kpi = {
  signup_grants_24h: number;
  daily_grants_24h: number;
  active_tier0_5m: number;
  active_tier0_1h: number;
  current_phase: number | null;
  current_phase_at: string | null;
};

async function loadKpis(): Promise<Kpi> {
  const since24h = new Date(Date.now() - 24 * 3600_000).toISOString();
  const since5m = new Date(Date.now() - 5 * 60_000).toISOString();
  const since1h = new Date(Date.now() - 3600_000).toISOString();

  const [signupRes, dailyRes, obs5m, obs1h, phaseRes] = await Promise.all([
    supabase.from("imperial_onboarding_grants").select("id", { count: "exact", head: true }).eq("source", "signup").gte("granted_at", since24h),
    supabase.from("imperial_onboarding_grants").select("id", { count: "exact", head: true }).eq("source", "daily_login").gte("granted_at", since24h),
    supabase.from("imperial_observability_events").select("user_id", { count: "exact", head: true }).gte("created_at", since5m),
    supabase.from("imperial_observability_events").select("user_id", { count: "exact", head: true }).gte("created_at", since1h),
    supabase.from("imperial_rollout_phases").select("phase, activated_at").order("activated_at", { ascending: false }).limit(1).maybeSingle(),
  ]);

  return {
    signup_grants_24h: signupRes.count ?? 0,
    daily_grants_24h: dailyRes.count ?? 0,
    active_tier0_5m: obs5m.count ?? 0,
    active_tier0_1h: obs1h.count ?? 0,
    current_phase: (phaseRes.data as any)?.phase ?? null,
    current_phase_at: (phaseRes.data as any)?.activated_at ?? null,
  };
}

export default function Phase1LiveMonitor() {
  const [kpi, setKpi] = useState<Kpi | null>(null);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);

  const refresh = async () => {
    try { setKpi(await loadKpis()); } catch {}
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    const id = window.setInterval(refresh, 10_000);
    return () => window.clearInterval(id);
  }, []);

  const activatePhase1 = async () => {
    if (!confirm("Phase 1 Observer Mode를 활성화합니다. 계속할까요?")) return;
    setActivating(true);
    try {
      const { error } = await supabase.rpc("imperial_rollout_activate", { _phase: 1 } as any);
      if (error) throw error;
      notify.imperial("👑 Phase 1 Observer Mode 활성화 완료");
      await refresh();
    } catch (e: any) {
      notify.error("Phase 1 활성화 실패", { description: e?.message ?? "AAL2 필요할 수 있습니다." });
    } finally {
      setActivating(false);
    }
  };

  return (
    <Card className="border-amber-400/30 bg-gradient-to-br from-amber-950/10 to-background p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-amber-300" />
          <h3 className="text-lg font-bold">Phase 1 Live Monitor</h3>
          {kpi?.current_phase !== null && kpi?.current_phase !== undefined && (
            <Badge variant="outline" className="border-amber-400/50 text-amber-300">
              Phase {kpi.current_phase} active
            </Badge>
          )}
        </div>
        <Button
          size="sm"
          onClick={activatePhase1}
          disabled={activating || kpi?.current_phase === 1}
          className="bg-amber-500 text-amber-950 hover:bg-amber-400"
        >
          {kpi?.current_phase === 1 ? "Phase 1 활성" : activating ? "활성화 중..." : "Activate Phase 1"}
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        <Kpi icon={<Gift className="h-4 w-4" />} label="Signup 24h" value={loading ? "…" : kpi?.signup_grants_24h ?? 0} />
        <Kpi icon={<Gift className="h-4 w-4" />} label="Daily 24h" value={loading ? "…" : kpi?.daily_grants_24h ?? 0} />
        <Kpi icon={<Activity className="h-4 w-4" />} label="Active 5m" value={loading ? "…" : kpi?.active_tier0_5m ?? 0} />
        <Kpi icon={<Users className="h-4 w-4" />} label="Active 1h" value={loading ? "…" : kpi?.active_tier0_1h ?? 0} />
      </div>

      {kpi?.current_phase_at && (
        <div className="text-xs text-muted-foreground">
          Last phase change: {new Date(kpi.current_phase_at).toLocaleString()}
        </div>
      )}
    </Card>
  );
}

function Kpi({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-border/50 bg-card/40 p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">{icon}<span>{label}</span></div>
      <div className="mt-1 text-2xl font-bold tabular-nums">{value}</div>
    </div>
  );
}
