// IMPERIAL PHASE 4 — Rollout phase activation panel (admin, AAL2 recommended).
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { notify, describeError } from "@/lib/notify";

type State = { phase: number; status: string; started_at: string; notes: string | null } | null;

const PHASES = [
  { phase: 1, label: "Observer (Tier 0)", desc: "관측 전용, 모든 kill OFF, 24h" },
  { phase: 2, label: "Tier 1 (50k/d)", desc: "burn ON, NFT mint OFF" },
  { phase: 3, label: "Tier 2 (250k/d)", desc: "NFT mint ON" },
  { phase: 4, label: "Tier 3 (Unlimited)", desc: "Full GREEN, all gates open" },
];

export default function ImperialRolloutPhasePanel() {
  const [state, setState] = useState<State>(null);
  const [notes, setNotes] = useState("");

  async function load() {
    try {
      const { data, error } = await (supabase as any).rpc("imperial_get_rollout_state");
      if (error) throw error;
      setState((data?.[0] ?? null) as State);
    } catch (e) { notify.error(describeError(e)); }
  }

  useEffect(() => { load(); }, []);

  async function activate(phase: number) {
    if (!confirm(`Phase ${phase} 점화 — GO/NO-GO 18-item PASS 확인 완료?`)) return;
    try {
      const { error } = await (supabase as any).rpc("imperial_rollout_activate", {
        _phase: phase, _notes: notes || null, _metrics: {},
      });
      if (error) throw error;
      notify.success(`Phase ${phase} 점화 완료`);
      setNotes("");
      load();
    } catch (e) { notify.error(describeError(e)); }
  }

  return (
    <Card className="p-4">
      <div className="text-xs font-bold mb-3">👑 Imperial Rollout Phase</div>
      <div className="text-[11px] text-muted-foreground mb-3">
        현재: <span className="font-mono text-amber-300">
          {state ? `Phase ${state.phase} · ${state.status} · ${new Date(state.started_at).toLocaleString()}` : "비활성"}
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
        {PHASES.map((p) => {
          const active = state?.phase === p.phase;
          return (
            <div key={p.phase} className={`rounded-md border p-2 ${active ? "border-amber-500/60 bg-amber-950/20" : "border-border/40"}`}>
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold">Phase {p.phase}: {p.label}</div>
                <Button size="sm" variant={active ? "default" : "outline"} onClick={() => activate(p.phase)}>
                  {active ? "현재" : "점화"}
                </Button>
              </div>
              <div className="text-[10px] text-muted-foreground mt-1">{p.desc}</div>
            </div>
          );
        })}
      </div>
      <Input placeholder="점화 사유/메모" value={notes} onChange={(e) => setNotes(e.target.value)} />
    </Card>
  );
}
