// Phase 1 Hyperion — Dedicated Activation Panel.
// Calls imperial_rollout_activate(1, auth.uid()) and surfaces first KPI snapshot.
// AAL2 enforced upstream by ops/imperial-command route (AdminAal2Gate).
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { notify, describeError } from "@/lib/notify";

type RolloutRow = {
  phase: number | null;
  tier: number | null;
  cap: number | null;
  activated_at: string | null;
};

type Kpi = { metric: string; value: number };

export default function ImperialActivationPanel() {
  const [row, setRow] = useState<RolloutRow | null>(null);
  const [kpis, setKpis] = useState<Kpi[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    try {
      const { data: r } = await (supabase as any)
        .from("imperial_rollout_phases")
        .select("phase, tier, cap, activated_at")
        .order("phase", { ascending: false })
        .limit(1)
        .maybeSingle();
      setRow(r ?? null);
      const { data: k } = await (supabase as any).rpc("imperial_get_phase1_kpis");
      if (Array.isArray(k)) setKpis(k as Kpi[]);
    } catch (e) {
      // silent — admin sees other panels
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 15_000);
    return () => clearInterval(id);
  }, []);

  async function activate() {
    if (!confirm("Phase 1 (Tier 1, Observer) 활성화 — AAL2로 보호됩니다. 진행할까요?")) return;
    setBusy(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid) throw new Error("not_authenticated");
      const { error } = await (supabase as any).rpc("imperial_rollout_activate", {
        _phase: 1,
        _activated_by: uid,
      });
      if (error) throw error;
      try {
        await (supabase as any).rpc("imperial_log_observability", {
          _event: "phase1_activated",
          _payload: { tier: 1, source: "command_center", activated_by: uid },
        });
      } catch { /* observability is best-effort */ }
      notify.success("💎 Phase 1 Observer 활성화 완료");
      setTimeout(refresh, 1500);
    } catch (e) {
      notify.error(describeError(e));
    } finally {
      setBusy(false);
    }
  }

  const isLive = (row?.phase ?? 0) >= 1 && !!row?.activated_at;

  return (
    <Card className="p-4 border-amber-500/30 bg-gradient-to-br from-amber-500/5 via-transparent to-rose-500/5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-xs font-bold flex items-center gap-2">
            💎 Phase 1 Hyperion Activation
            {isLive ? (
              <Badge variant="default" className="bg-emerald-500/20 text-emerald-200 border-emerald-400/40">
                LIVE
              </Badge>
            ) : (
              <Badge variant="outline" className="text-amber-200 border-amber-400/40">ARMED</Badge>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Observer Mode · Signup 15,000 PHON · Daily 450~550 PHON · 50,000 PHON/day cap
          </p>
        </div>
        <Button
          size="sm"
          variant={isLive ? "outline" : "default"}
          disabled={busy || loading}
          onClick={activate}
        >
          {isLive ? "재활성화" : busy ? "활성화 중…" : "Activate Phase 1"}
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
        <Stat label="Phase" value={row?.phase ?? "-"} />
        <Stat label="Tier" value={row?.tier ?? "-"} />
        <Stat label="Daily Cap" value={row?.cap != null ? row.cap.toLocaleString() : "-"} />
        <Stat
          label="Activated"
          value={row?.activated_at ? new Date(row.activated_at).toLocaleString() : "—"}
        />
      </div>

      {kpis && kpis.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border/30">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
            First KPI Snapshot (imperial_get_phase1_kpis)
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {kpis.slice(0, 8).map((k) => (
              <Stat key={k.metric} label={k.metric} value={fmt(k.value)} />
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md bg-background/40 border border-border/30 px-2 py-1.5">
      <div className="text-[10px] text-muted-foreground truncate">{label}</div>
      <div className="text-xs font-mono font-bold truncate">{value}</div>
    </div>
  );
}

function fmt(v: number): string {
  if (v == null || Number.isNaN(v)) return "-";
  if (Math.abs(v) >= 1000) return v.toLocaleString();
  if (Number.isInteger(v)) return String(v);
  return v.toFixed(3);
}
