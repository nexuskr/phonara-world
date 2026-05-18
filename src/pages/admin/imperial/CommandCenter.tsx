// IMPERIAL PHASE 4 — Ultimate Admin Command Center.
// Five panels: Rollout Phase, Auto-Heal, Observability, Circuit Breaker, Kill Switches.
// AAL2 protected (registered under ops/* section). Operator chunk (matches src/pages/admin/**).
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { notify, describeError } from "@/lib/notify";
import { useImperialKillSwitches } from "@/hooks/useImperialKillSwitches";
import ImperialRolloutPhasePanel from "@/components/admin/ImperialRolloutPhasePanel";
import ImperialAutoHealPanel from "@/components/admin/ImperialAutoHealPanel";
import ImperialObservabilityStream from "@/components/admin/ImperialObservabilityStream";
import ImperialCircuitPanel from "@/components/admin/ImperialCircuitPanel";

const KILL_KEYS = [
  "imperial_betting",
  "imperial_flywheel",
  "imperial_withdrawal",
  "imperial_burn",
  "imperial_nft_mint",
] as const;

function KillSwitchMatrix() {
  const ks = useImperialKillSwitches();
  const [busy, setBusy] = useState<string | null>(null);

  async function toggle(key: string, current: boolean) {
    if (!confirm(`${key} → ${current ? "OFF" : "ON"} ?`)) return;
    setBusy(key);
    try {
      const { error } = await (supabase as any).from("imperial_kill_switches")
        .upsert({ key, enabled: !current, reason: current ? null : `manual:${new Date().toISOString()}` });
      if (error) throw error;
      notify.success(`${key} ${!current ? "ON" : "OFF"}`);
    } catch (e) { notify.error(describeError(e)); }
    finally { setBusy(null); }
  }

  async function freezeAll() {
    if (!confirm("emergency_freeze_all 호출 — 전체 일시 정지?")) return;
    try {
      const { error } = await (supabase as any).rpc("emergency_freeze_all", { _reason: "command_center_freeze" });
      if (error) throw error;
      notify.success("Emergency freeze 완료");
    } catch (e) { notify.error(describeError(e)); }
  }

  async function unfreezeAll() {
    if (!confirm("emergency_unfreeze_all 호출 — 전체 해제?")) return;
    try {
      const { error } = await (supabase as any).rpc("emergency_unfreeze_all", { _reason: "command_center_unfreeze" });
      if (error) throw error;
      notify.success("Unfreeze 완료");
    } catch (e) { notify.error(describeError(e)); }
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs font-bold">🛑 Imperial Kill Switch Matrix</div>
        <div className="flex gap-2">
          <Button size="sm" variant="destructive" onClick={freezeAll}>Freeze All</Button>
          <Button size="sm" variant="outline" onClick={unfreezeAll}>Unfreeze All</Button>
        </div>
      </div>
      <div className="space-y-1">
        {KILL_KEYS.map((k) => {
          const on = (ks as any)[k] as boolean;
          return (
            <div key={k} className="flex items-center justify-between border-b border-border/30 py-1.5">
              <span className="text-xs font-mono">{k}</span>
              <div className="flex items-center gap-2">
                <span className={`text-xs ${on ? "text-rose-300 font-bold" : "text-emerald-300"}`}>
                  {on ? "ON" : "OFF"}
                </span>
                <Button size="sm" variant={on ? "destructive" : "outline"} disabled={busy === k}
                  onClick={() => toggle(k, on)}>
                  {on ? "끄기" : "켜기"}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export default function ImperialCommandCenter() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 15_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-black text-2xl">👑 Imperial Command Center</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Phase 4 Limited Rollout — 5 패널 통합 · 15s 자동 갱신 (#{tick})
          </p>
        </div>
      </header>

      <ImperialRolloutPhasePanel />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <KillSwitchMatrix />
        <ImperialCircuitPanel />
      </div>

      <ImperialAutoHealPanel />
      <ImperialObservabilityStream />
    </div>
  );
}
