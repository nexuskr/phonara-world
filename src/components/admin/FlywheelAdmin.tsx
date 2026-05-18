// IMPERIAL-SINGULARITY v3.5: Admin Flywheel Mission Control.
// Single panel — health KPIs, volatility heatmap, injections, params, kill switches.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { notify, describeError } from "@/lib/notify";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingList } from "@/components/ui/loading-state";
import { setVisibleInterval } from "@/lib/util/visible-interval";
import { TIER_LABEL_KO, type VolatilityTier } from "@/lib/flywheel";

type Health = {
  window_hours: number;
  burn_total: number; treasury_total: number; reward_total: number; liquidity_total: number;
  treasury_balance: number; liquidity_balance: number;
  emission: { circulating_phon: number; target_phon: number; scale_factor: number };
  tiers_24h: Partial<Record<VolatilityTier, number>>;
  injections: Array<{ id: number; ts: string; trigger_tier: string | null; amount_in: number; reason: string }>;
  params: Record<string, unknown>;
  kill_switches: Record<string, boolean>;
};

const TIER_ORDER: VolatilityTier[] = ["calm","warm","hot","surge","extreme"];
const TIER_COLOR: Record<VolatilityTier, string> = {
  calm: "bg-emerald-500/60", warm: "bg-amber-400/60", hot: "bg-orange-500/70",
  surge: "bg-rose-500/80", extreme: "bg-fuchsia-600/90",
};

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "good"|"warn"|"bad" }) {
  const c = tone === "good" ? "text-emerald-300" : tone === "warn" ? "text-amber-300" : tone === "bad" ? "text-rose-300" : "";
  return (
    <Card className="p-3">
      <div className="text-[10px] tracking-widest uppercase text-muted-foreground">{label}</div>
      <div className={`font-display font-black tabular-nums text-lg mt-1 ${c}`}>{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>}
    </Card>
  );
}

export default function FlywheelAdmin() {
  const [h, setH] = useState<Health | null>(null);
  const [loading, setLoading] = useState(true);
  const [paramKey, setParamKey] = useState("split");
  const [paramVal, setParamVal] = useState("");
  const [injAmount, setInjAmount] = useState("");
  const [injReason, setInjReason] = useState("");

  async function refresh() {
    try {
      const { data, error } = await supabase.rpc("admin_get_flywheel_health", { _hours: 24 });
      if (error) throw error;
      setH(data as Health);
    } catch (e) { notify.error(describeError(e)); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    refresh();
    const stop = setVisibleInterval(refresh, 15_000, { meta: { owner: "FlywheelAdmin", category: "admin" } });
    return () => stop();
  }, []);

  async function setKill(key: string, enabled: boolean) {
    try {
      const { error } = await supabase.rpc("admin_set_kill_switch", { _key: key, _enabled: enabled });
      if (error) throw error;
      notify.success(`${key} ${enabled ? "ON" : "OFF"}`);
      refresh();
    } catch (e) { notify.error(describeError(e)); }
  }

  async function saveParam() {
    try {
      const parsed = JSON.parse(paramVal);
      const { error } = await supabase.rpc("admin_set_flywheel_param", { _key: paramKey, _value: parsed });
      if (error) throw error;
      notify.success(`${paramKey} 갱신`);
      setParamVal("");
      refresh();
    } catch (e) { notify.error(describeError(e)); }
  }

  async function forceInjection() {
    const a = Number(injAmount);
    if (!a || !injReason) { notify.error("amount + reason 필수"); return; }
    try {
      const { error } = await supabase.rpc("admin_force_injection", { _amount: a, _reason: injReason });
      if (error) throw error;
      notify.success("강제 인젝션 완료");
      setInjAmount(""); setInjReason("");
      refresh();
    } catch (e) { notify.error(describeError(e)); }
  }

  if (loading || !h) return <LoadingList rows={5} />;

  const burn = Math.round(h.burn_total);
  const treasury = Math.round(h.treasury_balance);
  const netDef = burn - Math.max(0, h.injections.reduce((a, i) => a + Number(i.amount_in), 0));
  const scale = Number(h.emission?.scale_factor ?? 1).toFixed(3);

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <h2 className="font-display font-black text-lg">🔥 Deflationary Flywheel — Health (24h)</h2>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Burn 24h" value={burn.toLocaleString()} sub="PHON" tone={burn > 0 ? "good" : undefined} />
        <Stat label="Treasury Balance" value={treasury.toLocaleString()} sub="누적" />
        <Stat label="Net Deflation" value={netDef.toLocaleString()} sub="burn − injection" tone={netDef >= 0 ? "good" : "warn"} />
        <Stat label="Emission Scale" value={scale} sub="target/circulating clamp(0.4,1.6)" tone={Math.abs(Number(scale) - 1) > 0.4 ? "warn" : "good"} />
      </div>

      <Card className="p-4">
        <div className="text-xs font-bold mb-3">Volatility 24h (5 tiers)</div>
        <div className="grid grid-cols-5 gap-2">
          {TIER_ORDER.map(t => (
            <div key={t} className="rounded-lg border border-border/40 p-2 text-center">
              <div className={`h-1.5 rounded-full ${TIER_COLOR[t]} mb-1.5`} />
              <div className="text-[10px] uppercase text-muted-foreground">{TIER_LABEL_KO[t]}</div>
              <div className="font-mono text-sm">{h.tiers_24h?.[t] ?? 0}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-4">
        <div className="text-xs font-bold mb-3">Injection History (50)</div>
        {h.injections.length === 0 ? (
          <div className="text-xs text-muted-foreground">아직 인젝션 없음</div>
        ) : (
          <div className="space-y-1 text-xs font-mono max-h-64 overflow-auto">
            {h.injections.map(i => (
              <div key={i.id} className="flex justify-between border-b border-border/30 py-1">
                <span className="text-muted-foreground">{new Date(i.ts).toLocaleString()}</span>
                <span>{i.trigger_tier ?? "-"}</span>
                <span className="tabular-nums">{Number(i.amount_in).toLocaleString()}</span>
                <span className="text-muted-foreground truncate max-w-[180px]">{i.reason}</span>
              </div>
            ))}
          </div>
        )}
        <div className="mt-3 space-y-2 border-t border-border/30 pt-3">
          <div className="text-[11px] font-bold text-amber-300">⚠️ Force Injection (AAL2)</div>
          <div className="flex gap-2">
            <Input type="number" placeholder="amount" value={injAmount} onChange={e => setInjAmount(e.target.value)} />
            <Input placeholder="reason" value={injReason} onChange={e => setInjReason(e.target.value)} />
            <Button size="sm" variant="destructive" onClick={forceInjection}>실행</Button>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="text-xs font-bold mb-3">Params (hot-reload + immutable audit)</div>
        <div className="space-y-2">
          <pre className="text-[11px] bg-background/60 rounded-md p-2 overflow-auto max-h-48">{JSON.stringify(h.params, null, 2)}</pre>
          <div className="flex gap-2">
            <select value={paramKey} onChange={e => setParamKey(e.target.value)}
              className="bg-background border border-border/50 rounded px-2 text-xs">
              {Object.keys(h.params).map(k => <option key={k}>{k}</option>)}
            </select>
            <Input placeholder='new JSON value e.g. {"burn":0.45,...}' value={paramVal} onChange={e => setParamVal(e.target.value)} />
            <Button size="sm" onClick={saveParam}>저장</Button>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="text-xs font-bold mb-3">Kill Switches (default OFF)</div>
        <div className="space-y-2">
          {["flywheel_burn","flywheel_injection","flywheel_emission_scale"].map(k => {
            const on = !!h.kill_switches?.[k];
            return (
              <div key={k} className="flex items-center justify-between">
                <span className="text-xs font-mono">{k}</span>
                <Button size="sm" variant={on ? "destructive" : "outline"} onClick={() => setKill(k, !on)}>
                  {on ? "ON — 끄기" : "OFF — 켜기"}
                </Button>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
